import { Server as SocketIOServer, Socket } from 'socket.io';
import { AuthService } from './AuthService';
import { DatabaseService } from './DatabaseService';
import { LoggerService } from './LoggerService';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  organismId?: string;
}

export interface NetworkEvent {
  type: 'mutation' | 'connection' | 'ritual' | 'synchronization' | 'evolution';
  userId: string;
  organismId: string;
  data: any;
  timestamp: Date;
}

export class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map();
  private userSockets: Map<string, string> = new Map();
  private activeRituals: Map<string, any> = new Map();
  private auth = AuthService.getInstance();
  private db = DatabaseService.getInstance();  
  private logger = LoggerService.getInstance();
  
  constructor(io: SocketIOServer) {
    this.io = io;
  }

  initialize(): void {
    this.logger.info('🔔 WebSocket Service initialized');
    
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.logger.info(`🔔 New connection: ${socket.id} from ${socket.handshake.address}`);
      this.setupSocketHandlers(socket);
      
      // Send connection confirmation
      socket.emit('connected', {
        socketId: socket.id,
        serverTime: new Date().toISOString()
      });
    });
    
    // Setup periodic cleanup
    setInterval(() => {
      this.cleanupInactiveConnections();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private setupSocketHandlers(socket: AuthenticatedSocket): void {
    socket.on('authenticate', async (data: { token: string }) => {
      try {
        const validation = await this.auth.validateToken(data.token);
        if (validation.valid && validation.userId) {
          socket.userId = validation.userId;
          socket.organismId = `organism_${validation.userId}`;
          
          // Join user-specific room
          socket.join(`user_${validation.userId}`);
          
          this.connectedUsers.set(socket.id, socket);
          this.userSockets.set(validation.userId, socket.id);
          
          socket.emit('authenticated', { 
            userId: validation.userId, 
            status: 'connected',
            socketId: socket.id
          });
          
          // Load user's organism state
          try {
            const organismState = await this.db.getOrganismState(validation.userId);
            socket.emit('organism_state', organismState);
          } catch (error) {
            this.logger.warn('Failed to load organism state:', error);
          }
          
          await this.broadcastNetworkEvent({
            type: 'connection',
            userId: validation.userId,
            organismId: socket.organismId,
            data: { status: 'online', socketId: socket.id },
            timestamp: new Date()
          });
          
          this.logger.info(`User authenticated: ${validation.userId}`);
        } else {
          socket.emit('authentication_failed', { error: 'Invalid token' });
          this.logger.warn('Authentication failed for socket:', socket.id);
        }
      } catch (error) {
        this.logger.error('Socket authentication error:', error);
        socket.emit('authentication_failed', { error: 'Authentication error' });
      }
    });

    socket.on('organism_mutation', async (mutationData: any) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }
      
      try {
        await this.processMutationEvent(socket.userId, mutationData);
      } catch (error) {
        this.logger.error('Mutation processing failed:', error);
        socket.emit('mutation_failed', { error: 'Failed to process mutation' });
      }
    });

    socket.on('request_synchronization', async (data: { targetUserId: string, syncType?: string }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }
      
      try {
        await this.handleSynchronizationRequest(socket.userId, data.targetUserId, data.syncType);
      } catch (error) {
        this.logger.error('Synchronization failed:', error);
        socket.emit('sync_failed', { error: 'Synchronization failed' });
      }
    });

    socket.on('initiate_ritual', async (ritualData: any) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }
      
      try {
        await this.initiateCollectiveRitual(socket.userId, ritualData);
      } catch (error) {
        this.logger.error('Ritual initiation failed:', error);
        socket.emit('ritual_failed', { error: 'Failed to initiate ritual' });
      }
    });

    socket.on('join_ritual', async (ritualId: string) => {
      if (!socket.userId) return;
      await this.joinRitual(socket.userId, ritualId, socket);
    });

    socket.on('leave_ritual', async (ritualId: string) => {
      if (!socket.userId) return;
      await this.leaveRitual(socket.userId, ritualId, socket);
    });

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });

    socket.on('error', (error) => {
      this.logger.error('Socket error:', error);
    });
  }

  async broadcastNetworkEvent(event: NetworkEvent): Promise<void> {
    this.logger.info(`📡 Broadcasting event: ${event.type} from ${event.userId}`);
    
    // Broadcast to all connected clients
    this.io.emit('network_event', {
      ...event,
      serverTimestamp: new Date().toISOString()
    });
    
    // Save to database
    try {
      await this.db.saveNetworkEvent(event);
    } catch (error) {
      this.logger.error('Failed to save network event:', error);
    }
  }

  async sendToUser(userId: string, event: string, data: any): Promise<void> {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      const socket = this.connectedUsers.get(socketId);
      if (socket) {
        socket.emit(event, {
          ...data,
          serverTimestamp: new Date().toISOString()
        });
      }
    }
  }

  private async joinRitual(userId: string, ritualId: string, socket: AuthenticatedSocket): Promise<void> {
    const ritual = this.activeRituals.get(ritualId);
    if (!ritual) {
      socket.emit('ritual_error', { error: 'Ritual not found' });
      return;
    }

    if (ritual.participants.has(userId)) {
      socket.emit('ritual_error', { error: 'Already participating' });
      return;
    }

    ritual.participants.set(userId, socket.id);
    socket.join(`ritual_${ritualId}`);
    
    // Notify all ritual participants
    this.io.to(`ritual_${ritualId}`).emit('ritual_participant_joined', {
      ritualId,
      userId,
      participantCount: ritual.participants.size
    });

    socket.emit('ritual_joined', { ritualId, participantCount: ritual.participants.size });
    this.logger.info(`User ${userId} joined ritual ${ritualId}`);
  }

  private async leaveRitual(userId: string, ritualId: string, socket: AuthenticatedSocket): Promise<void> {
    const ritual = this.activeRituals.get(ritualId);
    if (!ritual || !ritual.participants.has(userId)) {
      return;
    }

    ritual.participants.delete(userId);
    socket.leave(`ritual_${ritualId}`);
    
    // Notify remaining participants
    this.io.to(`ritual_${ritualId}`).emit('ritual_participant_left', {
      ritualId,
      userId,
      participantCount: ritual.participants.size
    });

    socket.emit('ritual_left', { ritualId });
    this.logger.info(`User ${userId} left ritual ${ritualId}`);
  }

  private async processMutationEvent(userId: string, mutationData: any): Promise<void> {
    const event: NetworkEvent = {
      type: 'mutation',
      userId,
      organismId: `organism_${userId}`,
      data: mutationData,
      timestamp: new Date()
    };

    await this.broadcastNetworkEvent(event);
  }

  private async handleSynchronizationRequest(fromUserId: string, toUserId: string, syncType?: string): Promise<void> {
    const toSocketId = this.userSockets.get(toUserId);
    if (!toSocketId) {
      await this.sendToUser(fromUserId, 'sync_failed', { reason: 'User not online' });
      return;
    }

    // Get user information
    let fromUsername = `User_${fromUserId}`;
    try {
      const user = await this.db.findUserById(fromUserId);
      if (user) fromUsername = user.username || user.email;
    } catch (error) {
      this.logger.warn('Failed to get user info for sync request:', error);
    }

    await this.sendToUser(toUserId, 'sync_request', {
      fromUserId,
      fromUsername,
      syncType: syncType || 'organism_state',
      timestamp: new Date().toISOString()
    });

    this.logger.info(`Sync request from ${fromUserId} to ${toUserId}`);
  }

  private async initiateCollectiveRitual(initiatorId: string, ritualData: any): Promise<void> {
    const ritualId = `ritual_${Date.now()}_${initiatorId}`;
    const duration = Math.min(ritualData.duration || 30000, 300000); // Max 5 minutes
    const ritualType = ritualData.type || 'collective_evolution';
    
    // Get initiator username
    let initiatorName = `User_${initiatorId}`;
    try {
      const user = await this.db.findUserById(initiatorId);
      if (user) initiatorName = user.username || user.email;
    } catch (error) {
      this.logger.warn('Failed to get initiator info:', error);
    }
    
    // Create ritual record
    const ritual = {
      id: ritualId,
      type: ritualType,
      initiatorId,
      initiatorName,
      startTime: new Date(),
      duration,
      participants: new Map<string, string>(), // userId -> socketId
      phase: 'invitation',
      status: 'active'
    };
    
    this.activeRituals.set(ritualId, ritual);
    
    this.logger.info(`🔮 Initiating ritual ${ritualId} by ${initiatorId}`);
    
    // Broadcast ritual invitation to all connected users
    this.io.emit('ritual_invitation', {
      ritualId,
      type: ritualType,
      initiator: initiatorName,
      initiatorId,
      duration,
      description: ritualData.description || `A ${ritualType} ritual`,
      maxParticipants: ritualData.maxParticipants || 10,
      timestamp: new Date().toISOString()
    });

    // Auto-join initiator
    const initiatorSocketId = this.userSockets.get(initiatorId);
    if (initiatorSocketId) {
      ritual.participants.set(initiatorId, initiatorSocketId);
      const initiatorSocket = this.connectedUsers.get(initiatorSocketId);
      if (initiatorSocket) {
        initiatorSocket.join(`ritual_${ritualId}`);
      }
    }

    // Start ritual phases after invitation period
    setTimeout(() => {
      this.executeRitualPhases(ritualId, duration);
    }, 10000); // 10 second invitation period
  }

  private async executeRitualPhases(ritualId: string, duration: number): Promise<void> {
    const ritual = this.activeRituals.get(ritualId);
    if (!ritual) return;

    const phases = [
      { name: 'synchronization', duration: duration * 0.3 },
      { name: 'amplification', duration: duration * 0.4 },
      { name: 'transcendence', duration: duration * 0.3 }
    ];

    let currentTime = 0;
    
    for (const phase of phases) {
      setTimeout(() => {
        ritual.phase = phase.name;
        this.io.to(`ritual_${ritualId}`).emit('ritual_phase', { 
          ritualId, 
          phase: phase.name,
          participantCount: ritual.participants.size
        });
      }, currentTime);
      
      currentTime += phase.duration;
    }

    // Complete ritual
    setTimeout(() => {
      ritual.status = 'completed';
      ritual.phase = 'completed';
      
      this.io.to(`ritual_${ritualId}`).emit('ritual_completed', { 
        ritualId, 
        participantCount: ritual.participants.size,
        effects: {
          consciousness: 0.1,
          energy: 0.2,
          socialBonus: 0.15
        },
        timestamp: new Date().toISOString()
      });
      
      // Clean up ritual room
      setTimeout(() => {
        this.activeRituals.delete(ritualId);
      }, 60000); // Keep for 1 minute after completion
    }, duration);
  }

  private handleDisconnection(socket: AuthenticatedSocket, reason?: string): void {
    this.logger.info(`🔔 Disconnection: ${socket.id} (${reason || 'unknown'})`);
    
    if (socket.userId) {
      // Remove from active rituals
      for (const [ritualId, ritual] of this.activeRituals.entries()) {
        if (ritual.participants.has(socket.userId)) {
          ritual.participants.delete(socket.userId);
          this.io.to(`ritual_${ritualId}`).emit('ritual_participant_left', {
            ritualId,
            userId: socket.userId,
            participantCount: ritual.participants.size
          });
        }
      }
      
      this.connectedUsers.delete(socket.id);
      this.userSockets.delete(socket.userId);
      
      this.broadcastNetworkEvent({
        type: 'connection',
        userId: socket.userId,
        organismId: socket.organismId || `organism_${socket.userId}`,
        data: { status: 'offline', reason },
        timestamp: new Date()
      });
    }
  }
  
  private cleanupInactiveConnections(): void {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes
    
    for (const [socketId, socket] of this.connectedUsers.entries()) {
      if (now - socket.handshake.time > timeout && !socket.connected) {
        this.handleDisconnection(socket, 'timeout');
      }
    }
    
    // Cleanup completed rituals
    for (const [ritualId, ritual] of this.activeRituals.entries()) {
      if (ritual.status === 'completed' && now - ritual.startTime.getTime() > 60000) {
        this.activeRituals.delete(ritualId);
      }
    }
  }

  // Enhanced utility methods
  async broadcastToRoom(room: string, event: string, data: any): Promise<void> {
    this.io.to(room).emit(event, {
      ...data,
      serverTimestamp: new Date().toISOString()
    });
  }
  
  async getUsersInRoom(room: string): Promise<string[]> {
    const sockets = await this.io.in(room).fetchSockets();
    return sockets.map(socket => (socket as any).userId).filter(Boolean);
  }

  // Public utility methods
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  getActiveRituals(): Array<{ id: string, type: string, participantCount: number, phase: string }> {
    return Array.from(this.activeRituals.values()).map(ritual => ({
      id: ritual.id,
      type: ritual.type,
      participantCount: ritual.participants.size,
      phase: ritual.phase
    }));
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }
  
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down WebSocket service...');
    
    // Close all active rituals
    for (const [ritualId, ritual] of this.activeRituals.entries()) {
      this.io.to(`ritual_${ritualId}`).emit('ritual_terminated', {
        ritualId,
        reason: 'Server shutdown'
      });
    }
    
    // Disconnect all clients
    this.io.emit('server_shutdown', {
      message: 'Server is shutting down',
      timestamp: new Date().toISOString()
    });
    
    this.activeRituals.clear();
    this.connectedUsers.clear();
    this.userSockets.clear();
  }
}