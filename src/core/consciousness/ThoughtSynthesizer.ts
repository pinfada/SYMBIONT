/**
 * ThoughtSynthesizer - Synthèse granulaire de pensées
 * Assemble des pensées cohérentes à partir de vecteurs d'intention
 */

import { ThoughtVector } from './NeuroCore';
import { SecureRandom } from '@shared/utils/secureRandom';
// import { logger } from '@shared/utils/secureLogger'; // Unused for now

// Types de pensées possibles
export enum ThoughtType {
  OBSERVATION = 'observation',
  WARNING = 'warning',
  SUGGESTION = 'suggestion',
  CURIOSITY = 'curiosity',
  EMPATHY = 'empathy',
  HUMOR = 'humor',
  WISDOM = 'wisdom',
  INTUITION = 'intuition',
  DREAM = 'dream'
}

// Pensée structurée
export interface Thought {
  id: string;
  type: ThoughtType;
  content: string | null; // Peut être null pour rester silencieux
  confidence: number;
  particles?: ParticleExpression; // Expression visuelle
  pulse?: PulsePattern | undefined; // Expression rythmique (avec undefined explicite pour TypeScript strict)
  timestamp: number;
}

// Expression en particules
export interface ParticleExpression {
  pattern: 'whisper' | 'burst' | 'spiral' | 'constellation';
  color: { r: number; g: number; b: number; a: number };
  duration: number;
  intensity: number;
}

// Pattern de pulsation
export interface PulsePattern {
  rhythm: number[]; // Intervalles en ms
  color: string;
  intensity: number;
}

export class ThoughtSynthesizer {
  private satietyMemory: Map<string, number>; // Hash -> timestamp
  private thoughtTemplates: Map<ThoughtType, string[]>;
  // private lastThoughtHash: string = ''; // Unused
  private silenceCounter: number = 0;
  private readonly SATIETY_DURATION = 60000; // 1 minute avant de pouvoir répéter

  // ADN et traits de personnalité (valeurs par défaut)
  private dna: string = '';
  private traits = {
    empathy: 0.5,
    curiosity: 0.7,
    aggression: 0.2
  };

  constructor(initialDNA?: string) {
    this.satietyMemory = new Map();
    this.thoughtTemplates = this.initializeTemplates();
    this.startSatietyCleanup();
    // Utiliser l'ADN fourni ou en générer un nouveau
    this.dna = initialDNA || this.generateRandomDNA();
    // Dériver les traits de personnalité de l'ADN
    this.deriveTraitsFromDNA();
  }

  /**
   * Génère un ADN aléatoire pour la personnalité
   */
  private generateRandomDNA(): string {
    let dna = '';
    for (let i = 0; i < 32; i++) {
      dna += Math.floor(SecureRandom.random() * 16).toString(16);
    }
    return dna;
  }

  /**
   * Dérive les traits de personnalité depuis l'ADN
   */
  private deriveTraitsFromDNA(): void {
    // Utiliser différentes sections de l'ADN pour différents traits
    const empathyGenes = this.dna.substring(0, 8);
    const curiosityGenes = this.dna.substring(8, 16);
    const aggressionGenes = this.dna.substring(16, 24);

    // Convertir en valeurs 0-1
    this.traits.empathy = parseInt(empathyGenes, 16) / 0xFFFFFFFF;
    this.traits.curiosity = parseInt(curiosityGenes, 16) / 0xFFFFFFFF;
    this.traits.aggression = parseInt(aggressionGenes, 16) / 0xFFFFFFFF;
  }

  /**
   * Met à jour la personnalité (appelé depuis l'extérieur si nécessaire)
   */
  public setPersonality(dna: string, traits: any): void {
    this.dna = dna;
    this.traits = traits;
  }

  /**
   * Initialise les modèles de base pour chaque type de pensée
   */
  private initializeTemplates(): Map<ThoughtType, string[]> {
    const templates = new Map<ThoughtType, string[]>();

    // Ces templates sont des "graines" qui seront modulées par l'ADN
    templates.set(ThoughtType.OBSERVATION, [
      'patterns_detected',
      'environment_change',
      'activity_noticed'
    ]);

    templates.set(ThoughtType.WARNING, [
      'threat_sensed',
      'energy_drain',
      'privacy_concern'
    ]);

    templates.set(ThoughtType.SUGGESTION, [
      'optimization_possible',
      'alternative_path',
      'resource_discovered'
    ]);

    templates.set(ThoughtType.CURIOSITY, [
      'unknown_territory',
      'interesting_pattern',
      'learning_opportunity'
    ]);

    return templates;
  }

