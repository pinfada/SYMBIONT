// Gestionnaire d'état centralisé pour l'organisme
// Synchronise l'état entre popup, content scripts et background
// Intégré avec le système de backpressure pour éviter la saturation

import { logger } from '../utils/secureLogger';
import { backpressureController } from '@/core/metabolic/BackpressureController';
import { circadianCycle } from '@/core/metabolic/CircadianCycle';
import { softwareEpigenetics } from '@/core/resilience/SoftwareEpigenetics';

export interface OrganismState {
  // État principal
  energy: number;           // 0-100
  consciousness: number;    // 0-100
  mood: 'happy' | 'curious' | 'excited' | 'meditating' | 'hungry' | 'tired';

  // Métriques d'évolution
  evolutionStage: number;   // 1-10
  experience: number;       // Total XP accumulé
  lastFeedTime: number;     // Timestamp

  // Statistiques de navigation
  pagesVisited: number;
  knowledgeGained: number;  // Points gagnés sur pages éducatives
  socialInteractions: number;

  // Configuration visuelle
  size: number;             // 50-200
  position: string;         // 'bottom-right', etc.
  behavior: 'curious' | 'shy' | 'playful' | 'focused';
  visible: boolean;

  // État temps réel
  currentPageType: string;  // Type de la page actuelle
  isActive: boolean;        // L'utilisateur est-il actif?
  lastUpdate: number;       // Timestamp de la dernière mise à jour
}

export class OrganismStateManager {
  private static instance: OrganismStateManager;
  private state: OrganismState;
  private listeners: Set<(state: OrganismState) => void> = new Set();
  private syncInterval: number | null = null;

  // Nouveaux champs pour la gestion adaptative
  private lastSavedState: string = '';  // Hash de l'état pour détecter les changements
  private pendingSave: boolean = false;
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly BASE_SYNC_INTERVAL = 5000;  // Intervalle de base
  private readonly MAX_SYNC_INTERVAL = 60000;  // Intervalle max (1 minute)

  private constructor() {
    this.state = this.getDefaultState();
    this.initializeState();
    this.startAdaptiveSyncLoop();
  }

  static getInstance(): OrganismStateManager {
    if (!this.instance) {
      this.instance = new OrganismStateManager();
    }
    return this.instance;
  }

  private getDefaultState(): OrganismState {
    return {
      energy: 75,
      consciousness: 50,
      mood: 'curious',
      evolutionStage: 1,
      experience: 0,
      lastFeedTime: Date.now(),
      pagesVisited: 0,
      knowledgeGained: 0,
      socialInteractions: 0,
      size: 120,
      position: 'bottom-right',
      behavior: 'curious',
      visible: true,
      currentPageType: 'default',
      isActive: true,
      lastUpdate: Date.now()
    };
  }

