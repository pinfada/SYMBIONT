// Prédiction comportementale
import { OrganismState, PageContext, ActionPrediction } from '../../shared/types/organism';

export class BehaviorPredictor {
  /**
   * Prédit l'événement le plus probable à partir de la distribution
   * réelle des événements observés (fréquence relative).
   */
  predict(data: unknown[]): { confidence: number; prediction: string } {
    if (!Array.isArray(data) || data.length === 0) {
      return { confidence: 0, prediction: 'unknown' };
    }

    const counts = new Map<string, number>();
    for (const item of data) {
      const key = this.eventKey(item);
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    const [topKey, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      prediction: topKey,
      confidence: Math.min(0.95, topCount / data.length)
    };
  }
  /**
   * Analyse une séquence d'événements : détecte le bigramme (paire
   * d'événements consécutifs) le plus récurrent et son poids relatif.
   */
  analyzeBehavior(sequence: unknown[]): { pattern: string; score: number } {
    if (!Array.isArray(sequence) || sequence.length < 2) {
      return { pattern: 'none', score: 0 };
    }

    const bigrams = new Map<string, number>();
    for (let i = 1; i < sequence.length; i++) {
      const key = `${this.eventKey(sequence[i - 1])}→${this.eventKey(sequence[i])}`;
      bigrams.set(key, (bigrams.get(key) || 0) + 1);
    }

    const [topPattern, count] = [...bigrams.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      pattern: topPattern,
      score: Math.min(1, count / (sequence.length - 1))
    };
  }

  private eventKey(item: unknown): string {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      return String(obj.type ?? obj.action ?? obj.name ?? 'event');
    }
    return String(item);
  }

  // Nouvelle méthode pour prédire basée sur l'organisme et le contexte
  predictNextAction(organism: OrganismState, context: PageContext): ActionPrediction {
    // Logique de prédiction basée sur les traits de l'organisme
    let predictedAction = 'browse';
    let confidence = 0.5;

    // Analyser les traits pour déterminer l'action la plus probable
    if (organism.traits.curiosity > 0.7) {
      predictedAction = 'explore';
      confidence += 0.2;
    } else if (organism.traits.focus > 0.7) {
      predictedAction = 'focus';
      confidence += 0.15;
    } else if (organism.traits.creativity > 0.6) {
      predictedAction = 'create';
      confidence += 0.1;
    }

    // Ajuster selon le contexte (URL, temps, etc.)
    if (context.url.includes('search')) {
      predictedAction = 'search';
      confidence += 0.1;
    }

    return {
      action: predictedAction,
      confidence: Math.min(0.95, confidence),
      alternatives: ['browse', 'search', 'explore'],
      reasoning: `Prédiction basée sur les traits dominants de l'organisme`
    };
  }
}