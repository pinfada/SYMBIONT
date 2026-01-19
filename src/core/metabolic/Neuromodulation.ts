/**
 * Neuromodulation Stochastique
 *
 * Implémente un système de neurotransmetteurs virtuels qui influence
 * la "température" du réseau neuronal et varie l'imprévisibilité des réponses.
 *
 * Variables chimiques:
 * - Dopamine: Récompense et motivation (augmente l'exploration)
 * - Adrénaline: Urgence et réactivité (augmente la vitesse de traitement)
 * - Sérotonine: Stabilité et bien-être (régule l'humeur)
 * - Cortisol: Stress (déclenche le mode économie d'énergie)
 */

import { logger } from '@/shared/utils/secureLogger';
import { SecureRandom } from '@/shared/utils/secureRandom';

export interface NeuromodulatorLevels {
  dopamine: number;      // 0-100: Motivation/Exploration
  adrenaline: number;    // 0-100: Urgence/Réactivité
  serotonin: number;     // 0-100: Stabilité/Bien-être
  cortisol: number;      // 0-100: Stress/Économie
}

export interface NeuromodulationConfig {
  baselineDecayRate: number;     // Taux de retour à la normale (0-1)
  stochasticVariance: number;    // Variance aléatoire (0-1)
  feedbackSensitivity: number;   // Sensibilité aux stimuli (0-1)
  minTemperature: number;        // Température minimale du réseau
  maxTemperature: number;        // Température maximale du réseau
}

export interface NetworkTemperature {
  value: number;           // Température actuelle (0-1)
  explorationRate: number; // Taux d'exploration (softmax temperature)
  processingSpeed: number; // Multiplicateur de vitesse
  energyCost: number;      // Coût énergétique multiplié
}

export type NeuromodulationEvent =
  | 'reward'           // Récompense positive (augmente dopamine)
  | 'punishment'       // Feedback négatif (augmente cortisol)
  | 'novelty'          // Nouveauté détectée (augmente adrénaline)
  | 'repetition'       // Pattern répétitif (augmente sérotonine)
  | 'stress'           // Situation stressante (augmente cortisol, adrénaline)
  | 'relaxation'       // Période calme (augmente sérotonine, diminue cortisol)
  | 'success'          // Accomplissement (augmente dopamine, sérotonine)
  | 'failure'          // Échec (augmente cortisol)
  | 'social'           // Interaction sociale (augmente dopamine, sérotonine)
  | 'resource_crisis'; // Crise de ressources (maximise cortisol)

/**
 * Gestionnaire de neuromodulation stochastique
 */
export class NeuromodulationManager {
  private levels: NeuromodulatorLevels;
  private config: NeuromodulationConfig;
  private temperature: NetworkTemperature;
  private eventHistory: Array<{ event: NeuromodulationEvent; timestamp: number }> = [];
  private lastUpdate: number = Date.now();

  // Homeostasis targets (niveaux d'équilibre)
  private readonly homeostasis: NeuromodulatorLevels = {
    dopamine: 50,
    adrenaline: 30,
    serotonin: 60,
    cortisol: 20
  };

  constructor(config?: Partial<NeuromodulationConfig>) {
    this.config = {
      baselineDecayRate: 0.05,
      stochasticVariance: 0.1,
      feedbackSensitivity: 0.5,
      minTemperature: 0.1,
      maxTemperature: 2.0,
      ...config
    };

    this.levels = { ...this.homeostasis };
    this.temperature = this.calculateTemperature();

    logger.info('[Neuromodulation] Initialized', { levels: this.levels });
  }

  /**
   * Met à jour les niveaux de neurotransmetteurs avec décroissance homéostatique
   */
  update(): void {
    const now = Date.now();
    const deltaTime = (now - this.lastUpdate) / 1000; // Secondes
    this.lastUpdate = now;

    // Décroissance vers l'homéostasie avec variance stochastique
    for (const key of Object.keys(this.levels) as (keyof NeuromodulatorLevels)[]) {
      const current = this.levels[key];
      const target = this.homeostasis[key];
      const diff = target - current;

      // Décroissance exponentielle vers la cible
      const decay = diff * this.config.baselineDecayRate * deltaTime;

      // Ajout de bruit stochastique pour éviter les patterns prédictibles
      const noise = (SecureRandom.random() - 0.5) * 2 * this.config.stochasticVariance * deltaTime * 10;

      this.levels[key] = this.clamp(current + decay + noise, 0, 100);
    }

    // Nettoyage de l'historique des événements (garder 5 minutes)
    const cutoff = now - 5 * 60 * 1000;
    this.eventHistory = this.eventHistory.filter(e => e.timestamp > cutoff);

    // Recalculer la température du réseau
    this.temperature = this.calculateTemperature();
  }

