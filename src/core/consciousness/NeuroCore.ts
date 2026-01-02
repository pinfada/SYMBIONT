/**
 * NeuroCore - Moteur de conscience biologique stochastique
 * Système nerveux central de l'organisme SYMBIONT
 */

import { SecureRandom } from '@shared/utils/secureRandom';
import { logger } from '@shared/utils/secureLogger';

// Configuration de la chimie neuronale
export interface NeuroChemistry {
  adrenaline: number;    // 0-1 : Stress/Urgence (trackers, popups)
  dopamine: number;      // 0-1 : Récompense/Plaisir (apprentissage, découverte)
  serotonin: number;     // 0-1 : Calme/Bien-être (sites familiers)
  cortisol: number;      // 0-1 : Fatigue/Épuisement (surcharge cognitive)
  oxytocin: number;      // 0-1 : Connection sociale (interactions P2P)
  gaba: number;          // 0-1 : Inhibition/Contrôle (régulation)
  acetylcholine: number; // 0-1 : Attention/Focus (concentration)
  melatonin: number;     // 0-1 : Somnolence (inactivité prolongée)
}

// État sensoriel du navigateur
export interface BrowserSensors {
  adTrackers: number;
  popups: number;
  openTabs: number;
  cpuUsage: number;
  memoryUsage: number;
  networkLatency: number;
  pageComplexity: number;
  scrollVelocity: number;
  clickFrequency: number;
  timeOnPage: number;
  isDarkMode: boolean;
  hasAdblocker: boolean;
  extensionCount: number;
}

// Vecteur de pensée multidimensionnel
export interface ThoughtVector {
  intention: Float32Array;      // Vecteur d'intention 128D
  activation: number;           // Force d'activation (0-1)
  coherence: number;           // Cohérence avec la personnalité
  novelty: number;             // Nouveauté par rapport aux pensées récentes
  urgency: number;             // Urgence de communication
  emotionalCharge: number;     // Charge émotionnelle
}

// Potentiel d'action neuronal
interface ActionPotential {
  neuronId: string;
  voltage: number;
  threshold: number;
  refractory: boolean;
  lastFired: number;
}

export class NeuroCore {
  private chemistry: NeuroChemistry;
  private temperature: number = 0.7; // Température softmax (créativité vs focus)
  private firingThreshold: number = 0.65; // Seuil d'activation pour générer une pensée
  private actionPotentials: Map<string, ActionPotential>;
  private satietyMemory: Set<string>; // Anti-répétition
  private thoughtHistory: ThoughtVector[];
  private lastThoughtTime: number = 0;
  private silenceDuration: number = 0;

  // Personnalité de l'organisme
  private personality = {
    empathy: 0.5,
    curiosity: 0.7,
    creativity: 0.6,
    introversion: 0.4
  };

  // Constantes biologiques
  private readonly SILENCE_PREFERENCE = 0.8; // 80% du temps en silence
  private readonly REFRACTORY_PERIOD = 5000; // 5s minimum entre pensées
  private readonly SATIETY_WINDOW = 20; // Fenêtre de mémoire anti-répétition
  private readonly PERLIN_OCTAVES = 4; // Complexité du bruit organique

  constructor(initialChemistry?: Partial<NeuroChemistry>) {
    this.chemistry = initialChemistry
      ? { ...this.getBaselineChemistry(), ...initialChemistry }
      : this.getBaselineChemistry();
    this.actionPotentials = new Map();
    this.satietyMemory = new Set();
    this.thoughtHistory = [];
    this.initializeNeurons();
  }

  /**
   * Initialise le réseau de neurones
   */
  private initializeNeurons(): void {
    const neuronTypes = [
      'observation', 'warning', 'suggestion', 'curiosity',
      'empathy', 'humor', 'wisdom', 'intuition'
    ];

    for (const type of neuronTypes) {
      this.actionPotentials.set(type, {
        neuronId: type,
        voltage: 0,
        threshold: 0.5 + SecureRandom.random() * 0.3,
        refractory: false,
        lastFired: 0
      });
    }
  }

