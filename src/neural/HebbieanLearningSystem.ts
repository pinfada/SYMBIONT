import { BehaviorPattern } from '../shared/types/organism';

export interface LearningResult {
  strengthenedConnections: number;
  weakenedConnections: number;
  newPatterns: string[];
  confidence: number;
}

export class HebbieanLearningSystem {
  private connections: Map<string, Map<string, number>> = new Map();
  private activationHistory: Map<string, number[]> = new Map();
  private learningRate: number = 0.01;
  private decayRate: number = 0.001;
  
  // Nouvelles propriétés pour la compatibilité avec les tests
  private weights: Map<string, number> = new Map();
  private activations: Map<string, number> = new Map();
  private lastActive: Map<string, number> = new Map();
  private inactivityThreshold: number;

  constructor(learningRate: number = 0.01, inactivityThreshold: number = 0.001) {
    this.learningRate = learningRate;
    this.decayRate = inactivityThreshold;
    this.inactivityThreshold = inactivityThreshold;
  }

  /**
   * Renforce une connexion entre deux neurones (pour compatibilité tests)
   */
  strengthenConnection(preId: string, postId: string, preAct: number, postAct: number): void {
    const key = `${preId}->${postId}`;
    const currentWeight = this.weights.get(key) || 0;
    const deltaWeight = this.learningRate * preAct * postAct;
    this.weights.set(key, currentWeight + deltaWeight);
    
    // Aussi mettre à jour dans le système principal
    if (!this.connections.has(preId)) {
      this.connections.set(preId, new Map());
    }
    this.connections.get(preId)!.set(postId, currentWeight + deltaWeight);
    
    this.lastActive.set(preId, Date.now());
    this.lastActive.set(postId, Date.now());
  }

  /**
   * Affaiblit les connexions inutilisées (pour compatibilité tests)
   */
  weakenUnusedConnections(): void {
    const now = Date.now();
    for (const [key, weight] of this.weights) {
      const [preId] = key.split('->');
      const lastActiveTime = this.lastActive.get(preId) || 0;
      
      if (now - lastActiveTime > this.inactivityThreshold * 1000) {
        this.weights.set(key, Math.max(0, weight - this.decayRate));
      }
    }
  }

  /**
   * Définit l'activation d'un neurone (pour compatibilité tests)
   */
  setActivation(nodeId: string, value: number): void {
    this.activations.set(nodeId, value);
    this.lastActive.set(nodeId, Date.now());
  }

  /**
   * Détecte les patterns émergents (pour compatibilité tests)
   */
  detectEmergentPatterns(): string[] {
    const patterns: string[] = [];
    
    // Analyser les connexions fortes
    for (const [key, weight] of this.weights) {
      if (weight > 0.5) { // Seuil pour considérer une connexion comme "forte"
        patterns.push(`strong_connection_${key}`);
      }
    }
    
    // Analyser les clusters d'activation
    const activeNodes = Array.from(this.activations.entries())
      .filter(([_, activation]) => activation > 0.3)
      .map(([nodeId]) => nodeId);
    
    if (activeNodes.length > 2) {
      patterns.push(`cluster_${activeNodes.slice(0, 3).join('_')}`);
    }
    
    return patterns;
  }

  /**
   * Récupère le poids d'une connexion (pour compatibilité tests)
   */
  getWeight(preId: string, postId: string): number {
    const key = `${preId}->${postId}`;
    return this.weights.get(key) || 0;
  }

  /**
   * Sérialise l'état du système (pour compatibilité tests)
   */
  toJSON(): { weights: [string, number][]; activations: [string, number][]; lastActive: [string, number][] } {
    return {
      weights: Array.from(this.weights.entries()),
      activations: Array.from(this.activations.entries()),
      lastActive: Array.from(this.lastActive.entries())
    };
  }

  /**
   * Met à jour les poids des connexions basé sur les patterns comportementaux
   */
  async updateWeights(behaviorData: BehaviorPattern[]): Promise<LearningResult> {
    let strengthened = 0;
    let weakened = 0;
    const newPatterns: string[] = [];

    for (const pattern of behaviorData) {
      // Convertir le pattern en activation neuronale
      const activation = this.patternToActivation(pattern);
      
      // Appliquer la règle de Hebb : "neurons that fire together, wire together"
      for (const [neuronA, activationA] of activation) {
        for (const [neuronB, activationB] of activation) {
          if (neuronA !== neuronB) {
            const weight = this.getConnectionWeight(neuronA, neuronB);
            const deltaWeight = this.learningRate * activationA * activationB;
            
            // Mettre à jour le poids
            const newWeight = weight + deltaWeight - this.decayRate;
            this.setConnectionWeight(neuronA, neuronB, Math.max(0, newWeight));
            
            if (deltaWeight > 0) strengthened++;
            else if (deltaWeight < 0) weakened++;
          }
        }
      }

      // Détecter de nouveaux patterns
      const patternSignature = this.generatePatternSignature(pattern);
      if (!this.hasSeenPattern(patternSignature)) {
        newPatterns.push(patternSignature);
        this.recordPattern(patternSignature);
      }
    }

    // Calculer la confiance basée sur la cohérence des patterns
    const confidence = this.calculateConfidence(behaviorData);

    return {
      strengthenedConnections: strengthened,
      weakenedConnections: weakened,
      newPatterns,
      confidence
    };
  }

