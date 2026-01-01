/**
 * IndexedDBCoordinator - Singleton pour coordination centralisée d'IndexedDB
 *
 * PROBLÈME RÉSOLU:
 * - Avant: Chaque contexte (background, popup, content) tentait d'ouvrir IndexedDB → Race conditions et blocages
 * - Après: Seul le background ouvre IndexedDB, les autres contextes passent par messages
 *
 * ARCHITECTURE:
 * - Background: Connexion IndexedDB directe
 * - Popup/Content: Proxy via chrome.runtime.sendMessage
 */

import { OrganismState, OrganismMutation } from '../../shared/types/organism';
import { SymbiontStorage } from './SymbiontStorage';
import { logger } from '../../shared/utils/secureLogger';

interface BehaviorData {
  url: string;
  visitCount: number;
  totalTime: number;
  scrollDepth: number;
  lastVisit: number;
  interactions: Array<{
    type: string;
    timestamp: number;
    data: unknown;
  }>;
}

type StorageRequest = {
  type: string;
  payload?: any;
  requestId: string;
};

type StorageResponse = {
  success: boolean;
  data?: any;
  error?: string;
  requestId: string;
};

export class IndexedDBCoordinator {
  private static instance: IndexedDBCoordinator | null = null;
  private primaryStorage: SymbiontStorage | null = null;
  private isPrimaryContext = false;
  private initPromise: Promise<void> | null = null;
  private pendingRequests = new Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>();

  private constructor() {
    // Private constructor pour singleton
  }

  static async getInstance(): Promise<IndexedDBCoordinator> {
    if (!this.instance) {
      this.instance = new IndexedDBCoordinator();
      await this.instance.initialize();
    }
    return this.instance;
  }

