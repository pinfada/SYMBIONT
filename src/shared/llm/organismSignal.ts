// src/shared/llm/organismSignal.ts
//
// Pont entre l'analyse de fiabilité (LLM local) et l'organisme visible.
// Détecter une page manipulatrice rend l'organisme plus « vigilant » : on
// nudge légèrement sa conscience (0-100). Additif : import paresseux de
// organismStateManager pour ne pas coupler le module cognitif au reste.

import { logger } from '@shared/utils/secureLogger';
import type { ReliabilityReport } from './ContentAnalysis';

/** Gain de conscience/vigilance selon le niveau de fiabilité détecté. */
export function vigilanceDelta(report: ReliabilityReport): number {
  // Pas de verdict → pas de signal. Un rapport non parsé porte `level:
  // 'moyenne'` par défaut ; le compter ferait évoluer l'organisme sur du bruit.
  if (!report.parsed) return 0;

  switch (report.level) {
    case 'faible':
      return 2.5; // A repéré une menace → forte montée de vigilance.
    case 'moyenne':
      return 1;
    case 'élevée':
      return 0.5; // A appris d'une source fiable.
    default:
      return 0;
  }
}

/**
 * Transmet le résultat d'analyse à l'organisme visible. Ne lève jamais :
 * l'analyse reste utile même si l'organisme n'est pas disponible.
 */
export async function feedReliabilityToOrganism(report: ReliabilityReport): Promise<void> {
  if (!report.parsed) {
    logger.info('organismSignal: analyse inexploitable, aucun signal transmis', undefined, 'llm');
    return;
  }

  try {
    const { organismStateManager } = await import('@shared/services/OrganismStateManager');
    const state = organismStateManager.getState();
    const next = Math.max(0, Math.min(100, state.consciousness + vigilanceDelta(report)));
    await organismStateManager.updateState({ consciousness: next });
    logger.info(
      'organismSignal: vigilance mise à jour',
      { level: report.level, delta: vigilanceDelta(report) },
      'llm',
    );
  } catch (error) {
    logger.warn('organismSignal: organisme indisponible, signal ignoré', error as Error);
  }
}
