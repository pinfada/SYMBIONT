// src/shared/comprehension/embedFn.ts
//
// `EmbedFn` : la fonction d'embedding utilisée par la digestion. Asynchrone,
// pour couvrir aussi bien l'embedding local par hachage (synchrone, gratuit) que
// l'embedding sémantique par modèle (asynchrone, meilleure récupération).

import type { Embedder } from './embedder';

export type EmbedFn = (text: string) => Promise<number[]>;

/** Adapte un `Embedder` synchrone (ex. HashingEmbedder) en `EmbedFn`. */
export function hashingEmbedFn(embedder: Embedder): EmbedFn {
  return async (text: string) => embedder.embed(text);
}
