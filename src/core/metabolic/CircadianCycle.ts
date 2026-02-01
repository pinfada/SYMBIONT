/**
 * Cycle Circadien (Mode Rêve)
 *
 * Script d'arrière-plan qui traite la "digestion" des données
 * (renforcement synaptique et archivage) uniquement pendant
 * les phases d'inactivité de l'utilisateur.
 *
 * Phases:
 * - ACTIVE: Utilisateur actif, traitement minimal
 * - IDLE: Utilisateur inactif (<5min), traitement léger
 * - SLEEP: Utilisateur absent (>5min), traitement profond
 * - DREAM: Mode rêve (>15min), consolidation mémoire et nettoyage
 */

import { logger } from '@/shared/utils/secureLogger';
import { neuromodulation } from './Neuromodulation';
import { backpressureController } from './BackpressureController';
import { DreamProcessor } from '@/core/dreams/DreamProcessor';
import { MemoryFragmentCollector } from '@/core/dreams/MemoryFragmentCollector';
import type { MemoryFragment } from '@/core/dreams/DreamProcessor';

export type CircadianPhase = 'active' | 'idle' | 'sleep' | 'dream';

export interface CircadianConfig {
  idleThreshold: number;      // Seuil pour IDLE (ms, défaut: 60000 = 1min)
  sleepThreshold: number;     // Seuil pour SLEEP (ms, défaut: 300000 = 5min)
  dreamThreshold: number;     // Seuil pour DREAM (ms, défaut: 900000 = 15min)
  checkInterval: number;      // Intervalle de vérification (ms, défaut: 30000)
  maxDreamDuration: number;   // Durée max du mode rêve (ms, défaut: 3600000 = 1h)
}

export interface DigestTask {
  id: string;
  type: 'pruning' | 'consolidation' | 'archival' | 'cleanup';
  priority: number;           // 0-10, 10 = plus prioritaire
  estimatedDuration: number;  // ms
  execute: () => Promise<void>;
}

export interface CircadianState {
  phase: CircadianPhase;
  lastActivity: number;
  lastPhaseChange: number;
  dreamCycleCount: number;
  tasksCompleted: number;
  tasksQueued: number;
}

type IdleState = 'active' | 'idle' | 'locked';

/**
 * Gestionnaire du cycle circadien
 */
export class CircadianCycleManager {
  private config: CircadianConfig;
  private state: CircadianState;
  private taskQueue: DigestTask[] = [];
  private isProcessing: boolean = false;
  private checkIntervalId: ReturnType<typeof setInterval> | null = null;
  private idleDetectionEnabled: boolean = false;

  // Callbacks pour les transitions de phase
  private phaseChangeCallbacks: Array<(phase: CircadianPhase, previousPhase: CircadianPhase) => void> = [];

  // Tâches périodiques configurées
  private periodicTasks: Map<string, { interval: number; lastRun: number; task: DigestTask }> = new Map();

  // Dream processor et collecteur de fragments
  private dreamProcessor: DreamProcessor | null = null;
  private fragmentCollector: MemoryFragmentCollector | null = null;
  private lastDreamSynthesis: number = 0;
  private readonly DREAM_SYNTHESIS_INTERVAL = 60000; // 1 minute minimum (réaliste pour phase dream)

  constructor(config?: Partial<CircadianConfig>) {
    this.config = {
      idleThreshold: 60000,      // 1 minute
      sleepThreshold: 300000,    // 5 minutes
      dreamThreshold: 900000,    // 15 minutes
      checkInterval: 30000,      // 30 secondes
      maxDreamDuration: 3600000, // 1 heure
      ...config
    };

    this.state = {
      phase: 'active',
      lastActivity: Date.now(),
      lastPhaseChange: Date.now(),
      dreamCycleCount: 0,
      tasksCompleted: 0,
      tasksQueued: 0
    };

    logger.info('[CircadianCycle] Initialized', this.config);
  }

  /**
   * Démarre le gestionnaire de cycle circadien
   */
  async start(): Promise<void> {
    // Initialiser le dream processor et le collecteur
    this.dreamProcessor = DreamProcessor.getInstance();
    this.fragmentCollector = MemoryFragmentCollector.getInstance();

    // Configuration de la détection d'inactivité via chrome.idle
    await this.setupIdleDetection();

    // Démarrer la vérification périodique
    this.checkIntervalId = setInterval(() => {
      this.checkPhase();
      this.processTaskQueue();
    }, this.config.checkInterval);

    // Enregistrer la tâche de synthèse onirique
    this.registerDreamSynthesisTask();

    logger.info('[CircadianCycle] Started with Dream Processor');
  }

