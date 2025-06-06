// SYMBIONT WebSocket Service - Simplified Implementation
interface SocketServer {
  emit: (event: string, data: any) => void;
  on: (event: string, callback: (socket: any) => void) => void;
}

interface Socket {
  id: string;
  userId?: string;
  emit: (event: string, data: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  join: (room: string) => void;
  leave: (room: string) => void;
}

export interface NetworkEvent {
  type: 'mutation' | 'connection' | 'ritual' | 'synchronization' | 'evolution';
  userId: string;
  organismId: string;
  data: any;
  timestamp: Date;
}

export class WebSocketService {
  private io: SocketServer;
  private connectedUsers: Map<string, Socket> = new Map();
  private userSockets: Map<string, string> = new Map();
  
  constructor(io: SocketServer) {
    this.io = io;
  }

  initialize(): void {
    console.log('🔌 WebSocket Service initialized');
    
    // Mock initialization - replace with real socket.io
    this.io.on('connection', (socket: Socket) => {
      console.log(`🔌 New connection: ${socket.id}`);
      this.setupSocketHandlers(socket);
    });
  }

  private setupSocketHandlers(socket: Socket): void {
    socket.on('authenticate', async (data: { token: string }) => {
      try {
        const userId = this.authenticateSocket(data.token);
        if (userId) {
          socket.userId = userId;
          this.connectedUsers.set(socket.id, socket);
          this.userSockets.set(userId, socket.id);
          
          socket.emit('authenticated', { userId, status: 'connected' });
          
          this.broadcastNetworkEvent({
            type: 'connection',
            userId,
            organismId: `organism_${userId}`,
            data: { status: 'online' },
            timestamp: new Date()
          });
        } else {
          socket.emit('authentication_failed', { error: 'Invalid token' });
        }
      } catch (error) {
        console.error('Socket authentication error:', error);
        socket.emit('authentication_failed', { error: 'Authentication error' });
      }
    });

    socket.on('organism_mutation', async (mutationData: any) => {
      if (!socket.userId) return;
      await this.processMutationEvent(socket.userId, mutationData);
    });

    socket.on('request_synchronization', async (targetUserId: string) => {
      if (!socket.userId) return;
      await this.handleSynchronizationRequest(socket.userId, targetUserId);
    });

    socket.on('initiate_ritual', async (ritualData: any) => {
      if (!socket.userId) return;
      await this.initiateCollectiveRitual(socket.userId, ritualData);
    });

    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
  }

  async broadcastNetworkEvent(event: NetworkEvent): Promise<void> {
    console.log(`📡 Broadcasting event: ${event.type}`);
    
    // Broadcast to all connected clients
    this.io.emit('network_event', event);
    
    // Save to mock storage
    this.saveNetworkEvent(event);
  }

  async sendToUser(userId: string, event: string, data: any): Promise<void> {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      const socket = this.connectedUsers.get(socketId);
      if (socket) {
        socket.emit(event, data);
      }
    }
  }

  private authenticateSocket(token: string): string | null {
    // Mock authentication - decode simple base64 token
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const payload = JSON.parse(decoded);
      return payload.userId;
    } catch {
      return null;
    }
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

  private async handleSynchronizationRequest(fromUserId: string, toUserId: string): Promise<void> {
    const toSocketId = this.userSockets.get(toUserId);
    if (!toSocketId) {
      this.sendToUser(fromUserId, 'sync_failed', { reason: 'User not online' });
      return;
    }

    this.sendToUser(toUserId, 'sync_request', {
      fromUserId,
      fromUsername: `User_${fromUserId}`
    });
  }

  private async initiateCollectiveRitual(initiatorId: string, ritualData: any): Promise<void> {
    const ritualId = `ritual_${Date.now()}`;
    const duration = ritualData.duration || 30000;
    
    console.log(`🔮 Initiating ritual ${ritualId} by ${initiatorId}`);
    
    // Broadcast ritual invitation to all connected users
    this.io.emit('ritual_invitation', {
      ritualId,
      type: ritualData.type,
      initiator: `User_${initiatorId}`,
      duration
    });

    // Start ritual phases
    setTimeout(() => {
      this.executeRitualPhases(ritualId, duration);
    }, 5000);
  }

  private async executeRitualPhases(ritualId: string, duration: number): Promise<void> {
    const phases = [
      { name: 'synchronization', duration: duration * 0.3 },
      { name: 'amplification', duration: duration * 0.4 },
      { name: 'transcendence', duration: duration * 0.3 }
    ];

    let currentTime = 0;
    
    for (const phase of phases) {
      setTimeout(() => {
        this.io.emit('ritual_phase', { ritualId, phase: phase.name });
      }, currentTime);
      
      currentTime += phase.duration;
    }

    // Complete ritual
    setTimeout(() => {
      this.io.emit('ritual_completed', { 
        ritualId, 
        effects: {
          consciousness: 0.1,
          energy: 0.2,
          socialBonus: 0.15
        }
      });
    }, duration);
  }

  private handleDisconnection(socket: Socket): void {
    console.log(`🔌 Disconnection: ${socket.id}`);
    
    if (socket.userId) {
      this.connectedUsers.delete(socket.id);
      this.userSockets.delete(socket.userId);
      
      this.broadcastNetworkEvent({
        type: 'connection',
        userId: socket.userId,
        organismId: `organism_${socket.userId}`,
        data: { status: 'offline' },
        timestamp: new Date()
      });
    }
  }

  private saveNetworkEvent(event: NetworkEvent): void {
    // Mock storage - replace with database
    console.log('💾 Event saved:', event.type);
  }

  // Public utility methods
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  getActiveRituals(): string[] {
    // Mock implementation
    return [];
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }
} 