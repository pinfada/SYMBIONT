export class HebbieanLearningSystem {
  private weights: Map<string, number> = new Map();
  private activations: Map<string, number> = new Map();
  private lastActive: Map<string, number> = new Map();
  private learningRate: number;
  private inactivityThreshold: number;

  constructor(learningRate = 0.01, inactivityThreshold = 10000) {
    this.learningRate = learningRate;
    this.inactivityThreshold = inactivityThreshold;
  }

  // Renforce la connexion selon la règle de Hebb
  strengthenConnection(preId: string, postId: string, preAct: number, postAct: number): void {
    const key = `${preId}->${postId}`;
    const delta = this.learningRate * preAct * postAct;
    const oldWeight = this.weights.get(key) ?? 0;
    this.weights.set(key, oldWeight + delta);
    this.lastActive.set(key, Date.now());
  }

  // Affaiblit les connexions inactives (anti-Hebbien)
  weakenUnusedConnections(): void {
    const now = Date.now();
    for (const [key, last] of this.lastActive.entries()) {
      if (now - last > this.inactivityThreshold) {
        const oldWeight = this.weights.get(key) ?? 0;
        this.weights.set(key, oldWeight * 0.98); // affaiblissement progressif
      }
    }
  }

  // Met à jour les activations (pour usage ultérieur)
  setActivation(nodeId: string, value: number): void {
    this.activations.set(nodeId, value);
  }

  // Détecte des patterns émergents (ex : connexions très fortes)
  detectEmergentPatterns(): string[] {
    const patterns: string[] = [];
    for (const [key, weight] of this.weights.entries()) {
      if (Math.abs(weight) > 1) patterns.push(key);
    }
    return patterns;
  }

  // Récupère le poids d'une connexion
  getWeight(preId: string, postId: string): number {
    return this.weights.get(`${preId}->${postId}`) ?? 0;
  }

  // Export JSON pour debug
  toJSON() {
    return {
      weights: Array.from(this.weights.entries()),
      activations: Array.from(this.activations.entries()),
      lastActive: Array.from(this.lastActive.entries())
    };
  }
} 