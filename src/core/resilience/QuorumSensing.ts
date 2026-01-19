/**
 * Quorum Sensing Inter-Contextes
 *
 * Coordination en temps réel entre le background, les onglets et le popup
 * pour l'accès à IndexedDB afin d'éviter les blocages et deadlocks.
 *
 * Inspiré du quorum sensing bactérien:
 * - Les contextes communiquent leur état via BroadcastChannel
 * - Un leader est élu pour coordonner les accès critiques
 * - Les conflits sont résolus par consensus distribué
 */

import { logger } from '@/shared/utils/secureLogger';
import { backpressureController } from '../metabolic/BackpressureController';

export type ContextType = 'background' | 'content' | 'popup' | 'offscreen';

export interface ContextInfo {
  id: string;
  type: ContextType;
  lastHeartbeat: number;
  isLeader: boolean;
  storageAccessCount: number;
  memoryUsage: number;
  backpressureLevel: string;
}

export interface QuorumMessage {
  type: 'heartbeat' | 'leader_election' | 'storage_request' | 'storage_release' |
  'emergency' | 'sync_state' | 'ack';
  senderId: string;
  senderType: ContextType;
  timestamp: number;
  payload?: unknown;
}

export interface StorageLock {
  contextId: string;
  key: string;
  acquiredAt: number;
  expiresAt: number;
  operation: 'read' | 'write';
}

export interface QuorumConfig {
  heartbeatInterval: number;      // Intervalle heartbeat (ms, défaut: 5000)
  leaderTimeout: number;          // Timeout avant nouvelle élection (ms, défaut: 15000)
  lockTimeout: number;            // Timeout des locks (ms, défaut: 30000)
  maxConcurrentWrites: number;    // Max écritures simultanées (défaut: 3)
  channelName: string;            // Nom du BroadcastChannel
}

/**
 * Gestionnaire de Quorum Sensing
 */
export class QuorumSensingManager {
  private config: QuorumConfig;
  private contextId: string;
  private contextType: ContextType;
  private channel: BroadcastChannel | null = null;

  // État du quorum
  private knownContexts: Map<string, ContextInfo> = new Map();
  private currentLeader: string | null = null;
  private isLeader: boolean = false;
  private storageLocks: Map<string, StorageLock> = new Map();

  // Timers
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private leaderCheckInterval: ReturnType<typeof setInterval> | null = null;