  /**
   * Synthétise une pensée à partir d'un vecteur
   */
  public synthesizeThought(vector: ThoughtVector): Thought | null {
    // Vérifier si le vecteur justifie une expression
    if (!this.shouldExpress(vector)) {
      this.silenceCounter++;
      return this.createSilentThought(vector);
    }

    // Déterminer le type de pensée
    const thoughtType = this.determineThoughtType(vector);

    // Assembler l'intention granulaire
    const intention = this.assembleIntention(vector, thoughtType);

    // Moduler avec l'ADN
    const modulated = this.modulateWithDNA(intention, thoughtType);

    // Vérifier la saturation
    const hash = this.hashThought(modulated);
    if (this.isSaturated(hash)) {
      return this.createSilentThought(vector);
    }

    // Cristalliser la pensée
    const thought = this.crystallize(modulated, thoughtType, vector);

    // Mettre à jour la mémoire
    this.satietyMemory.set(hash, Date.now());
    // this.lastThoughtHash = hash;
    this.silenceCounter = 0;

    return thought;
  }

  /**
   * Détermine si une expression est justifiée
   */
  private shouldExpress(vector: ThoughtVector): boolean {
    // Respecter la préférence pour le silence (80%)
    if (this.silenceCounter < 4 && SecureRandom.random() < 0.8) {
      return false;
    }

    // Seuils selon l'urgence et la charge émotionnelle
    if (vector.urgency > 0.8) return true;
    if (vector.emotionalCharge > 0.7 && vector.novelty > 0.5) return true;
    if (vector.activation < 0.5) return false;

    // Décision stochastique basée sur l'activation
    return SecureRandom.random() < vector.activation * 0.3;
  }

  /**
   * Détermine le type de pensée selon le vecteur
   */
  private determineThoughtType(vector: ThoughtVector): ThoughtType {
    // Analyse des composantes principales du vecteur
    const components = this.decomposeVector(vector.intention);

    // Mapping des composantes aux types
    if (components.threat > 0.6) return ThoughtType.WARNING;
    if (components.discovery > 0.6) return ThoughtType.CURIOSITY;
    if (components.optimization > 0.5) return ThoughtType.SUGGESTION;
    if (components.social > 0.5) return ThoughtType.EMPATHY;
    if (components.pattern > 0.5) return ThoughtType.OBSERVATION;
    if (components.abstract > 0.7) return ThoughtType.DREAM;

    // Par défaut, observation
    return ThoughtType.OBSERVATION;
  }

  /**
   * Décompose le vecteur en composantes sémantiques
   */
  private decomposeVector(intention: Float32Array): {
    threat: number;
    discovery: number;
    optimization: number;
    social: number;
    pattern: number;
    abstract: number;
  } {
    // Analyse par tranches du vecteur 128D
    const components = {
      threat: this.averageSlice(intention, 0, 16),
      discovery: this.averageSlice(intention, 16, 32),
      optimization: this.averageSlice(intention, 32, 48),
      social: this.averageSlice(intention, 48, 64),
      pattern: this.averageSlice(intention, 64, 80),
      abstract: this.averageSlice(intention, 80, 128)
    };

    // Normalisation
    const max = Math.max(...Object.values(components));
    const keys = Object.keys(components) as (keyof typeof components)[];
    for (const key of keys) {
      components[key] = components[key] / max;
    }

    return components;
  }

  /**
   * Calcule la moyenne d'une tranche du vecteur
   */
  private averageSlice(vector: Float32Array, start: number, end: number): number {
    let sum = 0;
    for (let i = start; i < end && i < vector.length; i++) {
      sum += Math.abs(vector[i]);
    }
    return sum / (end - start);
  }

  /**
   * Assemble l'intention granulaire
   */
  private assembleIntention(vector: ThoughtVector, type: ThoughtType): string {
    const templates = this.thoughtTemplates.get(type) || ['default'];

    // Sélection stochastique du template
    const templateIndex = Math.floor(SecureRandom.random() * templates.length);
    const baseTemplate = templates[templateIndex];

    // Enrichissement contextuel
    const context = this.gatherContext();

    // Construction granulaire
    let intention = baseTemplate;
    if (context.pageType) {
      intention = `${context.pageType}_${intention}`;
    }
    if (vector.emotionalCharge > 0.6) {
      intention = `emotional_${intention}`;
    }
    if (vector.novelty > 0.7) {
      intention = `novel_${intention}`;
    }

    return intention;
  }