  /**
   * État chimique de base (repos)
   */
  private getBaselineChemistry(): NeuroChemistry {
    return {
      adrenaline: 0.1,
      dopamine: 0.3,
      serotonin: 0.4,
      cortisol: 0.2,
      oxytocin: 0.2,
      gaba: 0.5,
      acetylcholine: 0.4,
      melatonin: 0.1
    };
  }

  /**
   * Traite les inputs sensoriels et met à jour la chimie
   */
  public processSensoryInput(sensors: BrowserSensors): void {
    // Calcul du stress (adrenaline + cortisol)
    const stressFactors =
      sensors.adTrackers * 0.15 +
      sensors.popups * 0.25 +
      sensors.openTabs * 0.05 +
      sensors.cpuUsage * 0.1 +
      sensors.networkLatency * 0.1;

    this.chemistry.adrenaline = this.sigmoid(stressFactors);
    this.chemistry.cortisol = this.sigmoid(sensors.memoryUsage * 0.3 + sensors.openTabs * 0.1);

    // Calcul de la récompense (dopamine)
    const rewardFactors =
      sensors.pageComplexity * 0.2 + // Contenu riche
      (sensors.timeOnPage > 60 ? 0.3 : 0) + // Engagement prolongé
      (sensors.scrollVelocity < 0.3 ? 0.2 : 0); // Lecture attentive

    this.chemistry.dopamine = this.sigmoid(rewardFactors);

    // Calcul du bien-être (serotonin)
    const comfortFactors =
      (sensors.isDarkMode ? 0.2 : 0) +
      (sensors.hasAdblocker ? 0.3 : 0) +
      (sensors.openTabs < 10 ? 0.2 : 0);

    this.chemistry.serotonin = this.sigmoid(comfortFactors);

    // Focus (acetylcholine)
    this.chemistry.acetylcholine = this.sigmoid(
      1 / (1 + sensors.openTabs * 0.1) * (1 - sensors.scrollVelocity)
    );

    // Somnolence (melatonin) - augmente avec l'inactivité
    const inactivityFactor = Math.min(sensors.timeOnPage / 300, 1); // Max après 5min
    this.chemistry.melatonin = this.sigmoid(
      inactivityFactor * (1 - sensors.clickFrequency)
    );

    // Régulation GABAergique (équilibre)
    this.chemistry.gaba = this.sigmoid(
      0.5 + (this.chemistry.serotonin - this.chemistry.adrenaline) * 0.3
    );

    // Ajuster la température selon l'état chimique
    this.updateTemperature();
  }

  /**
   * Met à jour la température selon l'état chimique
   * T élevée = créatif/erratique, T basse = focalisé/logique
   */
  private updateTemperature(): void {
    // Facteurs qui augmentent la température (créativité)
    const creativityFactors =
      this.chemistry.dopamine * 0.3 +
      this.chemistry.melatonin * 0.4 + // Rêverie
      (1 - this.chemistry.acetylcholine) * 0.2; // Manque de focus

    // Facteurs qui diminuent la température (focus)
    const focusFactors =
      this.chemistry.acetylcholine * 0.4 +
      this.chemistry.adrenaline * 0.2 + // Urgence = précision
      this.chemistry.gaba * 0.2; // Contrôle

    // Calcul avec biais vers 0.7
    this.temperature = 0.7 + (creativityFactors - focusFactors) * 0.3;
    this.temperature = Math.max(0.3, Math.min(1.2, this.temperature));
  }

  /**
   * Sélection stochastique d'action via softmax
   */
  public selectAction(potentials: Map<string, number>): string | null {
    if (potentials.size === 0) return null;

    const actions = Array.from(potentials.entries());
    const weights = actions.map(([_, weight]) => weight);

    // Application du softmax avec température
    const expWeights = weights.map(w => Math.exp(w / this.temperature));
    const sumExp = expWeights.reduce((a, b) => a + b, 0);
    const probabilities = expWeights.map(e => e / sumExp);

    // Sélection stochastique
    const random = SecureRandom.random();
    let cumulative = 0;

    for (let i = 0; i < actions.length; i++) {
      cumulative += probabilities[i];
      if (random < cumulative) {
        return actions[i][0];
      }
    }

    return actions[actions.length - 1][0];
  }