  /**
   * Convertit un pattern comportemental en activation neuronale
   */
  private patternToActivation(pattern: BehaviorPattern): Map<string, number> {
    const activation = new Map<string, number>();

    // Mapper les aspects du pattern à des "neurones"
    activation.set('time_neuron', Math.min(1, pattern.timeSpent / 60000)); // Normaliser le temps
    activation.set('interaction_neuron', Math.min(1, pattern.interactions * 0.1));
    activation.set('scroll_neuron', Math.min(1, pattern.scrollDepth));
    
    // Neurones basés sur l'URL (domaine)
    const domain = this.extractDomain(pattern.url);
    activation.set(`domain_${domain}`, 1);

    // Neurones temporels (heure de la journée)
    const hour = new Date(pattern.timestamp).getHours();
    activation.set(`hour_${hour}`, 1);

    return activation;
  }

  /**
   * Récupère le poids d'une connexion
   */
  private getConnectionWeight(neuronA: string, neuronB: string): number {
    const connectionsA = this.connections.get(neuronA);
    if (!connectionsA) return 0;
    return connectionsA.get(neuronB) || 0;
  }

  /**
   * Définit le poids d'une connexion
   */
  private setConnectionWeight(neuronA: string, neuronB: string, weight: number): void {
    if (!this.connections.has(neuronA)) {
      this.connections.set(neuronA, new Map());
    }
    this.connections.get(neuronA)!.set(neuronB, weight);
  }

  /**
   * Génère une signature unique pour un pattern
   */
  private generatePatternSignature(pattern: BehaviorPattern): string {
    const domain = this.extractDomain(pattern.url);
    const timeCategory = this.categorizeTime(pattern.timeSpent);
    const interactionLevel = this.categorizeInteractions(pattern.interactions);
    
    return `${domain}_${timeCategory}_${interactionLevel}`;
  }

  /**
   * Vérifie si un pattern a déjà été observé
   */
  private hasSeenPattern(signature: string): boolean {
    return this.activationHistory.has(signature);
  }

  /**
   * Enregistre un nouveau pattern
   */
  private recordPattern(signature: string): void {
    this.activationHistory.set(signature, [Date.now()]);
  }

  /**
   * Calcule la confiance basée sur la cohérence des patterns
   */
  private calculateConfidence(patterns: BehaviorPattern[]): number {
    if (patterns.length === 0) return 0;

    // Analyser la variabilité des patterns
    const domains = new Set(patterns.map(p => this.extractDomain(p.url)));
    const avgTimeSpent = patterns.reduce((sum, p) => sum + p.timeSpent, 0) / patterns.length;
    const timeVariance = patterns.reduce((sum, p) => sum + Math.pow(p.timeSpent - avgTimeSpent, 2), 0) / patterns.length;

    // Plus de domaines = moins de confiance dans un pattern spécifique
    const domainDiversity = domains.size / patterns.length;
    
    // Moins de variance dans le temps = plus de confiance
    const timeConsistency = 1 / (1 + timeVariance / 10000);

    return Math.min(1, timeConsistency * (1 - domainDiversity * 0.5));
  }

  /**
   * Extrait le domaine d'une URL
   */
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  /**
   * Catégorise le temps passé
   */
  private categorizeTime(timeSpent: number): string {
    if (timeSpent < 5000) return 'quick';
    if (timeSpent < 30000) return 'medium';
    if (timeSpent < 120000) return 'long';
    return 'extended';
  }

  /**
   * Catégorise le niveau d'interaction
   */
  private categorizeInteractions(interactions: number): string {
    if (interactions === 0) return 'passive';
    if (interactions < 5) return 'low';
    if (interactions < 15) return 'medium';
    return 'high';
  }

  /**
   * Obtient les connexions les plus fortes
   */
  getStrongestConnections(limit: number = 10): Array<{from: string, to: string, weight: number}> {
    const allConnections: Array<{from: string, to: string, weight: number}> = [];
    
    for (const [from, connections] of this.connections) {
      for (const [to, weight] of connections) {
        allConnections.push({ from, to, weight });
      }
    }

    return allConnections
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limit);
  }

  /**
   * Réinitialise le système d'apprentissage
   */
  reset(): void {
    this.connections.clear();
    this.activationHistory.clear();
  }
} 