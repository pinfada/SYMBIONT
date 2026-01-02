/**
 * CircadianRhythm - Système de cycles veille-sommeil biologiques
 * Gère les phases d'activité, de somnolence, REM et sommeil profond
 */

import { SecureRandom } from '@shared/utils/secureRandom';
import { logger } from '@shared/utils/secureLogger';
import type { ThoughtVector } from './NeuroCore';

// États du cycle circadien
export enum SleepPhase {
  AWAKE = 'awake',        // Actif, analyse en temps réel
  DROWSY = 'drowsy',      // Somnolent, ralentissement
  REM = 'rem',            // Sommeil paradoxal, rêves
  DEEP = 'deep'           // Sommeil profond, consolidation
}

// Données d'une mémoire à consolider
export interface MemoryTrace {
  timestamp: number;
  vector: Float32Array;      // Vecteur sémantique
  emotionalCharge: number;   // Importance émotionnelle
  context: string;           // Contexte de la page
  reinforced: boolean;       // Déjà consolidée
  dreamWeight: number;       // Poids dans les rêves
}

// État d'un rêve
export interface DreamState {
  phase: 'beginning' | 'middle' | 'end';
  coherence: number;         // 0-1 cohérence narrative
  lucidity: number;          // 0-1 conscience du rêve
  emotionalTone: number;     // -1 à 1 (cauchemar à rêve agréable)
  memories: MemoryTrace[];   // Mémoires rejouées
  synthesis: Float32Array;   // Vecteur de synthèse du rêve
}

export class CircadianRhythm {
  private currentPhase: SleepPhase = SleepPhase.AWAKE;
  private phaseStartTime: number = Date.now();
  private lastSleepTime: number = 0;
  private wakefulness: number = 1.0; // 0 = endormi, 1 = éveillé
  private dreamDepth: number = 0;
  private memoryBuffer: MemoryTrace[] = [];
  private dreamState: DreamState | null = null;
  private cycleInterval: number | null = null; // Pour le nettoyage

  // Constantes biologiques (en millisecondes)
  private readonly WAKE_DURATION = 900000;      // 15 min actif
  private readonly DROWSY_DURATION = 300000;    // 5 min somnolent
  private readonly REM_DURATION = 180000;       // 3 min REM
  private readonly DEEP_DURATION = 420000;      // 7 min sommeil profond
  private readonly MEMORY_BUFFER_SIZE = 50;     // Taille du buffer de mémoires
  private readonly CONSOLIDATION_THRESHOLD = 0.6; // Seuil pour consolidation

  // Paramètres métaboliques par phase
  private readonly METABOLIC_RATES = {
    [SleepPhase.AWAKE]: 1.0,    // 100% métabolisme
    [SleepPhase.DROWSY]: 0.6,   // 60% métabolisme
    [SleepPhase.REM]: 0.8,       // 80% métabolisme (rêves actifs)
    [SleepPhase.DEEP]: 0.3       // 30% métabolisme
  };

  // Fréquence de rendu WebGL par phase (FPS)
  private readonly RENDER_RATES = {
    [SleepPhase.AWAKE]: 60,      // 60 FPS actif
    [SleepPhase.DROWSY]: 30,     // 30 FPS somnolent
    [SleepPhase.REM]: 15,        // 15 FPS rêve
    [SleepPhase.DEEP]: 5         // 5 FPS sommeil profond
  };

  constructor() {
    this.initializeCycle();
  }

  /**
   * Initialise le cycle circadien
   */
  private initializeCycle(): void {
    // Commencer avec un offset aléatoire pour variation biologique
    const offset = SecureRandom.random() * 300000; // 0-5 min
    this.phaseStartTime = Date.now() - offset;

    // Démarrer le monitoring du cycle
    this.startCycleMonitoring();
  }

  /**
   * Démarre le monitoring automatique du cycle
   */
  private startCycleMonitoring(): void {
    this.cycleInterval = window.setInterval(() => {
      this.updatePhase();
    }, 10000); // Vérifier toutes les 10 secondes
  }