  /**
   * Génère un vecteur de pensée si les conditions sont réunies
   */
  public generateThoughtVector(): ThoughtVector | null {
    const now = Date.now();
    const timeSinceLastThought = now - this.lastThoughtTime;

    // Respecter la période réfractaire
    if (timeSinceLastThought < this.REFRACTORY_PERIOD) {
      this.silenceDuration += timeSinceLastThought;
      return null;
    }

    // Calculer l'activation globale
    const globalActivation = this.calculateGlobalActivation();

    // Appliquer le seuil d'activation avec préférence pour le silence
    const silenceRatio = this.silenceDuration / (this.silenceDuration + timeSinceLastThought);
    const adjustedThreshold = this.firingThreshold * (1 + silenceRatio * this.SILENCE_PREFERENCE);

    if (globalActivation < adjustedThreshold) {
      this.silenceDuration += timeSinceLastThought;
      return null;
    }

    // Générer le vecteur d'intention
    const intention = this.generateIntentionVector();

    // Calculer la nouveauté
    const novelty = this.calculateNovelty(intention);

    // Vérifier la saturation
    if (novelty < 0.3) {
      this.silenceDuration += timeSinceLastThought;
      return null; // Trop similaire aux pensées récentes
    }

    // Créer le vecteur de pensée
    const thoughtVector: ThoughtVector = {
      intention,
      activation: globalActivation,
      coherence: this.calculateCoherence(intention),
      novelty,
      urgency: this.calculateUrgency(),
      emotionalCharge: this.calculateEmotionalCharge()
    };

    // Mettre à jour l'historique
    this.thoughtHistory.push(thoughtVector);
    if (this.thoughtHistory.length > this.SATIETY_WINDOW) {
      this.thoughtHistory.shift();
    }

    this.lastThoughtTime = now;
    this.silenceDuration = 0;

    return thoughtVector;
  }

  /**
   * Calcule l'activation neuronale globale
   */
  private calculateGlobalActivation(): number {
    let totalActivation = 0;
    let activeNeurons = 0;

    for (const [_, potential] of this.actionPotentials) {
      if (!potential.refractory) {
        // Stimulation basée sur la chimie
        const stimulation =
          this.chemistry.adrenaline * 0.3 +
          this.chemistry.dopamine * 0.2 +
          this.chemistry.acetylcholine * 0.2 +
          (1 - this.chemistry.melatonin) * 0.1;

        potential.voltage += stimulation * this.addPerlinNoise();

        if (potential.voltage > potential.threshold) {
          totalActivation += potential.voltage;
          activeNeurons++;

          // Décharge et période réfractaire
          potential.voltage = 0;
          potential.refractory = true;
          potential.lastFired = Date.now();

          // Réinitialisation après période réfractaire
          setTimeout(() => {
            potential.refractory = false;
          }, this.REFRACTORY_PERIOD);
        }
      }
    }

    return activeNeurons > 0 ? totalActivation / activeNeurons : 0;
  }

  /**
   * Génère un vecteur d'intention 128D
   */
  private generateIntentionVector(): Float32Array {
    const vector = new Float32Array(128);

    for (let i = 0; i < 128; i++) {
      // Base: chimie neuronale
      let value =
        this.chemistry.adrenaline * Math.sin(i * 0.1) +
        this.chemistry.dopamine * Math.cos(i * 0.15) +
        this.chemistry.serotonin * Math.sin(i * 0.2) +
        this.chemistry.oxytocin * Math.cos(i * 0.25);

      // Ajouter du bruit organique
      value += this.addPerlinNoise() * 0.3;

      // Normalisation
      vector[i] = Math.tanh(value);
    }

    return vector;
  }

  /**
   * Calcule la nouveauté par rapport aux pensées récentes
   */
  private calculateNovelty(intention: Float32Array): number {
    if (this.thoughtHistory.length === 0) return 1;

    let maxSimilarity = 0;

    for (const thought of this.thoughtHistory) {
      const similarity = this.cosineSimilarity(intention, thought.intention);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }

    return 1 - maxSimilarity;
  }