  private async initializeState(): Promise<void> {
    try {
      // Charger l'état depuis le storage
      const result = await chrome.storage.local.get('organism_state');
      if (result.organism_state) {
        this.state = { ...this.state, ...result.organism_state };
        logger.info('Organism state loaded from storage');
      }
    } catch (error) {
      logger.error('Failed to load organism state:', error);
    }

    // Écouter les changements du storage
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.organism_state) {
        const newState = changes.organism_state.newValue;
        if (newState && newState.lastUpdate > this.state.lastUpdate) {
          this.state = newState;
          this.notifyListeners();
        }
      }
    });
  }

  /**
   * Démarre une boucle de synchronisation adaptative
   * L'intervalle s'ajuste selon le cycle circadien et le backpressure
   */
  private startAdaptiveSyncLoop(): void {
    const scheduleNextSync = () => {
      // Calculer l'intervalle adaptatif
      const circadianMultiplier = circadianCycle.getFrequencyMultiplier();
      const backpressureMultiplier = backpressureController.getThrottleMultiplier();

      // L'intervalle augmente quand le système est sous pression ou en mode économie
      const adaptiveInterval = Math.min(
        this.MAX_SYNC_INTERVAL,
        this.BASE_SYNC_INTERVAL * Math.max(circadianMultiplier, 1) * backpressureMultiplier
      );

      this.syncInterval = window.setTimeout(() => {
        this.performAdaptiveSync();
        scheduleNextSync();
      }, adaptiveInterval) as unknown as number;
    };

    scheduleNextSync();
  }

  /**
   * Effectue une synchronisation adaptative
   * Ne sauvegarde que si l'état a réellement changé et si le système le permet
   */
  private async performAdaptiveSync(): Promise<void> {
    // Mettre à jour le métabolisme (toujours)
    this.updateMetabolism();

    // Vérifier si la feature storage est active
    if (!softwareEpigenetics.isFeatureActive('core_storage')) {
      return;
    }

    // Vérifier si on peut écrire (backpressure)
    if (!backpressureController.canAcceptOperation('write', 'organism_state')) {
      logger.info('[OrganismStateManager] Save skipped due to backpressure');
      return;
    }

    // Vérifier si l'état a changé
    const currentStateHash = this.hashState(this.state);
    if (currentStateHash === this.lastSavedState) {
      // Pas de changement, pas besoin de sauvegarder
      return;
    }

    // Sauvegarder avec debounce
    await this.debouncedSave();
  }

  /**
   * Sauvegarde avec debounce pour coalescer les écritures rapprochées
   */
  private async debouncedSave(): Promise<void> {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    this.pendingSave = true;

    this.saveDebounceTimer = setTimeout(async () => {
      if (this.pendingSave) {
        await this.saveState();
        this.pendingSave = false;
      }
    }, 1000); // Attendre 1 seconde avant de vraiment sauvegarder
  }

  /**
   * Crée un hash simple de l'état pour détecter les changements
   */
  private hashState(state: OrganismState): string {
    // On ignore lastUpdate car il change toujours
    const { lastUpdate, ...stateWithoutTimestamp } = state;
    return JSON.stringify(stateWithoutTimestamp);
  }

  private updateMetabolism(): void {
    const now = Date.now();
    const timeSinceLastFeed = (now - this.state.lastFeedTime) / 1000 / 60; // Minutes

    // Perte d'énergie naturelle
    const energyLoss = this.state.isActive ? 0.5 : 0.2; // Plus actif = plus de consommation
    this.state.energy = Math.max(0, this.state.energy - energyLoss);

    // Évolution de la conscience selon le type de page
    let consciousnessChange = 0;
    switch (this.state.currentPageType) {
      case 'science':
      case 'learning':
        consciousnessChange = 0.3; // Augmente sur pages éducatives
        break;
      case 'social':
        consciousnessChange = 0.1;
        break;
      case 'entertainment':
        consciousnessChange = -0.1; // Diminue légèrement
        break;
      default:
        consciousnessChange = 0;
    }
    this.state.consciousness = Math.max(0, Math.min(100,
      this.state.consciousness + consciousnessChange
    ));

    // Mise à jour de l'humeur basée sur l'état
    this.updateMood(timeSinceLastFeed);

    // Calcul du stade d'évolution
    this.updateEvolutionStage();

    this.state.lastUpdate = now;
  }

  private updateMood(timeSinceLastFeed: number): void {
    if (this.state.energy < 20) {
      this.state.mood = 'tired';
    } else if (timeSinceLastFeed > 30) {
      this.state.mood = 'hungry';
    } else if (this.state.currentPageType === 'science') {
      this.state.mood = 'excited';
    } else if (this.state.consciousness > 70) {
      this.state.mood = 'meditating';
    } else if (this.state.isActive) {
      this.state.mood = 'happy';
    } else {
      this.state.mood = 'curious';
    }
  }

  private updateEvolutionStage(): void {
    // Stade basé sur l'expérience totale
    const xpThresholds = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500];
    let stage = 1;

    for (let i = xpThresholds.length - 1; i >= 0; i--) {
      if (this.state.experience >= xpThresholds[i]) {
        stage = i + 1;
        break;
      }
    }

    this.state.evolutionStage = stage;
  }

  // Méthodes publiques

  public getState(): OrganismState {
    return { ...this.state };
  }

  public async updateState(updates: Partial<OrganismState>): Promise<void> {
    this.state = {
      ...this.state,
      ...updates,
      lastUpdate: Date.now()
    };

    await this.saveState();
    this.notifyListeners();
  }

  public async feed(source: 'ritual' | 'interaction' | 'knowledge' | 'social'): Promise<void> {
    let energyGain = 0;
    let xpGain = 0;

    switch (source) {
      case 'ritual':
        energyGain = 30;
        xpGain = 50;
        this.state.consciousness += 10;
        break;
      case 'interaction':
        energyGain = 10;
        xpGain = 10;
        break;
      case 'knowledge':
        energyGain = 15;
        xpGain = 25;
        this.state.consciousness += 5;
        this.state.knowledgeGained += 1;
        break;
      case 'social':
        energyGain = 20;
        xpGain = 15;
        this.state.socialInteractions += 1;
        break;
    }

    this.state.energy = Math.min(100, this.state.energy + energyGain);
    this.state.experience += xpGain;
    this.state.lastFeedTime = Date.now();
    this.state.mood = 'happy';

    await this.saveState();
    this.notifyListeners();

    logger.info(`Organism fed from ${source}: +${energyGain} energy, +${xpGain} XP`);
  }

  public async onPageVisit(pageType: string): Promise<void> {
    this.state.pagesVisited += 1;
    this.state.currentPageType = pageType;

    // Gain d'XP selon le type de page
    let xpGain = 5; // Base
    if (pageType === 'science' || pageType === 'learning') {
      xpGain = 15;
      this.state.knowledgeGained += 1;
    } else if (pageType === 'social') {
      xpGain = 10;
      this.state.socialInteractions += 1;
    }

    this.state.experience += xpGain;
    await this.saveState();
  }

  public subscribe(callback: (state: OrganismState) => void): () => void {
    this.listeners.add(callback);
    // Retourner une fonction de désinscription
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        logger.error('Error notifying listener:', error);
      }
    });
  }

  private async saveState(): Promise<void> {
    const operationId = backpressureController.startOperation('write', 'organism_state');

    try {
      await chrome.storage.local.set({
        organism_state: this.state
      });

      // Enregistrer le hash de l'état sauvegardé
      this.lastSavedState = this.hashState(this.state);

      backpressureController.completeOperation(operationId, true);
    } catch (error) {
      logger.error('Failed to save organism state:', error);
      backpressureController.completeOperation(operationId, false);
    }
  }

  public destroy(): void {
    if (this.syncInterval) {
      clearTimeout(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }
    this.listeners.clear();
  }
}

// Export singleton pour usage global - lazy initialization
let _instance: OrganismStateManager | null = null;

export const organismStateManager = {
  getState(): OrganismState {
    if (!_instance) {
      _instance = OrganismStateManager.getInstance();
    }
    return _instance.getState();
  },

  async updateState(updates: Partial<OrganismState>): Promise<void> {
    if (!_instance) {
      _instance = OrganismStateManager.getInstance();
    }
    return _instance.updateState(updates);
  },

  async feed(source: 'ritual' | 'interaction' | 'knowledge' | 'social'): Promise<void> {
    if (!_instance) {
      _instance = OrganismStateManager.getInstance();
    }
    return _instance.feed(source);
  },

  async onPageVisit(pageType: string): Promise<void> {
    if (!_instance) {
      _instance = OrganismStateManager.getInstance();
    }
    return _instance.onPageVisit(pageType);
  },

  subscribe(callback: (state: OrganismState) => void): () => void {
    if (!_instance) {
      _instance = OrganismStateManager.getInstance();
    }
    return _instance.subscribe(callback);
  }
};