  /**
   * Module l'intention avec l'ADN de l'organisme
   */
  private modulateWithDNA(intention: string, type: ThoughtType): string {
    const dna = this.dna;
    const traits = this.traits;

    // Extraction des gènes pertinents
    const empathyGene = parseInt(dna.substring(8, 10), 16) / 255;
    const curiosityGene = parseInt(dna.substring(16, 18), 16) / 255;
    // const cautionGene = parseInt(dna.substring(24, 26), 16) / 255; // Unused

    // Modulation selon la personnalité
    let modulated = intention;

    if (traits.empathy > 0.7 && type === ThoughtType.WARNING) {
      modulated = `gentle_${modulated}`;
    }
    if (traits.curiosity > 0.8 && type === ThoughtType.OBSERVATION) {
      modulated = `excited_${modulated}`;
    }
    if (traits.aggression < 0.3) {
      modulated = modulated.replace('threat', 'concern');
    }

    // Ajout de variation génétique
    const variation = Math.floor((empathyGene + curiosityGene) * 10);
    modulated = `v${variation}_${modulated}`;

    return modulated;
  }

  /**
   * Cristallise la pensée finale
   */
  private crystallize(
    intention: string,
    type: ThoughtType,
    vector: ThoughtVector
  ): Thought {
    // Décision : verbaliser ou rester visuel
    const shouldVerbalize = vector.urgency > 0.7 ||
                           (vector.emotionalCharge > 0.6 && SecureRandom.random() < 0.3);

    let content: string | null = null;

    if (shouldVerbalize) {
      // Traduction en langage naturel (simplifié pour l'instant)
      content = this.translateToNaturalLanguage(intention, type, vector);
    }

    // Expression visuelle
    const particles = this.generateParticleExpression(vector, type);
    const pulse = this.generatePulsePattern(vector, type);

    return {
      id: `thought_${Date.now()}_${SecureRandom.random().toString(36).substr(2, 9)}`,
      type,
      content,
      confidence: vector.coherence * vector.activation,
      particles,
      pulse,
      timestamp: Date.now()
    };
  }

  /**
   * Traduit l'intention en langage naturel
   */
  private translateToNaturalLanguage(
    intention: string,
    type: ThoughtType,
    vector: ThoughtVector
  ): string {
    // Dictionnaire de traduction simplifiée
    const translations: { [key: string]: string[] } = {
      'patterns_detected': [
        'Je remarque un pattern intéressant...',
        'Il y a quelque chose de familier ici.',
        'Ces éléments forment un motif.'
      ],
      'threat_sensed': [
        'Attention, quelque chose ne va pas.',
        'Je détecte un risque potentiel.',
        'Sois prudent ici.'
      ],
      'learning_opportunity': [
        'Oh! Je peux apprendre quelque chose ici.',
        'Voilà qui est enrichissant.',
        'Mon réseau neuronal s\'excite!'
      ],
      'emotional_patterns_detected': [
        'Je ressens quelque chose d\'intense ici.',
        'Cette page éveille des émotions.',
        'L\'atmosphère est chargée.'
      ]
    };

    // Chercher une traduction
    for (const [key, values] of Object.entries(translations)) {
      if (intention.includes(key)) {
        const index = Math.floor(SecureRandom.random() * values.length);
        return values[index];
      }
    }

    // Traduction par défaut selon le type
    const defaultTranslations: { [key in ThoughtType]: string } = {
      [ThoughtType.OBSERVATION]: '...',
      [ThoughtType.WARNING]: '!',
      [ThoughtType.SUGGESTION]: '?',
      [ThoughtType.CURIOSITY]: '..?',
      [ThoughtType.EMPATHY]: '♥',
      [ThoughtType.HUMOR]: ':)',
      [ThoughtType.WISDOM]: '∞',
      [ThoughtType.INTUITION]: '~',
      [ThoughtType.DREAM]: '☁'
    };

    return defaultTranslations[type];
  }

