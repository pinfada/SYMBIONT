// Prédicteur d'actions — délègue à la vraie logique de prédiction
// comportementale (traits de l'organisme + contexte de page).
import { OrganismState, PageContext, ActionPrediction } from '../shared/types/organism';
import { BehaviorPredictor } from './core/BehaviorPredictor';

export interface ActionPredictorInput {
  organism?: OrganismState;
  context?: Partial<PageContext> | string;
}

export class ActionPredictor {
  private predictor = new BehaviorPredictor();

  predict(ctx: ActionPredictorInput | unknown): ActionPrediction {
    const input = (ctx || {}) as ActionPredictorInput;

    const organism = input.organism || this.loadStoredOrganism();
    const context = this.normalizeContext(input.context);

    if (!organism) {
      // Aucune donnée d'organisme disponible : prédiction neutre,
      // confiance basse — honnête, pas simulée.
      return {
        action: 'browse',
        confidence: 0.3,
        alternatives: ['search', 'explore'],
        reasoning: 'Aucun organisme chargé — prédiction par défaut à faible confiance'
      };
    }

    return this.predictor.predictNextAction(organism, context);
  }

  private loadStoredOrganism(): OrganismState | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem('symbiont_organism');
      return raw ? (JSON.parse(raw) as OrganismState) : null;
    } catch {
      return null;
    }
  }

  private normalizeContext(context?: Partial<PageContext> | string): PageContext {
    if (typeof context === 'string') {
      return { url: context, time: Date.now(), userAgent: '' };
    }
    return {
      url: context?.url || '',
      time: context?.time || Date.now(),
      userAgent: context?.userAgent || ''
    };
  }
}
