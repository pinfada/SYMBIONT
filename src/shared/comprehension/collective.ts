// src/shared/comprehension/collective.ts
//
// HONNÊTETÉ (pari #2 de docs/VISION.md — « collectif ») : l'agrégation
// préservant la vie privée est un PARI DE RECHERCHE OUVERT. Ce module ne fait
// QUE la logique locale : abstraire une révision en un fragment grossier et
// SANS TEXTE, puis intégrer des fragments REÇUS en un signal local. Il ne fait
// AUCUN I/O réseau (pas de transport en direct), et ne doit JAMAIS placer de
// texte brut, d'URL ou d'identifiant dans un fragment. Autrement dit : logique
// seule ; pas de transport en direct ; garantie de confidentialité NON prouvée.
//
// L'idée : réorienter le partage des « signatures de menace » vers des
// « fragments de compréhension » abstraits — une compréhension partagée peut
// émerger SANS exposer qui-a-lu-quoi. Le vecteur complet n'est jamais partagé ;
// on ne partage qu'une projection grossière (lossy), volontairement appauvrie.

import type { DeltaKind } from './types';
import { KIND_WEIGHT } from './types';
import type { KnowledgeModel } from './KnowledgeModel';
import { cosineSimilarity } from './embedder';

/** Fragment PARTAGEABLE : abstrait, sans texte ni URL ni identifiant. */
export interface MeaningFragment {
  kind: DeltaKind;
  topic: number[];
  strength: number;
  ts: number;
}

/** Signal LOCAL agrégé à partir de fragments reçus. */
export interface CollectiveSignal {
  topic: number[];
  count: number;
  dominantKind: DeltaKind;
  strength: number;
  matchedClaimId?: string;
}

/** Dimension grossière par défaut d'un topic partageable (appauvrissement). */
const DEFAULT_COARSE_DIM = 16;

/** Normalisation L2. Un vecteur nul reste nul (pas de division par zéro). */
function l2normalize(vec: number[]): number[] {
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

/**
 * Réduit un vecteur à `dim` dimensions par average-pooling de groupes
 * contigus, puis normalise L2. Lossy → c'est le point de confidentialité (on ne
 * partage pas le vecteur complet). Exporté car utilisé des deux côtés.
 *
 * Si `vec.length < dim`, on ne fait PAS d'upsampling : on normalise tel quel.
 * Vecteur vide ou nul → renvoie des zéros. Déterministe.
 */
export function coarsen(vec: number[], dim: number): number[] {
  const n = vec.length;
  if (n < dim) return l2normalize(vec.slice());

  const out = new Array<number>(dim).fill(0);
  for (let i = 0; i < dim; i++) {
    // Bornes du groupe contigu i, réparties uniformément sur `n`.
    const start = Math.floor((i * n) / dim);
    const end = Math.floor(((i + 1) * n) / dim);
    let sum = 0;
    let cnt = 0;
    for (let j = start; j < end; j++) {
      sum += vec[j];
      cnt++;
    }
    out[i] = cnt > 0 ? sum / cnt : 0;
  }
  return l2normalize(out);
}

/**
 * Transforme une révision (kind + embedding complet de la croyance) en fragment
 * PARTAGEABLE : topic = coarsen(embedding, coarseDim), strength = KIND_WEIGHT[kind].
 * AUCUN texte, URL ou identifiant. `now` est injecté (pas d'horloge interne).
 */
export function abstractRevision(
  kind: DeltaKind,
  embedding: number[],
  opts: { now: number; coarseDim?: number },
): MeaningFragment {
  const dim = opts.coarseDim ?? DEFAULT_COARSE_DIM;
  return {
    kind,
    topic: coarsen(embedding, dim),
    strength: KIND_WEIGHT[kind],
    ts: opts.now,
  };
}

/** Élit le kind dominant d'un groupe par SOMME de strength (pas par comptage). */
function dominantByStrength(group: MeaningFragment[]): DeltaKind {
  const byKind = new Map<DeltaKind, number>();
  for (const f of group) {
    byKind.set(f.kind, (byKind.get(f.kind) ?? 0) + f.strength);
  }
  let dominant: DeltaKind = group[0].kind;
  let best = -Infinity;
  for (const [kind, sum] of byKind) {
    if (sum > best) {
      best = sum;
      dominant = kind;
    }
  }
  return dominant;
}

/** Topic moyen d'un groupe (moyenne dimension à dimension), renormalisé L2. */
function meanTopic(group: MeaningFragment[], dim: number): number[] {
  const mean = new Array<number>(dim).fill(0);
  for (const f of group) {
    for (let i = 0; i < dim; i++) mean[i] += f.topic[i] ?? 0;
  }
  for (let i = 0; i < dim; i++) mean[i] /= group.length;
  return l2normalize(mean);
}

/**
 * Intègre des fragments REÇUS en signaux locaux. Regroupe par proximité de
 * topic (cosine >= `simThreshold`, défaut 0.6), et pour chaque groupe calcule
 * count, dominantKind (par somme de strength), topic moyen et strength cumulée.
 * Associe au besoin la croyance la plus proche du modèle : l'embedding de la
 * croyance est coarseni à la MÊME dimension que le topic avant comparaison ;
 * si cosine >= `matchThreshold` (défaut 0.6), on pose `matchedClaimId`.
 * Retourne les signaux triés par count décroissant. Pur, déterministe.
 */
export function integrateFragments(
  fragments: MeaningFragment[],
  model: KnowledgeModel,
  opts?: { simThreshold?: number; matchThreshold?: number },
): CollectiveSignal[] {
  const simThreshold = opts?.simThreshold ?? 0.6;
  const matchThreshold = opts?.matchThreshold ?? 0.6;

  // Regroupement glouton : chaque fragment rejoint le premier groupe dont le
  // représentant (premier membre) est assez proche, sinon ouvre un groupe.
  const groups: MeaningFragment[][] = [];
  for (const frag of fragments) {
    let placed = false;
    for (const g of groups) {
      if (cosineSimilarity(frag.topic, g[0].topic) >= simThreshold) {
        g.push(frag);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([frag]);
  }

  const signals: CollectiveSignal[] = groups.map((group) => {
    const dim = group[0].topic.length;
    const topic = meanTopic(group, dim);
    const dominantKind = dominantByStrength(group);
    let strength = 0;
    for (const f of group) strength += f.strength;

    // Association à la croyance la plus proche (au-dessus du seuil).
    let matchedClaimId: string | undefined;
    let bestSim = matchThreshold;
    for (const claim of model.all()) {
      const claimTopic = coarsen(claim.embedding, dim);
      const sim = cosineSimilarity(topic, claimTopic);
      if (sim >= bestSim) {
        bestSim = sim;
        matchedClaimId = claim.id;
      }
    }

    // exactOptionalPropertyTypes : n'ajouter matchedClaimId que s'il existe.
    return {
      topic,
      count: group.length,
      dominantKind,
      strength,
      ...(matchedClaimId !== undefined ? { matchedClaimId } : {}),
    };
  });

  signals.sort((a, b) => b.count - a.count);
  return signals;
}