  // Compteurs
  private storageAccessCount: number = 0;
  private pendingRequests: Map<string, {
    resolve: (granted: boolean) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = new Map();

  constructor(contextType: ContextType, config?: Partial<QuorumConfig>) {
    this.contextType = contextType;
    this.contextId = `${contextType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.config = {
      heartbeatInterval: 5000,
      leaderTimeout: 15000,
      lockTimeout: 30000,
      maxConcurrentWrites: 3,
      channelName: 'symbiont-quorum',
      ...config
    };

    logger.info('[QuorumSensing] Created', { contextId: this.contextId, contextType });
  }

  /**
   * Démarre le quorum sensing
   */
  async start(): Promise<void> {
    try {
      // Créer le canal de communication
      this.channel = new BroadcastChannel(this.config.channelName);
      this.channel.onmessage = (event) => this.handleMessage(event.data);

      // Enregistrer ce contexte
      this.registerSelf();

      // Démarrer le heartbeat
      this.heartbeatInterval = setInterval(() => {
        this.sendHeartbeat();
        this.cleanupStaleContexts();
        this.cleanupExpiredLocks();
      }, this.config.heartbeatInterval);

      // Démarrer la vérification du leader
      this.leaderCheckInterval = setInterval(() => {
        this.checkLeader();
      }, this.config.heartbeatInterval * 2);

      // Envoyer un premier heartbeat immédiatement
      this.sendHeartbeat();

      // Attendre un peu pour recevoir les réponses des autres contextes
      await this.sleep(1000);

      // Tenter de devenir leader si aucun leader connu
      if (!this.currentLeader) {
        this.initiateLeaderElection();
      }

      logger.info('[QuorumSensing] Started', { contextId: this.contextId, isLeader: this.isLeader });
    } catch (error) {
      logger.error('[QuorumSensing] Failed to start', error);
    }
  }

  /**
   * Arrête le quorum sensing
   */
  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.leaderCheckInterval) {
      clearInterval(this.leaderCheckInterval);
      this.leaderCheckInterval = null;
    }

    // Libérer tous les locks de ce contexte
    for (const [key, lock] of this.storageLocks) {
      if (lock.contextId === this.contextId) {
        this.releaseLock(key);
      }
    }

    // Annuler les requêtes en attente
    for (const [, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.resolve(false);
    }
    this.pendingRequests.clear();

    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }

    logger.info('[QuorumSensing] Stopped');
  }

  /**
   * Enregistre ce contexte
   */
  private registerSelf(): void {
    const info: ContextInfo = {
      id: this.contextId,
      type: this.contextType,
      lastHeartbeat: Date.now(),
      isLeader: this.isLeader,
      storageAccessCount: this.storageAccessCount,
      memoryUsage: this.getMemoryUsage(),
      backpressureLevel: backpressureController.getLevel()
    };

    this.knownContexts.set(this.contextId, info);
  }

  /**
   * Envoie un heartbeat à tous les contextes
   */
  private sendHeartbeat(): void {
    const message: QuorumMessage = {
      type: 'heartbeat',
      senderId: this.contextId,
      senderType: this.contextType,
      timestamp: Date.now(),
      payload: {
        isLeader: this.isLeader,
        storageAccessCount: this.storageAccessCount,
        memoryUsage: this.getMemoryUsage(),
        backpressureLevel: backpressureController.getLevel()
      }
    };

    this.broadcast(message);
  }

  /**
   * Gère les messages reçus
   */
  private handleMessage(message: QuorumMessage): void {
    // Ignorer ses propres messages
    if (message.senderId === this.contextId) return;

    switch (message.type) {
      case 'heartbeat':
        this.handleHeartbeat(message);
        break;

      case 'leader_election':
        this.handleLeaderElection(message);
        break;

      case 'storage_request':
        this.handleStorageRequest(message);
        break;

      case 'storage_release':
        this.handleStorageRelease(message);
        break;

      case 'emergency':
        this.handleEmergency(message);
        break;

      case 'sync_state':
        this.handleSyncState(message);
        break;

      case 'ack':
        this.handleAck(message);
        break;
    }
  }

  /**
   * Gère un heartbeat reçu
   */
  private handleHeartbeat(message: QuorumMessage): void {
    const payload = message.payload as {
      isLeader: boolean;
      storageAccessCount: number;
      memoryUsage: number;
      backpressureLevel: string;
    };

    const info: ContextInfo = {
      id: message.senderId,
      type: message.senderType,
      lastHeartbeat: message.timestamp,
      isLeader: payload.isLeader,
      storageAccessCount: payload.storageAccessCount,
      memoryUsage: payload.memoryUsage,
      backpressureLevel: payload.backpressureLevel
    };

    this.knownContexts.set(message.senderId, info);

    // Mettre à jour le leader connu
    if (payload.isLeader) {
      this.currentLeader = message.senderId;
    }
  }

  /**
   * Initie une élection de leader
   */
  private initiateLeaderElection(): void {
    logger.info('[QuorumSensing] Initiating leader election');

    const message: QuorumMessage = {
      type: 'leader_election',
      senderId: this.contextId,
      senderType: this.contextType,
      timestamp: Date.now(),
      payload: {
        priority: this.calculatePriority()
      }
    };

    this.broadcast(message);

    // Attendre les réponses
    setTimeout(() => {
      this.resolveLeaderElection();
    }, 2000);
  }

  /**
   * Gère une demande d'élection de leader
   */
  private handleLeaderElection(message: QuorumMessage): void {
    const theirPriority = (message.payload as { priority: number }).priority;
    const myPriority = this.calculatePriority();

    // Si notre priorité est plus haute, contester
    if (myPriority > theirPriority) {
      const response: QuorumMessage = {
        type: 'leader_election',
        senderId: this.contextId,
        senderType: this.contextType,
        timestamp: Date.now(),
        payload: { priority: myPriority }
      };
      this.broadcast(response);
    }
  }

  /**
   * Résout l'élection de leader
   */
  private resolveLeaderElection(): void {
    // Trouver le contexte avec la plus haute priorité
    let highestPriority = this.calculatePriority();
    let leaderId = this.contextId;

    for (const [id, info] of this.knownContexts) {
      const priority = this.calculateContextPriority(info);
      if (priority > highestPriority) {
        highestPriority = priority;
        leaderId = id;
      }
    }

    if (leaderId === this.contextId) {
      this.becomeLeader();
    } else {
      this.isLeader = false;
      this.currentLeader = leaderId;
    }

    logger.info('[QuorumSensing] Leader election resolved', {
      leader: this.currentLeader,
      isLeader: this.isLeader
    });
  }

  /**
   * Calcule la priorité pour l'élection
   */
  private calculatePriority(): number {
    // Background > popup > content
    const typePriority = {
      'background': 100,
      'offscreen': 80,
      'popup': 60,
      'content': 40
    };

    return typePriority[this.contextType] +
      (100 - this.getMemoryUsage()) * 0.1 -
      this.storageAccessCount * 0.01;
  }

  /**
   * Calcule la priorité d'un contexte
   */
  private calculateContextPriority(info: ContextInfo): number {
    const typePriority = {
      'background': 100,
      'offscreen': 80,
      'popup': 60,
      'content': 40
    };

    return typePriority[info.type] +
      (100 - info.memoryUsage) * 0.1 -
      info.storageAccessCount * 0.01;
  }

  /**
   * Devient leader
   */
  private becomeLeader(): void {
    this.isLeader = true;
    this.currentLeader = this.contextId;

    logger.info('[QuorumSensing] Became leader');

    // Notifier les autres
    this.sendHeartbeat();
  }

  /**
   * Demande un lock pour accès au storage
   */
  async requestStorageLock(key: string, operation: 'read' | 'write'): Promise<boolean> {
    // Les lectures sont toujours autorisées
    if (operation === 'read') {
      return true;
    }

    // Vérifier le backpressure
    if (!backpressureController.canAcceptOperation(operation, key)) {
      return false;
    }

    // Vérifier les locks existants
    const existingLock = this.storageLocks.get(key);
    if (existingLock && existingLock.expiresAt > Date.now()) {
      if (existingLock.contextId !== this.contextId) {
        // Lock détenu par un autre contexte, attendre
        return this.waitForLock(key, operation);
      }
    }

    // Acquérir le lock
    const lock: StorageLock = {
      contextId: this.contextId,
      key,
      acquiredAt: Date.now(),
      expiresAt: Date.now() + this.config.lockTimeout,
      operation
    };

    this.storageLocks.set(key, lock);
    this.storageAccessCount++;

    // Notifier les autres contextes
    const message: QuorumMessage = {
      type: 'storage_request',
      senderId: this.contextId,
      senderType: this.contextType,
      timestamp: Date.now(),
      payload: { key, operation }
    };
    this.broadcast(message);

    return true;
  }

  /**
   * Attend qu'un lock soit libéré
   */
  private waitForLock(key: string, operation: 'read' | 'write'): Promise<boolean> {
    return new Promise((resolve) => {
      const requestId = `${key}_${Date.now()}`;
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        resolve(false);
      }, this.config.lockTimeout);

      this.pendingRequests.set(requestId, { resolve, timeout });
    });
  }

  /**
   * Libère un lock
   */
  releaseLock(key: string): void {
    const lock = this.storageLocks.get(key);
    if (lock && lock.contextId === this.contextId) {
      this.storageLocks.delete(key);

      // Notifier les autres
      const message: QuorumMessage = {
        type: 'storage_release',
        senderId: this.contextId,
        senderType: this.contextType,
        timestamp: Date.now(),
        payload: { key }
      };
      this.broadcast(message);
    }
  }

  /**
   * Gère une demande de storage d'un autre contexte
   */
  private handleStorageRequest(message: QuorumMessage): void {
    const payload = message.payload as { key: string; operation: string };

    // Si on est leader, on peut arbitrer
    if (this.isLeader) {
      const existingLock = this.storageLocks.get(payload.key);

      if (!existingLock || existingLock.expiresAt < Date.now()) {
        // Autoriser
        const lock: StorageLock = {
          contextId: message.senderId,
          key: payload.key,
          acquiredAt: Date.now(),
          expiresAt: Date.now() + this.config.lockTimeout,
          operation: payload.operation as 'read' | 'write'
        };
        this.storageLocks.set(payload.key, lock);
      }
    }
  }

  /**
   * Gère la libération d'un lock par un autre contexte
   */
  private handleStorageRelease(message: QuorumMessage): void {
    const payload = message.payload as { key: string };
    const lock = this.storageLocks.get(payload.key);

    if (lock && lock.contextId === message.senderId) {
      this.storageLocks.delete(payload.key);

      // Vérifier si des requêtes en attente peuvent être satisfaites
      for (const [requestId, request] of this.pendingRequests) {
        if (requestId.startsWith(payload.key)) {
          clearTimeout(request.timeout);
          this.pendingRequests.delete(requestId);
          request.resolve(true);
          break;
        }
      }
    }
  }

  /**
   * Signale une urgence à tous les contextes
   */
  signalEmergency(reason: string): void {
    const message: QuorumMessage = {
      type: 'emergency',
      senderId: this.contextId,
      senderType: this.contextType,
      timestamp: Date.now(),
      payload: { reason }
    };

    this.broadcast(message);

    // Activer le mode urgence local
    backpressureController.forceEmergencyMode();
  }

  /**
   * Gère un signal d'urgence
   */
  private handleEmergency(message: QuorumMessage): void {
    const payload = message.payload as { reason: string };

    logger.warn('[QuorumSensing] Emergency signal received', {
      from: message.senderId,
      reason: payload.reason
    });

    // Activer le mode urgence
    backpressureController.forceEmergencyMode();

    // Libérer tous nos locks
    for (const [key, lock] of this.storageLocks) {
      if (lock.contextId === this.contextId) {
        this.releaseLock(key);
      }
    }
  }

  /**
   * Gère la synchronisation d'état
   */
  private handleSyncState(_message: QuorumMessage): void {
    // Envoyer notre état complet
    this.sendHeartbeat();
  }

  /**
   * Gère un accusé de réception
   */
  private handleAck(message: QuorumMessage): void {
    const payload = message.payload as { requestId: string };
    const request = this.pendingRequests.get(payload.requestId);

    if (request) {
      clearTimeout(request.timeout);
      this.pendingRequests.delete(payload.requestId);
      request.resolve(true);
    }
  }

  /**
   * Vérifie l'état du leader
   */
  private checkLeader(): void {
    if (this.currentLeader && this.currentLeader !== this.contextId) {
      const leaderInfo = this.knownContexts.get(this.currentLeader);

      if (!leaderInfo || Date.now() - leaderInfo.lastHeartbeat > this.config.leaderTimeout) {
        logger.warn('[QuorumSensing] Leader timeout, initiating new election');
        this.currentLeader = null;
        this.initiateLeaderElection();
      }
    }
  }

  /**
   * Nettoie les contextes obsolètes
   */
  private cleanupStaleContexts(): void {
    const now = Date.now();
    const staleThreshold = this.config.heartbeatInterval * 3;

    for (const [id, info] of this.knownContexts) {
      if (id !== this.contextId && now - info.lastHeartbeat > staleThreshold) {
        this.knownContexts.delete(id);
        logger.info('[QuorumSensing] Removed stale context', { id });

        // Si le leader est obsolète, initier une nouvelle élection
        if (id === this.currentLeader) {
          this.currentLeader = null;
          this.initiateLeaderElection();
        }
      }
    }
  }

  /**
   * Nettoie les locks expirés
   */
  private cleanupExpiredLocks(): void {
    const now = Date.now();

    for (const [key, lock] of this.storageLocks) {
      if (lock.expiresAt < now) {
        this.storageLocks.delete(key);
        logger.info('[QuorumSensing] Expired lock cleaned up', { key });
      }
    }
  }

  /**
   * Envoie un message à tous les contextes
   */
  private broadcast(message: QuorumMessage): void {
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (error) {
        logger.error('[QuorumSensing] Broadcast failed', error);
      }
    }
  }

  /**
   * Utilitaire de pause
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Estime l'utilisation mémoire (0-100)
   */
  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / (1024 * 1024);
      return Math.min(100, (usedMB / 500) * 100); // Assume 500MB max
    }
    return 50; // Valeur par défaut
  }

  /**
   * Retourne les informations du quorum
   */
  getQuorumInfo(): {
    contextId: string;
    contextType: ContextType;
    isLeader: boolean;
    currentLeader: string | null;
    knownContextsCount: number;
    activeLocksCount: number;
  } {
    return {
      contextId: this.contextId,
      contextType: this.contextType,
      isLeader: this.isLeader,
      currentLeader: this.currentLeader,
      knownContextsCount: this.knownContexts.size,
      activeLocksCount: this.storageLocks.size
    };
  }

  /**
   * Retourne tous les contextes connus
   */
  getKnownContexts(): ContextInfo[] {
    return Array.from(this.knownContexts.values());
  }
}

// Factory function pour créer des instances
export function createQuorumManager(contextType: ContextType): QuorumSensingManager {
  return new QuorumSensingManager(contextType);
}
