// src/shared/comprehension/KnowledgeModel.ts
//
// Le « modèle du monde » de l'organisme : l'ensemble accrété des croyances
// (Claim) assimilées au fil de ce qu'il a lu. C'est CE modèle qui rend le delta
// possible — sans mémoire de ce que tu sais déjà, on ne peut pas distinguer
// « révise ta pensée » de « nouveau ». Sérialisable (persistance locale).

import type { Claim } from './types';
import type { Embedder } from './embedder';
import { cosineSimilarity } from './embedder';

/** Au-dessus de cette similarité, deux textes sont « la même croyance ». */
const SAME_BELIEF_SIM = 0.92;

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function claimId(text: string): string {
  return 'c' + fnv1a(text.trim().toLowerCase()).toString(16);
}

export class KnowledgeModel {
  private claims = new Map<string, Claim>();

  constructor(
    private readonly embedder: Embedder,
    initial?: Claim[],
  ) {
    if (initial) for (const c of initial) this.claims.set(c.id, c);
  }

  size(): number {
    return this.claims.size;
  }

  all(): Claim[] {
    return [...this.claims.values()];
  }

  get(id: string): Claim | undefined {
    return this.claims.get(id);
  }

  /** Les `k` croyances les plus proches (cosinus) d'un texte, au-dessus de `min`. */
  retrieve(text: string, k = 5, min = 0.15): Array<{ claim: Claim; sim: number }> {
    const q = this.embedder.embed(text);
    const scored: Array<{ claim: Claim; sim: number }> = [];
    for (const claim of this.claims.values()) {
      const sim = cosineSimilarity(q, claim.embedding);
      if (sim >= min) scored.push({ claim, sim });
    }
    scored.sort((a, b) => b.sim - a.sim);
    return scored.slice(0, k);
  }

  /**
   * Assimile une affirmation (la « digestion »). Si une croyance quasi
   * identique existe déjà, elle est **renforcée** (salience +, source ajoutée) ;
   * sinon une nouvelle croyance est créée. `now` est injecté (pas de Date.now
   * caché → testable et déterministe).
   */
  assimilate(text: string, opts: { domain?: string; now: number }): Claim {
    const clean = text.trim();
    const id = claimId(clean);

    const existing = this.claims.get(id);
    if (existing) {
      existing.salience += 1;
      existing.lastSeen = opts.now;
      if (opts.domain && !existing.sources.includes(opts.domain)) existing.sources.push(opts.domain);
      return existing;
    }

    // Croyance sémantiquement équivalente déjà présente ?
    const [nearest] = this.retrieve(clean, 1, SAME_BELIEF_SIM);
    if (nearest) {
      nearest.claim.salience += 1;
      nearest.claim.lastSeen = opts.now;
      if (opts.domain && !nearest.claim.sources.includes(opts.domain)) {
        nearest.claim.sources.push(opts.domain);
      }
      return nearest.claim;
    }

    const claim: Claim = {
      id,
      text: clean,
      embedding: this.embedder.embed(clean),
      salience: 1,
      firstSeen: opts.now,
      lastSeen: opts.now,
      sources: opts.domain ? [opts.domain] : [],
    };
    this.claims.set(id, claim);
    return claim;
  }

  /**
   * Borne la taille du modèle (contrainte de stockage local). Garde les
   * croyances les plus saillantes, puis les plus récentes. Retourne le nombre
   * de croyances supprimées.
   */
  prune(max: number): number {
    if (this.claims.size <= max) return 0;
    const sorted = this.all().sort((a, b) => b.salience - a.salience || b.lastSeen - a.lastSeen);
    const keep = sorted.slice(0, max);
    const removed = this.claims.size - keep.length;
    this.claims = new Map(keep.map((c) => [c.id, c]));
    return removed;
  }

  toJSON(): Claim[] {
    return this.all();
  }

  static fromJSON(embedder: Embedder, claims: Claim[]): KnowledgeModel {
    return new KnowledgeModel(embedder, claims);
  }
}
