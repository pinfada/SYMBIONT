/**
 * NavigationCortex - Analyseur de navigation et de patterns temporels
 * - Enregistre les événements de navigation (URL, timestamp, action)
 * - Détecte patterns de routine, exploration, répétition
 * - Supporte l'ajout de détecteurs personnalisés
 */

export interface NavigationEvent {
  url: string;
  timestamp: number;
  action: 'visit' | 'click' | 'scroll' | 'input' | 'custom';
}

export interface Pattern {
  type: string;
  score: number;
  details?: any;
}

export type PatternDetector = (events: NavigationEvent[]) => Pattern[];

export class NavigationCortex {
  private events: NavigationEvent[] = [];
  private detectors: PatternDetector[] = [];
  private lastPatterns: Pattern[] = [];

  /**
   * Enregistre un événement de navigation
   */
  public recordEvent(event: NavigationEvent): void {
    this.events.push(event);
  }

  /**
   * Ajoute un détecteur de pattern personnalisé
   */
  public addDetector(detector: PatternDetector): void {
    this.detectors.push(detector);
  }

  /**
   * Analyse les événements et retourne les patterns détectés
   */
  public getPatterns(): Pattern[] {
    let patterns: Pattern[] = [];
    for (const detector of this.detectors) {
      patterns = patterns.concat(detector(this.events));
    }
    this.lastPatterns = patterns;
    return patterns;
  }

  /**
   * Réinitialise l'historique de navigation
   */
  public reset(): void {
    this.events = [];
    this.lastPatterns = [];
  }

  /**
   * Export JSON pour debug/visualisation
   */
  public toJSON() {
    return {
      events: this.events,
      lastPatterns: this.lastPatterns,
      detectors: this.detectors.length
    };
  }
} 