  /**
   * Réinitialise le singleton (pour tests uniquement)
   */
  static reset(): void {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
    }
  }

  private async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._performInitialization();
    return this.initPromise;
  }

  private async _performInitialization(): Promise<void> {
    // Déterminer si ce contexte est le primary (background/service worker)
    this.isPrimaryContext = this.isBackgroundContext();

    logger.info('[IndexedDBCoordinator] Initializing', {
      isPrimary: this.isPrimaryContext,
      contextType: this.getContextType()
    });

    if (this.isPrimaryContext) {
      // SEUL le background ouvre IndexedDB
      logger.info('[IndexedDBCoordinator] Primary context - opening IndexedDB');
      this.primaryStorage = new SymbiontStorage();

      try {
        await this.primaryStorage.initialize();
        logger.info('[IndexedDBCoordinator] IndexedDB initialized successfully');

        // Setup message handler pour répondre aux requêtes des autres contextes
        this.setupMessageHandler();
      } catch (error) {
        logger.error('[IndexedDBCoordinator] Failed to initialize IndexedDB', error);
        throw error;
      }
    } else {
      // Popup et content scripts n'ouvrent PAS IndexedDB
      logger.info('[IndexedDBCoordinator] Secondary context - using message proxy');
      this.setupMessageProxy();
    }
  }

  private isBackgroundContext(): boolean {
    // Service worker context (pas de window)
    if (typeof window === 'undefined') {
      return true;
    }

    // Vérification supplémentaire: service worker global scope
    try {
      // @ts-ignore - ServiceWorkerGlobalScope existe dans les service workers
      if (typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope) {
        return true;
      }
    } catch (_e) {
      // Ignore - pas un service worker
    }

    return false;
  }

  private getContextType(): string {
    if (this.isBackgroundContext()) {
      return 'background';
    }
    if (typeof window !== 'undefined') {
      if (window.location.href.includes('popup.html')) {
        return 'popup';
      }
      return 'content-script';
    }
    return 'unknown';
  }

  /**
   * Setup message handler pour le contexte primary (background)
   */
  private setupMessageHandler(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      logger.warn('[IndexedDBCoordinator] Chrome runtime not available');
      return;
    }

    chrome.runtime.onMessage.addListener((request: StorageRequest, _sender, sendResponse) => {
      // Filtrer uniquement les messages de storage
      if (!request.type?.startsWith('STORAGE_')) {
        return false; // Pas notre message
      }

      logger.debug('[IndexedDBCoordinator] Received storage request', {
        type: request.type,
        requestId: request.requestId
      });

      // Traiter de manière asynchrone
      this.handleStorageRequest(request)
        .then(result => {
          sendResponse({ success: true, data: result, requestId: request.requestId });
        })
        .catch(error => {
          logger.error('[IndexedDBCoordinator] Request failed', { type: request.type, error });
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            requestId: request.requestId
          });
        });

      return true; // Indique qu'on va répondre de manière asynchrone
    });

    logger.info('[IndexedDBCoordinator] Message handler setup complete');
  }

  /**
   * Setup message proxy pour les contextes secondaires (popup, content)
   */
  private setupMessageProxy(): void {
    logger.info('[IndexedDBCoordinator] Message proxy setup complete');
    // Pas de setup spécial nécessaire - on utilise sendMessageToBackground
  }

  /**
   * Traite une requête de storage (appelé par le background)
   */
  private async handleStorageRequest(request: StorageRequest): Promise<any> {
    if (!this.primaryStorage) {
      throw new Error('Storage not initialized in primary context');
    }

    const { type, payload } = request;

    switch (type) {
      case 'STORAGE_GET_ORGANISM':
        return await this.primaryStorage.getOrganism(payload?.id);

      case 'STORAGE_SAVE_ORGANISM':
        await this.primaryStorage.saveOrganism(payload.organism);
        return { success: true };

      case 'STORAGE_GET_BEHAVIOR':
        return await this.primaryStorage.getBehavior(payload.url);

      case 'STORAGE_SAVE_BEHAVIOR':
        await this.primaryStorage.saveBehavior(payload.behavior);
        return { success: true };

      case 'STORAGE_ADD_MUTATION':
        await this.primaryStorage.addMutation(payload.mutation);
        return { success: true };

      case 'STORAGE_GET_RECENT_MUTATIONS':
        return await this.primaryStorage.getRecentMutations(payload.limit || 10);

      case 'STORAGE_GET_SETTING':
        return await this.primaryStorage.getSetting(payload.key, payload.defaultValue);

      case 'STORAGE_SET_SETTING':
        await this.primaryStorage.setSetting(payload.key, payload.value);
        return { success: true };

      case 'STORAGE_ADD_INVITATION':
        await this.primaryStorage.addInvitation(payload.invitation);
        return { success: true };

      case 'STORAGE_UPDATE_INVITATION':
        await this.primaryStorage.updateInvitation(payload.invitation);
        return { success: true };

      case 'STORAGE_GET_INVITATION':
        return await this.primaryStorage.getInvitation(payload.code);

      case 'STORAGE_GET_ALL_INVITATIONS':
        return await this.primaryStorage.getAllInvitations();

      case 'STORAGE_GET_BEHAVIOR_PATTERNS':
        return await this.primaryStorage.getBehaviorPatterns();

      case 'STORAGE_GET_RECENT_ACTIVITY':
        return await this.primaryStorage.getRecentActivity(payload.periodMs);

      case 'STORAGE_CLEANUP':
        await this.primaryStorage.cleanup(payload.retentionDays);
        return { success: true };

      case 'STORAGE_GET_STATS':
        return await this.primaryStorage.getStorageStats();

      default:
        throw new Error(`Unknown storage request type: ${type}`);
    }
  }

  /**
   * Envoie un message au background et attend la réponse
   */
  private async sendMessageToBackground(type: string, payload?: any): Promise<any> {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      throw new Error('Chrome runtime not available');
    }

    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const request: StorageRequest = { type, payload, requestId };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Storage request timeout: ${type}`));
      }, 30000); // 30s timeout

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      chrome.runtime.sendMessage(request, (response: StorageResponse) => {
        const pending = this.pendingRequests.get(requestId);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(requestId);
        }

        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!response) {
          reject(new Error('No response from background'));
          return;
        }

        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Unknown error'));
        }
      });
    });
  }

  // ============================================
  // PUBLIC API - Utilisé par toute l'extension
  // ============================================

  async getOrganism(id?: string): Promise<OrganismState | null> {
    if (this.isPrimaryContext && this.primaryStorage) {
      return this.primaryStorage.getOrganism(id);
    } else {
      return this.sendMessageToBackground('STORAGE_GET_ORGANISM', { id });
    }
  }

  async saveOrganism(organism: OrganismState): Promise<void> {
    if (this.isPrimaryContext && this.primaryStorage) {
      await this.primaryStorage.saveOrganism(organism);
    } else {
      await this.sendMessageToBackground('STORAGE_SAVE_ORGANISM', { organism });
    }
  }

  async getBehavior(url: string): Promise<BehaviorData | null> {
    if (this.isPrimaryContext && this.primaryStorage) {
      return this.primaryStorage.getBehavior(url);
    } else {
      return this.sendMessageToBackground('STORAGE_GET_BEHAVIOR', { url });
    }
  }

  async saveBehavior(behavior: BehaviorData): Promise<void> {
    if (this.isPrimaryContext && this.primaryStorage) {
      await this.primaryStorage.saveBehavior(behavior);
    } else {
      await this.sendMessageToBackground('STORAGE_SAVE_BEHAVIOR', { behavior });
    }
  }

  async addMutation(mutation: OrganismMutation & { timestamp?: number }): Promise<void> {
    if (this.isPrimaryContext && this.primaryStorage) {
      await this.primaryStorage.addMutation(mutation);
    } else {
      await this.sendMessageToBackground('STORAGE_ADD_MUTATION', { mutation });
    }
  }

  async getRecentMutations(limit: number = 10): Promise<OrganismMutation[]> {
    if (this.isPrimaryContext && this.primaryStorage) {
      return this.primaryStorage.getRecentMutations(limit);
    } else {
      return this.sendMessageToBackground('STORAGE_GET_RECENT_MUTATIONS', { limit });
    }
  }

  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    if (this.isPrimaryContext && this.primaryStorage) {
      return this.primaryStorage.getSetting(key, defaultValue);
    } else {
      return this.sendMessageToBackground('STORAGE_GET_SETTING', { key, defaultValue });
    }
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    if (this.isPrimaryContext && this.primaryStorage) {
      await this.primaryStorage.setSetting(key, value);
    } else {
      await this.sendMessageToBackground('STORAGE_SET_SETTING', { key, value });
    }
  }

  async addInvitation(invitation: any): Promise<void> {
    if (this.isPrimaryContext && this.primaryStorage) {
      await this.primaryStorage.addInvitation(invitation);
    } else {
      await this.sendMessageToBackground('STORAGE_ADD_INVITATION', { invitation });
    }
  }

  async updateInvitation(invitation: any): Promise<void> {
    if (this.isPrimaryContext && this.primaryStorage) {
      await this.primaryStorage.updateInvitation(invitation);
    } else {
      await this.sendMessageToBackground('STORAGE_UPDATE_INVITATION', { invitation });
    }
  }

  async getInvitation(code: string): Promise<any | null> {
    if (this.isPrimaryContext && this.primaryStorage) {
      return this.primaryStorage.getInvitation(code);
    } else {
      return this.sendMessageToBackground('STORAGE_GET_INVITATION', { code });
    }
  }

  async getAllInvitations(): Promise<any[]> {
    if (this.isPrimaryContext && this.primaryStorage) {
      return this.primaryStorage.getAllInvitations();
    } else {
      return this.sendMessageToBackground('STORAGE_GET_ALL_INVITATIONS');
    }
  }

  async getBehaviorPatterns(): Promise<BehaviorData[]> {
    if (this.isPrimaryContext && this.primaryStorage) {
      return this.primaryStorage.getBehaviorPatterns();
    } else {
      return this.sendMessageToBackground('STORAGE_GET_BEHAVIOR_PATTERNS');
    }
  }

  async getRecentActivity(periodMs: number = 24 * 60 * 60 * 1000): Promise<any[]> {
    if (this.isPrimaryContext && this.primaryStorage) {
      return this.primaryStorage.getRecentActivity(periodMs);
    } else {
      return this.sendMessageToBackground('STORAGE_GET_RECENT_ACTIVITY', { periodMs });
    }
  }

  async cleanup(retentionDays: number = 30): Promise<void> {
    if (this.isPrimaryContext && this.primaryStorage) {
      await this.primaryStorage.cleanup(retentionDays);
    } else {
      await this.sendMessageToBackground('STORAGE_CLEANUP', { retentionDays });
    }
  }

  async getStorageStats(): Promise<{
    usageInMB: number;
    quotaInMB: number;
    usagePercent: number;
    needsCleanup: boolean;
  }> {
    if (this.isPrimaryContext && this.primaryStorage) {
      return this.primaryStorage.getStorageStats();
    } else {
      return this.sendMessageToBackground('STORAGE_GET_STATS');
    }
  }

  /**
   * Ferme la connexion (cleanup)
   */
  close(): void {
    logger.info('[IndexedDBCoordinator] Closing');

    // Nettoyer les requêtes en attente
    for (const [_requestId, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Coordinator closing'));
    }
    this.pendingRequests.clear();

    // Fermer le storage si primary
    if (this.isPrimaryContext && this.primaryStorage) {
      this.primaryStorage.close();
      this.primaryStorage = null;
    }

    this.initPromise = null;
  }
}

// Export singleton getter
export async function getStorageCoordinator(): Promise<IndexedDBCoordinator> {
  return IndexedDBCoordinator.getInstance();
}
