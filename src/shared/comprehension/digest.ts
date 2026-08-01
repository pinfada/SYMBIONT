// src/shared/comprehension/digest.ts
//
// L'acte de lecture du symbiote : il lit une page, mesure le delta de
// compréhension, PUIS accrète toujours les affirmations au modèle (la
// « digestion »). Ce qui distingue le silence de la surface, c'est le delta —
// mais tout est digéré, car même ce qui confirme aujourd'hui pourra être
// contredit demain.
//
// L'embedding est injecté (`EmbedFn`) : hachage (gratuit) ou sémantique (modèle).

import { logger } from '@shared/utils/secureLogger';
import type { ChatCapable } from '../llm/ContentAnalysis';
import type { KnowledgeModel } from './KnowledgeModel';
import type { DeltaReport } from './types';
import type { EmbedFn } from './embedFn';
import { extractClaims } from './ClaimExtractor';
import { assessDelta, type EmbeddedClaim } from './ComprehensionDelta';

export interface DigestResult extends DeltaReport {
  /** Nombre d'affirmations extraites de la page. */
  claimCount: number;
}

/**
 * Digère une page : extrait les affirmations, les vectorise, évalue le delta,
 * puis accrète TOUT au modèle. `now` est injecté (déterminisme/testabilité).
 */
export async function digestPage(
  engine: ChatCapable,
  model: KnowledgeModel,
  embed: EmbedFn,
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

  // Vectorisation en amont (une fois par affirmation), réutilisée pour la
  // récupération ET l'accrétion.
  const items: EmbeddedClaim[] = await Promise.all(
    claims.map(async (claim) => ({ claim, embedding: await embed(claim) })),
  );

  const report = await assessDelta(engine, model, items, opts.domain ? { domain: opts.domain } : {});

  // Accrétion : le symbiote grossit de tout ce qu'il lit.
  for (const { claim, embedding } of items) {
    try {
      model.assimilate(claim, embedding, { now: opts.now, ...(opts.domain ? { domain: opts.domain } : {}) });
    } catch (error) {
      logger.warn('digestPage: assimilation échouée', error as Error);
    }
  }

  return { ...report, claimCount: claims.length };
}
