// src/shared/comprehension/readingService.ts
//
// L'acte de lecture *persistant* du symbiote : il lit une page (à la demande,
// sur geste — aucune permission invasive), la digère dans son modèle du monde
// persistant, et journalise ce qui a fait surface. Le modèle grossit d'une
// session à l'autre.

import type { ChatCapable } from '../llm/ContentAnalysis';
import { digestPage, type DigestResult } from './digest';
import type { KnowledgeStore } from './KnowledgeStore';
import type { SurfaceJournal } from './SurfaceJournal';

export interface ReadingDeps {
  store: KnowledgeStore;
  journal: SurfaceJournal;
}

export interface ReadingOutcome extends DigestResult {
  /** Taille du modèle du monde après digestion. */
  modelSize: number;
}

/**
 * Lit et digère une page dans le modèle persistant. Retourne le résultat +
 * la taille du modèle. `now` est injecté (déterminisme/testabilité).
 */
export async function readPage(
  engine: ChatCapable,
  deps: ReadingDeps,
  text: string,
  opts: { domain?: string; now: number },
): Promise<ReadingOutcome> {
  const model = await deps.store.load();

  const result = await digestPage(engine, model, text, {
    now: opts.now,
    ...(opts.domain ? { domain: opts.domain } : {}),
  });

  await deps.store.save(model);

  if (result.surface && result.revisions.length > 0) {
    await deps.journal.append(result.revisions, {
      now: opts.now,
      ...(opts.domain ? { domain: opts.domain } : {}),
    });
  }

  return { ...result, modelSize: model.size() };
}