  /**
   * Calcule la cohérence avec la personnalité
   */
  private calculateCoherence(intention: Float32Array): number {
    // Basé sur la stabilité chimique
    const chemicalVariance =
      Math.abs(this.chemistry.adrenaline - 0.5) +
      Math.abs(this.chemistry.dopamine - 0.5) +
      Math.abs(this.chemistry.serotonin - 0.5);

    // Intégrer l'influence de la personnalité
    const personalityAlignment =
      this.personality.empathy * this.chemistry.oxytocin +
      this.personality.curiosity * this.chemistry.dopamine +
      this.personality.creativity * (1 - this.chemistry.gaba) +
      this.personality.introversion * (1 - this.chemistry.adrenaline);

    return (1 / (1 + chemicalVariance)) * 0.7 + personalityAlignment * 0.3;
  }

  /**
   * Calcule l'urgence de communication
   */
  private calculateUrgency(): number {
    return this.chemistry.adrenaline * 0.6 +
           this.chemistry.cortisol * 0.4;
  }

  /**
   * Calcule la charge émotionnelle
   */
  private calculateEmotionalCharge(): number {
    return Math.max(
      this.chemistry.adrenaline,
      this.chemistry.dopamine,
      this.chemistry.oxytocin,
      1 - this.chemistry.serotonin // Anxiété
    );
  }

  /**
   * Fonction sigmoïde pour normalisation
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Similarité cosinus entre deux vecteurs
   */
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Génère du bruit de Perlin pour l'aspect organique
   */
  private addPerlinNoise(): number {
    // Implémentation simplifiée du bruit de Perlin
    const time = Date.now() * 0.001;
    let noise = 0;
    let amplitude = 1;
    let frequency = 1;

    for (let i = 0; i < this.PERLIN_OCTAVES; i++) {
      noise += Math.sin(time * frequency) * amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return noise / this.PERLIN_OCTAVES;
  }

  /**
   * Obtient l'état chimique actuel
   */
  public getChemistry(): NeuroChemistry {
    return { ...this.chemistry };
  }

  /**
   * Obtient la température actuelle
   */
  public getTemperature(): number {
    return this.temperature;
  }

  /**
   * Injecte des phéromones d'un autre organisme (P2P)
   */
  public absorbPheromones(auraVector: Float32Array): void {
    // Influence subtile sur la chimie
    const influence = 0.1; // 10% d'influence max

    // Décodage du vecteur d'aura en modifications chimiques
    if (auraVector.length >= 8) {
      this.chemistry.adrenaline = this.chemistry.adrenaline * (1 - influence) + auraVector[0] * influence;
      this.chemistry.dopamine = this.chemistry.dopamine * (1 - influence) + auraVector[1] * influence;
      this.chemistry.serotonin = this.chemistry.serotonin * (1 - influence) + auraVector[2] * influence;
      this.chemistry.oxytocin = this.chemistry.oxytocin * (1 - influence) + auraVector[4] * influence;

      logger.info('Phéromones absorbées, chimie ajustée');
    }
  }

  /**
   * Génère un vecteur d'aura pour partage P2P
   */
  public generateAuraVector(): Float32Array {
    const aura = new Float32Array(8);
    aura[0] = this.chemistry.adrenaline;
    aura[1] = this.chemistry.dopamine;
    aura[2] = this.chemistry.serotonin;
    aura[3] = this.chemistry.cortisol;
    aura[4] = this.chemistry.oxytocin;
    aura[5] = this.chemistry.gaba;
    aura[6] = this.chemistry.acetylcholine;
    aura[7] = this.chemistry.melatonin;
    return aura;
  }

  /**
   * Définit la personnalité de l'organisme
   */
  public setPersonality(personality: typeof this.personality): void {
    this.personality = { ...personality };

    // Ajuster le seuil d'activation selon l'introversion
    this.firingThreshold = 0.65 + (this.personality.introversion * 0.2);

    // Ajuster la température selon la créativité
    this.temperature = 0.7 + (this.personality.creativity - 0.5) * 0.4;

    logger.info('Personality updated', this.personality);
  }

  /**
   * Obtient la personnalité actuelle
   */
  public getPersonality(): typeof this.personality {
    return { ...this.personality };
  }
}