  /**
   * Met à jour la phase selon le temps écoulé et l'activité
   */
  private updatePhase(): void {
    const now = Date.now();
    const phaseElapsed = now - this.phaseStartTime;

    // Déterminer la durée cible de la phase actuelle
    let targetDuration: number;
    switch (this.currentPhase) {
      case SleepPhase.AWAKE:
        targetDuration = this.WAKE_DURATION;
        break;
      case SleepPhase.DROWSY:
        targetDuration = this.DROWSY_DURATION;
        break;
      case SleepPhase.REM:
        targetDuration = this.REM_DURATION;
        break;
      case SleepPhase.DEEP:
        targetDuration = this.DEEP_DURATION;
        break;
    }

    // Ajouter de la variabilité biologique (±20%)
    targetDuration *= (0.8 + SecureRandom.random() * 0.4);

    // Transition si la durée est dépassée
    if (phaseElapsed > targetDuration) {
      this.transitionToNextPhase();
    }

    // Mise à jour de la somnolence
    this.updateWakefulness();
  }

  /**
   * Transition vers la phase suivante du cycle
   */
  private transitionToNextPhase(): void {
    const previousPhase = this.currentPhase;

    // Cycle: AWAKE -> DROWSY -> REM -> DEEP -> AWAKE
    switch (this.currentPhase) {
      case SleepPhase.AWAKE:
        this.currentPhase = SleepPhase.DROWSY;
        this.prepareForSleep();
        break;

      case SleepPhase.DROWSY:
        this.currentPhase = SleepPhase.REM;
        this.enterDreamState();
        break;

      case SleepPhase.REM:
        this.currentPhase = SleepPhase.DEEP;
        this.consolidateMemories();
        break;

      case SleepPhase.DEEP:
        this.currentPhase = SleepPhase.AWAKE;
        this.wakeUp();
        break;
    }

    this.phaseStartTime = Date.now();

    logger.info(`Circadian transition: ${previousPhase} → ${this.currentPhase}`);
  }

  /**
   * Prépare l'organisme pour le sommeil
   */
  private prepareForSleep(): void {
    this.lastSleepTime = Date.now();

    // Trier les mémoires par importance pour la consolidation
    this.memoryBuffer.sort((a, b) =>
      (b.emotionalCharge * b.dreamWeight) - (a.emotionalCharge * a.dreamWeight)
    );

    // Garder seulement les mémoires les plus importantes
    if (this.memoryBuffer.length > this.MEMORY_BUFFER_SIZE) {
      this.memoryBuffer = this.memoryBuffer.slice(0, this.MEMORY_BUFFER_SIZE);
    }
  }

  /**
   * Entre dans l'état de rêve REM
   */
  private enterDreamState(): void {
    // Sélectionner les mémoires à rejouer dans le rêve
    const dreamMemories = this.selectDreamMemories();

    // Créer l'état de rêve
    this.dreamState = {
      phase: 'beginning',
      coherence: 0.3 + SecureRandom.random() * 0.4, // 30-70% cohérence
      lucidity: SecureRandom.random() * 0.3,         // 0-30% lucidité
      emotionalTone: (SecureRandom.random() - 0.5) * 2,
      memories: dreamMemories,
      synthesis: this.synthesizeDreamVector(dreamMemories)
    };

    this.dreamDepth = 0.8;

    // Simuler la progression du rêve
    this.simulateDreamProgression();
  }

  /**
   * Sélectionne les mémoires à intégrer dans le rêve
   */
  private selectDreamMemories(): MemoryTrace[] {
    const selected: MemoryTrace[] = [];
    const numMemories = 3 + Math.floor(SecureRandom.random() * 5); // 3-7 mémoires

    for (let i = 0; i < Math.min(numMemories, this.memoryBuffer.length); i++) {
      // Probabilité décroissante pour les mémoires moins importantes
      if (SecureRandom.random() < Math.exp(-i * 0.3)) {
        selected.push(this.memoryBuffer[i]);
      }
    }

    // Mélanger les mémoires pour créer des associations oniriques
    for (let i = selected.length - 1; i > 0; i--) {
      const j = Math.floor(SecureRandom.random() * (i + 1));
      [selected[i], selected[j]] = [selected[j], selected[i]];
    }

    return selected;
  }

