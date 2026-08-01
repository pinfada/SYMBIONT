// src/shared/comprehension/embedder.ts
//
// Embedding léger et déterministe (sans dépendance, sans réseau) pour la
// RÉCUPÉRATION de croyances candidates proches. Ce n'est pas lui qui décide du
// delta — c'est le LLM local qui juge la relation (contredit/complète/…). Ici on
// veut juste rapprocher « les vaccins causent l'autisme » de « sûreté des
// vaccins » pour donner au LLM les bons candidats à comparer.
//
// Un vrai embedding sémantique (via le modèle local) pourra remplacer ce
// fallback derrière la même interface, sans rien changer en aval.

export interface Embedder {
  readonly dim: number;
  embed(text: string): number[];
}

const STOPWORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'à', 'au',
  'aux', 'que', 'qui', 'ne', 'pas', 'est', 'sont', 'the', 'a', 'an', 'of',
  'and', 'or', 'to', 'in', 'is', 'are', 'that', 'this',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // enlève les accents pour la robustesse
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

// Hash déterministe FNV-1a 32 bits.
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Embedding par « hashing trick » : sac de mots projeté sur `dim` dimensions,
 * normalisé (L2). Déterministe → testable, et suffisant pour la récupération.
 */
export class HashingEmbedder implements Embedder {
  constructor(public readonly dim = 64) {}

  embed(text: string): number[] {
    const vec = new Array<number>(this.dim).fill(0);
    const tokens = tokenize(text);
    if (tokens.length === 0) return vec;
    for (const tok of tokens) {
      const h = fnv1a(tok);
      const idx = h % this.dim;
      const sign = (h & 1) === 0 ? 1 : -1; // signed hashing → réduit les collisions
      vec[idx] += sign;
    }
    // Normalisation L2.
    let norm = 0;
    for (const v of vec) norm += v * v;
    norm = Math.sqrt(norm);
    if (norm === 0) return vec;
    for (let i = 0; i < this.dim; i++) vec[i] /= norm;
    return vec;
  }
}

/** Similarité cosinus de deux vecteurs (supposés de même dimension). */
export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  // Vecteurs déjà normalisés par l'embedder → dot = cosinus. On borne quand même.
  return Math.max(-1, Math.min(1, dot));
}