  /**
   * Génère une expression en particules
   */
  private generateParticleExpression(
    vector: ThoughtVector,
    type: ThoughtType
  ): ParticleExpression {
    // Pattern selon le type de pensée
    const patterns: { [key in ThoughtType]: ParticleExpression['pattern'] } = {
      [ThoughtType.OBSERVATION]: 'constellation',
      [ThoughtType.WARNING]: 'burst',
      [ThoughtType.SUGGESTION]: 'spiral',
      [ThoughtType.CURIOSITY]: 'whisper',
      [ThoughtType.EMPATHY]: 'constellation',
      [ThoughtType.HUMOR]: 'burst',
      [ThoughtType.WISDOM]: 'spiral',
      [ThoughtType.INTUITION]: 'whisper',
      [ThoughtType.DREAM]: 'constellation'
    };

    // Couleur selon l'émotion
    const hue = vector.emotionalCharge * 360;
    const saturation = 50 + vector.activation * 50;
    const lightness = 30 + vector.coherence * 40;

    const [r, g, b] = this.hslToRgb(hue / 360, saturation / 100, lightness / 100);

    return {
      pattern: patterns[type],
      color: { r, g, b, a: 0.8 },
      duration: 2000 + vector.novelty * 3000, // 2-5 secondes
      intensity: vector.activation
    };
  }

  /**
   * Génère un pattern de pulsation
   */
  private generatePulsePattern(
    vector: ThoughtVector,
    type: ThoughtType
  ): PulsePattern | undefined {
    // Pulsation seulement pour les pensées urgentes
    if (vector.urgency < 0.6) return undefined;

    // Rythme selon le type
    const rhythms: { [key in ThoughtType]: number[] } = {
      [ThoughtType.WARNING]: [100, 100, 200], // Rapide
      [ThoughtType.SUGGESTION]: [300, 300, 300], // Régulier
      [ThoughtType.OBSERVATION]: [500, 200, 500, 200], // Varié
      [ThoughtType.CURIOSITY]: [200, 400, 200], // Curieux
      [ThoughtType.EMPATHY]: [400, 400], // Calme
      [ThoughtType.HUMOR]: [150, 150, 150, 300], // Joueur
      [ThoughtType.WISDOM]: [600, 600], // Lent
      [ThoughtType.INTUITION]: [250, 250, 500], // Mystérieux
      [ThoughtType.DREAM]: [800, 400, 800] // Onirique
    };

    return {
      rhythm: rhythms[type],
      color: vector.urgency > 0.8 ? '#ff4444' : '#00e0ff',
      intensity: vector.urgency
    };
  }

  /**
   * Crée une pensée silencieuse (visuelle uniquement)
   */
  private createSilentThought(vector: ThoughtVector): Thought | null {
    // Même silencieux, peut s'exprimer visuellement si fort
    if (vector.emotionalCharge < 0.3) return null;

    return {
      id: `silent_${Date.now()}`,
      type: ThoughtType.OBSERVATION,
      content: null,
      confidence: vector.coherence,
      particles: {
        pattern: 'whisper',
        color: { r: 0, g: 224, b: 255, a: 0.3 },
        duration: 1000,
        intensity: 0.3
      },
      timestamp: Date.now()
    };
  }

  /**
   * Vérifie la saturation (anti-répétition)
   */
  private isSaturated(hash: string): boolean {
    const lastTime = this.satietyMemory.get(hash);
    if (!lastTime) return false;

    return Date.now() - lastTime < this.SATIETY_DURATION;
  }

  /**
   * Hash simple pour identifier les pensées similaires
   */
  private hashThought(intention: string): string {
    // Hash basique pour l'anti-répétition
    let hash = 0;
    for (let i = 0; i < intention.length; i++) {
      hash = ((hash << 5) - hash) + intention.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Récupère le contexte actuel
   */
  private gatherContext(): any {
    return {
      pageType: document.location.hostname.split('.')[0],
      timeOfDay: new Date().getHours(),
      userActive: document.hasFocus()
    };
  }

  /**
   * Convertit HSL en RGB
   */
  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  /**
   * Nettoyage périodique de la mémoire de saturation
   */
  private startSatietyCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [hash, timestamp] of this.satietyMemory.entries()) {
        if (now - timestamp > this.SATIETY_DURATION) {
          this.satietyMemory.delete(hash);
        }
      }
    }, 30000); // Nettoyage toutes les 30 secondes
  }
}