  /**
   * Synthétise un vecteur de rêve à partir des mémoires
   */
  private synthesizeDreamVector(memories: MemoryTrace[]): Float32Array {
    const vector = new Float32Array(128);

    if (memories.length === 0) return vector;

    // Combiner les vecteurs des mémoires avec pondération émotionnelle
    for (const memory of memories) {
      const weight = memory.emotionalCharge * memory.dreamWeight;
      for (let i = 0; i < Math.min(vector.length, memory.vector.length); i++) {
        vector[i] += memory.vector[i] * weight;
      }
    }

    // Ajouter du bruit onirique
    for (let i = 0; i < vector.length; i++) {
      vector[i] += (SecureRandom.random() - 0.5) * 0.2;
      vector[i] = Math.tanh(vector[i]); // Normalisation
    }

    return vector;
  }

  /**
   * Simule la progression du rêve
   */
  private simulateDreamProgression(): void {
    if (!this.dreamState) return;

    setTimeout(() => {
      if (this.dreamState && this.currentPhase === SleepPhase.REM) {
        this.dreamState.phase = 'middle';
        this.dreamState.coherence *= 0.9; // Le rêve devient moins cohérent
        this.dreamState.lucidity *= 1.1;   // Possibilité de lucidité accrue
      }
    }, this.REM_DURATION / 3);

    setTimeout(() => {
      if (this.dreamState && this.currentPhase === SleepPhase.REM) {
        this.dreamState.phase = 'end';
        this.dreamState.coherence *= 0.8;

        // Renforcer les connexions des mémoires rêvées
        for (const memory of this.dreamState.memories) {
          memory.reinforced = true;
          memory.dreamWeight *= 1.2;
        }
      }
    }, (this.REM_DURATION * 2) / 3);
  }

  /**
   * Consolide les mémoires pendant le sommeil profond
   */
  private consolidateMemories(): void {
    this.dreamState = null;
    this.dreamDepth = 1.0;

    // Consolidation: renforcer les mémoires importantes
    for (const memory of this.memoryBuffer) {
      if (memory.emotionalCharge > this.CONSOLIDATION_THRESHOLD) {
        memory.reinforced = true;

        // Créer des associations entre mémoires similaires
        this.createMemoryAssociations(memory);
      }
    }

    // Nettoyer les mémoires faibles
    this.memoryBuffer = this.memoryBuffer.filter(m =>
      m.reinforced || m.emotionalCharge > 0.3
    );

    logger.info(`Consolidated ${this.memoryBuffer.length} memories during deep sleep`);
  }

  /**
   * Crée des associations entre mémoires similaires
   */
  private createMemoryAssociations(memory: MemoryTrace): void {
    for (const other of this.memoryBuffer) {
      if (other !== memory) {
        const similarity = this.calculateVectorSimilarity(memory.vector, other.vector);
        if (similarity > 0.7) {
          // Renforcer mutuellement les mémoires similaires
          other.dreamWeight = Math.min(1, other.dreamWeight + 0.1);
          memory.dreamWeight = Math.min(1, memory.dreamWeight + 0.1);
        }
      }
    }
  }

  /**
   * Réveil et réinitialisation
   */
  private wakeUp(): void {
    this.dreamState = null;
    this.dreamDepth = 0;
    this.wakefulness = 0.5; // Réveil progressif

    // Augmentation progressive de la vigilance
    const wakeUpDuration = 30000; // 30 secondes pour se réveiller complètement
    const steps = 10;
    const interval = wakeUpDuration / steps;

    for (let i = 1; i <= steps; i++) {
      setTimeout(() => {
        this.wakefulness = 0.5 + (0.5 * i / steps);
      }, interval * i);
    }
  }

  /**
   * Met à jour le niveau de vigilance
   */
  private updateWakefulness(): void {
    const targetWakefulness = this.currentPhase === SleepPhase.AWAKE ? 1.0 :
                             this.currentPhase === SleepPhase.DROWSY ? 0.4 :
                             this.currentPhase === SleepPhase.REM ? 0.2 : 0.1;

    // Transition douce vers la vigilance cible
    const delta = targetWakefulness - this.wakefulness;
    this.wakefulness += delta * 0.1;
  }