  /**
   * Arrête le gestionnaire
   */
  stop(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }

    this.idleDetectionEnabled = false;

    logger.info('[CircadianCycle] Stopped');
  }

  /**
   * Configure la détection d'inactivité via l'API chrome.idle
   */
  private async setupIdleDetection(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.idle) {
      try {
        // Définir le seuil d'inactivité (en secondes)
        chrome.idle.setDetectionInterval(Math.floor(this.config.idleThreshold / 1000));

        // Écouter les changements d'état
        chrome.idle.onStateChanged.addListener((newState: IdleState) => {
          this.onIdleStateChanged(newState);
        });

        this.idleDetectionEnabled = true;
        logger.info('[CircadianCycle] Idle detection enabled');
      } catch (error) {
        logger.warn('[CircadianCycle] Failed to setup idle detection', error);
      }
    }
  }

  /**
   * Gère les changements d'état d'inactivité
   */
  private onIdleStateChanged(idleState: IdleState): void {
    const now = Date.now();

    if (idleState === 'active') {
      this.state.lastActivity = now;
      this.transitionToPhase('active');

      // Notifier le système de neuromodulation
      neuromodulation.processEvent('novelty', 0.3);
    } else if (idleState === 'idle') {
      // L'utilisateur est inactif mais la machine est active
      this.transitionToPhase('idle');
    } else if (idleState === 'locked') {
      // L'écran est verrouillé - mode sommeil profond
      this.transitionToPhase('sleep');
    }
  }

  /**
   * Vérifie et met à jour la phase actuelle
   */
  private checkPhase(): void {
    const now = Date.now();
    const idleTime = now - this.state.lastActivity;
    const timeInCurrentPhase = now - this.state.lastPhaseChange;

    // Déterminer la phase appropriée basée sur le temps d'inactivité
    let newPhase: CircadianPhase = this.state.phase;

    if (idleTime >= this.config.dreamThreshold) {
      newPhase = 'dream';
    } else if (idleTime >= this.config.sleepThreshold) {
      newPhase = 'sleep';
    } else if (idleTime >= this.config.idleThreshold) {
      newPhase = 'idle';
    } else {
      newPhase = 'active';
    }

    // Limiter la durée du mode rêve
    if (this.state.phase === 'dream' && timeInCurrentPhase > this.config.maxDreamDuration) {
      // Forcer un "réveil" pour éviter les traitements excessifs
      logger.info('[CircadianCycle] Dream cycle limit reached, forcing wake');
      this.state.dreamCycleCount++;
      newPhase = 'sleep'; // Revenir en mode sommeil léger
    }

    if (newPhase !== this.state.phase) {
      this.transitionToPhase(newPhase);
    }
  }

  /**
   * Effectue la transition vers une nouvelle phase
   */
  private transitionToPhase(newPhase: CircadianPhase): void {
    const previousPhase = this.state.phase;
    if (newPhase === previousPhase) return;

    this.state.phase = newPhase;
    this.state.lastPhaseChange = Date.now();

    logger.info('[CircadianCycle] Phase transition', {
      from: previousPhase,
      to: newPhase,
      dreamCycleCount: this.state.dreamCycleCount
    });

    // Notifier le système de neuromodulation
    switch (newPhase) {
      case 'active':
        neuromodulation.processEvent('novelty', 0.5);
        break;
      case 'idle':
        neuromodulation.processEvent('relaxation', 0.3);
        break;
      case 'sleep':
        neuromodulation.processEvent('relaxation', 0.6);
        break;
      case 'dream':
        neuromodulation.processEvent('relaxation', 1.0);
        // Déclencher la synthèse onirique si suffisamment de temps s'est écoulé
        this.triggerDreamSynthesis();
        break;
    }

    // Notifier les callbacks
    for (const callback of this.phaseChangeCallbacks) {
      try {
        callback(newPhase, previousPhase);
      } catch (error) {
        logger.error('[CircadianCycle] Phase change callback error', error);
      }
    }
  }

  /**
   * Enregistre une tâche de digestion
   */
  queueTask(task: DigestTask): void {
    // Vérifier si une tâche identique existe déjà
    const existingIndex = this.taskQueue.findIndex(t => t.id === task.id);
    if (existingIndex >= 0) {
      // Mettre à jour la tâche existante
      this.taskQueue[existingIndex] = task;
    } else {
      this.taskQueue.push(task);
    }

    // Trier par priorité (plus haute en premier)
    this.taskQueue.sort((a, b) => b.priority - a.priority);
    this.state.tasksQueued = this.taskQueue.length;

    logger.info('[CircadianCycle] Task queued', {
      id: task.id,
      type: task.type,
      priority: task.priority,
      queueLength: this.taskQueue.length
    });
  }

  /**
   * Enregistre une tâche périodique
   */
  registerPeriodicTask(id: string, interval: number, task: Omit<DigestTask, 'id'>): void {
    this.periodicTasks.set(id, {
      interval,
      lastRun: 0,
      task: { ...task, id }
    });

    logger.info('[CircadianCycle] Periodic task registered', { id, interval });
  }

  /**
   * Traite la file de tâches selon la phase actuelle
   */
  private async processTaskQueue(): Promise<void> {
    if (this.isProcessing) return;
    if (this.taskQueue.length === 0 && this.periodicTasks.size === 0) return;

    // Vérifier le niveau de backpressure
    if (backpressureController.getLevel() === 'emergency') {
      logger.warn('[CircadianCycle] Skipping task processing - emergency backpressure');
      return;
    }

    this.isProcessing = true;

    try {
      // Ajouter les tâches périodiques dues
      await this.checkPeriodicTasks();

      // Déterminer le budget de temps selon la phase
      const timeBudget = this.getTimeBudget();
      let timeSpent = 0;
      const startTime = Date.now();

      while (this.taskQueue.length > 0 && timeSpent < timeBudget) {
        const task = this.taskQueue[0];

        // Vérifier si on a le temps d'exécuter cette tâche
        if (task.estimatedDuration > (timeBudget - timeSpent)) {
          // Pas assez de temps, attendre le prochain cycle
          break;
        }

        // Exécuter la tâche
        try {
          logger.info('[CircadianCycle] Executing task', { id: task.id, type: task.type });
          await task.execute();
          this.state.tasksCompleted++;
        } catch (error) {
          logger.error('[CircadianCycle] Task execution failed', { id: task.id, error });
        }

        // Retirer la tâche de la queue
        this.taskQueue.shift();
        this.state.tasksQueued = this.taskQueue.length;

        timeSpent = Date.now() - startTime;

        // Pause courte entre les tâches pour ne pas bloquer
        await this.sleep(10);
      }

    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Vérifie et ajoute les tâches périodiques dues
   */
  private async checkPeriodicTasks(): Promise<void> {
    const now = Date.now();

    for (const [id, periodicTask] of this.periodicTasks) {
      // Vérifier si la tâche est due
      if (now - periodicTask.lastRun >= periodicTask.interval) {
        // Vérifier si pas déjà dans la queue
        if (!this.taskQueue.find(t => t.id === id)) {
          this.queueTask(periodicTask.task);
        }
        periodicTask.lastRun = now;
      }
    }
  }

  /**
   * Retourne le budget de temps selon la phase
   */
  private getTimeBudget(): number {
    switch (this.state.phase) {
      case 'active':
        return 100;   // 100ms - traitement minimal
      case 'idle':
        return 500;   // 500ms - traitement léger
      case 'sleep':
        return 2000;  // 2s - traitement modéré
      case 'dream':
        return 10000; // 10s - traitement intensif
      default:
        return 100;
    }
  }

  /**
   * Utilitaire de pause
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Enregistre un callback de changement de phase
   */
  onPhaseChange(callback: (phase: CircadianPhase, previousPhase: CircadianPhase) => void): () => void {
    this.phaseChangeCallbacks.push(callback);
    return () => {
      const index = this.phaseChangeCallbacks.indexOf(callback);
      if (index >= 0) {
        this.phaseChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Signale une activité utilisateur (reset du timer d'inactivité)
   */
  recordActivity(): void {
    this.state.lastActivity = Date.now();

    if (this.state.phase !== 'active') {
      this.transitionToPhase('active');
    }
  }

  /**
   * Retourne la phase actuelle
   */
  getPhase(): CircadianPhase {
    return this.state.phase;
  }

  /**
   * Retourne l'état complet
   */
  getState(): CircadianState {
    return { ...this.state };
  }

  /**
   * Détermine si le traitement intensif est autorisé
   */
  canPerformIntensiveProcessing(): boolean {
    return this.state.phase === 'sleep' || this.state.phase === 'dream';
  }

  /**
   * Détermine si l'archivage est autorisé (mode rêve uniquement)
   */
  canPerformArchival(): boolean {
    return this.state.phase === 'dream';
  }

  /**
   * Retourne le multiplicateur de fréquence pour les opérations périodiques
   */
  getFrequencyMultiplier(): number {
    switch (this.state.phase) {
      case 'active':
        return 1;     // Fréquence normale
      case 'idle':
        return 0.5;   // Réduire de moitié
      case 'sleep':
        return 0.2;   // Réduire à 20%
      case 'dream':
        return 0.1;   // Réduire à 10% (mode économie)
      default:
        return 1;
    }
  }

  /**
   * Sérialise l'état pour la persistance
   */
  serialize(): CircadianState {
    return { ...this.state };
  }

  /**
   * Restaure l'état depuis la persistance
   */
  deserialize(state: Partial<CircadianState>): void {
    this.state = {
      ...this.state,
      ...state,
      lastActivity: Date.now(), // Reset l'activité au chargement
      lastPhaseChange: Date.now()
    };
  }

  /**
   * Enregistre la tâche de synthèse onirique périodique
   */
  private registerDreamSynthesisTask(): void {
    const dreamTask: DigestTask = {
      id: 'dream-synthesis',
      type: 'consolidation',
      priority: 10, // Priorité maximale
      estimatedDuration: 30000, // 30 secondes max
      execute: async () => {
        await this.performDreamSynthesis();
      }
    };

    // Enregistrer comme tâche périodique
    this.registerPeriodicTask('dream-synthesis', this.DREAM_SYNTHESIS_INTERVAL, dreamTask);
  }

  /**
   * Déclenche la synthèse onirique si les conditions sont réunies
   */
  private async triggerDreamSynthesis(): Promise<void> {
    const now = Date.now();

    // Vérifier l'intervalle minimum
    if (now - this.lastDreamSynthesis < this.DREAM_SYNTHESIS_INTERVAL) {
      return;
    }

    // Vérifier qu'on est bien en phase dream
    if (this.state.phase !== 'dream') {
      return;
    }

    // Vérifier le backpressure
    if (backpressureController.getLevel() === 'emergency' ||
        backpressureController.getLevel() === 'critical') {
      logger.warn('[CircadianCycle] Skipping dream synthesis due to backpressure');
      return;
    }

    // Exécuter la synthèse
    await this.performDreamSynthesis();
  }

  /**
   * Effectue la synthèse onirique cross-domain
   */
  private async performDreamSynthesis(): Promise<void> {
    if (!this.dreamProcessor || !this.fragmentCollector) {
      logger.error('[CircadianCycle] Dream processor not initialized');
      return;
    }

    try {
      logger.info('[CircadianCycle] Starting dream synthesis');

      // Récupérer les fragments mémoire collectés
      const fragments = await this.fragmentCollector.getRecentFragments(500); // Max 500 fragments

      if (fragments.length === 0) {
        logger.info('[CircadianCycle] No memory fragments to process');
        return;
      }

      // Lancer l'analyse cross-domain
      const report = await this.dreamProcessor.performNocturnalSynthesis(fragments);

      this.lastDreamSynthesis = Date.now();

      logger.info('[CircadianCycle] Dream synthesis complete', {
        fragmentsAnalyzed: report.fragmentsAnalyzed,
        shadowEntities: report.shadowEntities.length,
        cpuUtilization: report.cpuUtilization,
        duration: report.endTime - report.startTime
      });

      // Nettoyer les fragments traités
      await this.fragmentCollector.clearProcessedFragments(fragments);

    } catch (error) {
      logger.error('[CircadianCycle] Dream synthesis failed', error);
    }
  }

  /**
   * Force une synthèse onirique manuelle (pour tests)
   */
  public async forceDreamSynthesis(): Promise<void> {
    logger.warn('[CircadianCycle] Forcing dream synthesis manually');
    this.lastDreamSynthesis = 0; // Reset pour bypasser l'intervalle

    // Créer des fragments de test si aucun n'existe
    const fragments = await this.fragmentCollector?.getRecentFragments(500);
    if (!fragments || fragments.length === 0) {
      logger.info('[CircadianCycle] Creating test fragments for forced synthesis');

      // Injecter des fragments de test réalistes
      const testFragments = [
        {
          domain: 'tracker1.com',
          timestamp: Date.now(),
          friction: 120,
          latency: 45,
          trackers: ['analytics.js', 'pixel.gif'],
          hiddenElements: [],
          protocolSignature: 'h3',
          resourceTimings: []
        },
        {
          domain: 'tracker2.net',
          timestamp: Date.now(),
          friction: 115,
          latency: 48,
          trackers: ['analytics.js', 'fingerprint.js'],
          hiddenElements: [],
          protocolSignature: 'h3',
          resourceTimings: []
        }
      ];

      for (const fragment of testFragments) {
        this.fragmentCollector?.importFragments([fragment]);
      }
    }

    await this.performDreamSynthesis();
  }
}

// Export singleton
export const circadianCycle = new CircadianCycleManager();
