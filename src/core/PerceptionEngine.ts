/**
 * PerceptionEngine - Moteur de perception pour organisme artificiel
 * - Fusionne, filtre et prétraite les signaux sensoriels
 * - Supporte l'ajout de filtres personnalisés (moyenne, seuillage, etc.)
 * - Prêt à être branché sur SensoryNetwork et OrganismCore
 */

export type Feature = Record<string, number>;
export type Filter = (inputs: Feature) => Feature;

export class PerceptionEngine {
  private filters: Filter[] = [];
  private lastFeatures: Feature = {};

  /**
   * Ajoute un filtre de prétraitement (ex : normalisation, seuillage)
   */
  public addFilter(filter: Filter): void {
    this.filters.push(filter);
  }

  /**
   * Traite les entrées sensorielle et extrait les features
   */
  public process(inputs: Feature): Feature {
    let features = { ...inputs };
    for (const filter of this.filters) {
      features = filter(features);
    }
    this.lastFeatures = features;
    return features;
  }

  /**
   * Récupère les dernières features extraites
   */
  public getFeatures(): Feature {
    return { ...this.lastFeatures };
  }

  /**
   * Réinitialise l'état du moteur de perception
   */
  public reset(): void {
    this.lastFeatures = {};
  }

  /**
   * Export JSON pour debug/visualisation
   */
  public toJSON() {
    return {
      filters: this.filters.length,
      lastFeatures: this.lastFeatures
    };
  }
} 