  /**
   * Calcule la similarité entre deux vecteurs
   */
  private calculateVectorSimilarity(a: Float32Array, b: Float32Array): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Ajoute une nouvelle mémoire à consolider et la retourne
   */
  public recordMemory(vector: Float32Array, emotionalCharge: number, context: string): MemoryTrace {
    const memory: MemoryTrace = {
      timestamp: Date.now(),
      vector: new Float32Array(vector), // Copie pour éviter les mutations
      emotionalCharge,
      context,
      reinforced: false,
      dreamWeight: 0.5 + emotionalCharge * 0.5
    };

    this.memoryBuffer.push(memory);

    // Limiter la taille du buffer
    if (this.memoryBuffer.length > this.MEMORY_BUFFER_SIZE * 2) {
      // Garder les mémoires les plus récentes et importantes
      this.memoryBuffer.sort((a, b) => {
        const scoreA = a.emotionalCharge * 0.5 + (1 - (Date.now() - a.timestamp) / 86400000) * 0.5;
        const scoreB = b.emotionalCharge * 0.5 + (1 - (Date.now() - b.timestamp) / 86400000) * 0.5;
        return scoreB - scoreA;
      });
      this.memoryBuffer = this.memoryBuffer.slice(0, this.MEMORY_BUFFER_SIZE);
    }

    return memory;
  }

  /**
   * Force une phase spécifique (pour debug ou événements spéciaux)
   */
  public forcePhase(phase: SleepPhase): void {
    this.currentPhase = phase;
    this.phaseStartTime = Date.now();

    switch (phase) {
      case SleepPhase.REM:
        this.enterDreamState();
        break;
      case SleepPhase.DEEP:
        this.consolidateMemories();
        break;
      case SleepPhase.AWAKE:
        this.wakeUp();
        break;
    }
  }

  /**
   * Obtient l'état actuel du cycle
   */
  public getState() {
    return {
      phase: this.currentPhase,
      wakefulness: this.wakefulness,
      metabolicRate: this.METABOLIC_RATES[this.currentPhase],
      renderRate: this.RENDER_RATES[this.currentPhase],
      dreamState: this.dreamState,
      dreamDepth: this.dreamDepth,
      timeSincePhaseStart: Date.now() - this.phaseStartTime,
      memoryBufferSize: this.memoryBuffer.length
    };
  }

  /**
   * Obtient le taux métabolique actuel
   */
  public getMetabolicRate(): number {
    return this.METABOLIC_RATES[this.currentPhase];
  }

  /**
   * Obtient la fréquence de rendu recommandée
   */
  public getRenderRate(): number {
    return this.RENDER_RATES[this.currentPhase];
  }

  /**
   * Vérifie si l'organisme rêve
   */
  public isDreaming(): boolean {
    return this.currentPhase === SleepPhase.REM && this.dreamState !== null;
  }

  /**
   * Obtient le vecteur de synthèse du rêve actuel
   */
  public getDreamVector(): Float32Array | null {
    return this.dreamState?.synthesis || null;
  }

  /**
   * Calcule l'influence du cycle sur la chimie neuronale
   */
  public getChemicalInfluence(): Partial<{
    melatonin: number;
    serotonin: number;
    dopamine: number;
    cortisol: number;
  }> {
    const influences: any = {};

    switch (this.currentPhase) {
      case SleepPhase.AWAKE:
        influences.melatonin = -0.3;
        influences.cortisol = 0.2;
        influences.dopamine = 0.1;
        break;

      case SleepPhase.DROWSY:
        influences.melatonin = 0.4;
        influences.serotonin = 0.2;
        influences.cortisol = -0.2;
        break;

      case SleepPhase.REM:
        influences.dopamine = 0.3; // Rêves stimulent la dopamine
        influences.acetylcholine = 0.4; // Important pour REM
        break;

      case SleepPhase.DEEP:
        influences.melatonin = 0.6;
        influences.gaba = 0.4; // Inhibition profonde
        influences.cortisol = -0.4;
        break;
    }

    return influences;
  }

  /**
   * Nettoie les ressources (arrête les timers)
   */
  public destroy(): void {
    if (this.cycleInterval) {
      clearInterval(this.cycleInterval);
      this.cycleInterval = null;
    }
  }
}