  /**
   * Traite un événement de neuromodulation
   */
  processEvent(event: NeuromodulationEvent, intensity: number = 1.0): void {
    const adjustedIntensity = intensity * this.config.feedbackSensitivity;

    this.eventHistory.push({ event, timestamp: Date.now() });

    switch (event) {
      case 'reward':
        this.adjustLevel('dopamine', 15 * adjustedIntensity);
        this.adjustLevel('serotonin', 5 * adjustedIntensity);
        break;

      case 'punishment':
        this.adjustLevel('cortisol', 20 * adjustedIntensity);
        this.adjustLevel('dopamine', -10 * adjustedIntensity);
        break;

      case 'novelty':
        this.adjustLevel('adrenaline', 20 * adjustedIntensity);
        this.adjustLevel('dopamine', 10 * adjustedIntensity);
        break;

      case 'repetition':
        this.adjustLevel('serotonin', 10 * adjustedIntensity);
        this.adjustLevel('adrenaline', -5 * adjustedIntensity);
        break;

      case 'stress':
        this.adjustLevel('cortisol', 25 * adjustedIntensity);
        this.adjustLevel('adrenaline', 15 * adjustedIntensity);
        this.adjustLevel('serotonin', -10 * adjustedIntensity);
        break;

      case 'relaxation':
        this.adjustLevel('serotonin', 15 * adjustedIntensity);
        this.adjustLevel('cortisol', -20 * adjustedIntensity);
        this.adjustLevel('adrenaline', -10 * adjustedIntensity);
        break;

      case 'success':
        this.adjustLevel('dopamine', 20 * adjustedIntensity);
        this.adjustLevel('serotonin', 10 * adjustedIntensity);
        this.adjustLevel('cortisol', -10 * adjustedIntensity);
        break;

      case 'failure':
        this.adjustLevel('cortisol', 15 * adjustedIntensity);
        this.adjustLevel('dopamine', -15 * adjustedIntensity);
        break;

      case 'social':
        this.adjustLevel('dopamine', 12 * adjustedIntensity);
        this.adjustLevel('serotonin', 8 * adjustedIntensity);
        break;

      case 'resource_crisis':
        // Mode économie d'énergie forcé
        this.levels.cortisol = 100;
        this.levels.adrenaline = 80;
        this.levels.dopamine = 10;
        this.levels.serotonin = 20;
        logger.warn('[Neuromodulation] Resource crisis mode activated');
        break;
    }

    this.temperature = this.calculateTemperature();

    logger.info('[Neuromodulation] Event processed', {
      event,
      intensity: adjustedIntensity,
      levels: this.levels,
      temperature: this.temperature.value
    });
  }

  /**
   * Calcule la température du réseau basée sur les niveaux de neurotransmetteurs
   */
  private calculateTemperature(): NetworkTemperature {
    // La température est influencée par le ratio adrénaline+dopamine / cortisol+sérotonine
    const excitatory = (this.levels.dopamine + this.levels.adrenaline) / 200;
    const inhibitory = (this.levels.cortisol + this.levels.serotonin) / 200;

    // Balance excitation/inhibition
    const balance = excitatory - inhibitory * 0.5;

    // Température normalisée avec clamp
    const rawTemp = 0.5 + balance;
    const value = this.clamp(
      rawTemp,
      this.config.minTemperature,
      this.config.maxTemperature
    );

    // Calcul des paramètres dérivés
    const explorationRate = value * (1 + this.levels.dopamine / 100);
    const processingSpeed = 1 + (this.levels.adrenaline / 100) * 0.5;
    const energyCost = value * processingSpeed * (1 - this.levels.cortisol / 200);

    return {
      value,
      explorationRate,
      processingSpeed,
      energyCost
    };
  }

  /**
   * Ajuste un niveau de neurotransmetteur
   */
  private adjustLevel(key: keyof NeuromodulatorLevels, amount: number): void {
    this.levels[key] = this.clamp(this.levels[key] + amount, 0, 100);
  }

  /**
   * Clamp une valeur entre min et max
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Détermine si l'organisme est en mode économie d'énergie
   */
  isInEnergyConservationMode(): boolean {
    return this.levels.cortisol > 70;
  }

  /**
   * Détermine si l'organisme est en mode exploration
   */
  isInExplorationMode(): boolean {
    return this.levels.dopamine > 60 && this.levels.cortisol < 40;
  }

  /**
   * Détermine si l'organisme est en état de stress
   */
  isStressed(): boolean {
    return this.levels.cortisol > 60 && this.levels.serotonin < 40;
  }

  /**
   * Retourne le facteur de réduction d'activité (0-1)
   * Plus le cortisol est élevé, plus l'activité doit être réduite
   */
  getActivityReductionFactor(): number {
    // À cortisol=100, réduction=90%. À cortisol=0, réduction=0%
    return (this.levels.cortisol / 100) * 0.9;
  }

  /**
   * Retourne le multiplicateur de vitesse de traitement
   */
  getProcessingSpeedMultiplier(): number {
    return this.temperature.processingSpeed;
  }

  /**
   * Retourne le coût énergétique relatif des opérations
   */
  getEnergyCostMultiplier(): number {
    return this.temperature.energyCost;
  }

  /**
   * Retourne les niveaux actuels
   */
  getLevels(): NeuromodulatorLevels {
    return { ...this.levels };
  }

  /**
   * Retourne la température actuelle du réseau
   */
  getTemperature(): NetworkTemperature {
    return { ...this.temperature };
  }

  /**
   * Retourne le nombre d'événements récents (5 dernières minutes)
   */
  getRecentEventCount(): number {
    return this.eventHistory.length;
  }

  /**
   * Sérialise l'état pour la persistance
   */
  serialize(): { levels: NeuromodulatorLevels; lastUpdate: number } {
    return {
      levels: { ...this.levels },
      lastUpdate: this.lastUpdate
    };
  }

  /**
   * Restaure l'état depuis la persistance
   */
  deserialize(state: { levels: NeuromodulatorLevels; lastUpdate: number }): void {
    this.levels = { ...state.levels };
    this.lastUpdate = state.lastUpdate;
    this.temperature = this.calculateTemperature();
  }
}

// Export singleton
export const neuromodulation = new NeuromodulationManager();
