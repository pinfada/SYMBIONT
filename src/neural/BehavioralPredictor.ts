import { BehaviorPattern, PageContext, ActionPrediction } from '../shared/types/organism'

export class BehavioralPredictor {
  private history: { context: PageContext; action: string }[] = [];
  private transitionCounts: Map<string, Map<string, number>> = new Map();
  private actionCounts: Map<string, number> = new Map();

  constructor() {
    // TODO: Initialiser le modèle
  }

  // Enregistre une action dans l'historique
  record(context: PageContext, action: string) {
    this.history.push({ context, action });
    // Comptage pour Markov
    if (this.history.length > 1) {
      const prev = this.history[this.history.length - 2].action;
      if (!this.transitionCounts.has(prev)) this.transitionCounts.set(prev, new Map());
      const map = this.transitionCounts.get(prev)!;
      map.set(action, (map.get(action) ?? 0) + 1);
    }
    // Comptage global
    this.actionCounts.set(action, (this.actionCounts.get(action) ?? 0) + 1);
  }

  // Prédit la prochaine action (Markov ou fréquence)
  predictNextAction(context: PageContext): ActionPrediction {
    let prediction = 'idle';
    let confidence = 0.5;
    if (this.history.length > 0) {
      const last = this.history[this.history.length - 1].action;
      const transitions = this.transitionCounts.get(last);
      if (transitions && transitions.size > 0) {
        // Prédiction Markov
        let max = 0;
        for (const [act, count] of transitions.entries()) {
          if (count > max) {
            max = count;
            prediction = act;
          }
        }
        confidence = max / (Array.from(transitions.values()).reduce((a, b) => a + b, 0) || 1);
      } else {
        // Prédiction par fréquence
        let max = 0;
        for (const [act, count] of this.actionCounts.entries()) {
          if (count > max) {
            max = count;
            prediction = act;
          }
        }
        confidence = max / (this.history.length || 1);
      }
    }
    return { action: prediction, confidence };
  }

  // Feedback pour ajuster la confiance (optionnel)
  updateModel(actualAction: string, prediction: ActionPrediction): void {
    // Peut être enrichi pour du renforcement
    // Ici, on ne fait rien (stub)
  }

  calculateConfidence(prediction: ActionPrediction): number {
    return prediction.confidence || 0;
  }
} 