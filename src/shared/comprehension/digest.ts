// src/shared/comprehension/digest.ts
//
// L'acte de lecture du symbiote : il lit une page, mesure le delta de
// compréhension, PUIS accrète toujours les affirmations au modèle (la
// « digestion »). Ce qui distingue le silence de la surface, c'est le delta —
// mais tout est digéré, car même ce qui confirme aujourd'hui pourra être
// contredit demain.

import { logger } from '@shared/utils/secureLogger';
import type { ChatCapable } from '../llm/ContentAnalysis';
import type { KnowledgeModel } from './KnowledgeModel';
import type { DeltaReport } from './types';
import { extractClaims } from './ClaimExtractor';
import { assessDelta } from './ComprehensionDelta';

export interface DigestResult extends DeltaReport {
  /** Nombre d'affirmations extraites de la page. */
  claimCount: number;
}

/**
 * Digère une page : extrait les affirmations, évalue le delta, puis accrète
 * TOUT au modèle. `now` est injecté (déterminisme/testabilité).
 */
export async function digestPage(
  engine: ChatCapable,
  model: KnowledgeModel,
  text: string,
  opts: { domain?: string; now: number },
): Promise<DigestResult> {
  const claims = await extractClaims(engine, text);

  if (claims.length === 0) {
    return {
      score: 0,
      surface: false,
      dominantKind: 'confirme',
      revisions: [],
      verdicts: [],
      claimCount: 0,
      ...(opts.domain ? { domain: opts.domain } : {}),
    };
  }

  const report = await assessDelta(engine, model, claims, opts.domain ? { domain: opts.domain } : {});

  // Accrétion : le symbiote grossit de tout ce qu'il lit.
  for (const claim of claims) {
    try {
      model.assimilate(claim, { now: opts.now, ...(opts.domain ? { domain: opts.domain } : {}) });
    } catch (error) {
      logger.warn('digestPage: assimilation échouée', error as Error);
    }
  }

  return { ...report, claimCount: claims.length };
}
