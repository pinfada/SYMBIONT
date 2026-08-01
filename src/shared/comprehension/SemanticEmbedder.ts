// src/shared/comprehension/SemanticEmbedder.ts
//
// Embedding sémantique via un modèle d'embedding local (WebLLM, ex.
// snowflake-arctic-embed-s). Bien meilleur que le hachage pour rapprocher des
// croyances qui parlent de la même chose avec d'autres mots — donc pour donner
// au LLM les bons candidats à comparer.
//
// Coûte un SECOND modèle (~240 Mo) : c'est pourquoi il est opt-in. Toujours un
// repli (hachage) si l'embedding échoue → la digestion ne casse jamais.
//
// Le moteur d'embedding est injecté (interface minimale) → testable sans WebGPU.

import { logger } from '@shared/utils/secureLogger';
import type { EmbedFn } from './embedFn';

/** Interface minimale d'un moteur d'embedding (satisfaite par WebLLM). */
export interface EmbeddingEngine {
  embeddings: {
    create: (opts: { input: string | string[] }) => Promise<{ data?: Array<{ embedding?: number[] }> }>;
  };
}

export class SemanticEmbedder {
  private readonly cache = new Map<string, number[]>();

  constructor(
    private readonly engine: EmbeddingEngine,
    private readonly fallback?: EmbedFn,
    private readonly maxCache = 1000,
  ) {}

  readonly embed: EmbedFn = async (text: string): Promise<number[]> => {
    const key = text.trim();
    const cached = this.cache.get(key);
    if (cached) return cached;

    try {
      const res = await this.engine.embeddings.create({ input: key });
      const vec = res?.data?.[0]?.embedding;
      if (Array.isArray(vec) && vec.length > 0) {
        this.remember(key, vec);
        return vec;
      }
      throw new Error('embedding vide');
    } catch (error) {
      logger.warn('SemanticEmbedder: échec, repli sur l’embedding de secours', error as Error);
      if (this.fallback) return this.fallback(key);
      throw error;
    }
  };

  private remember(key: string, vec: number[]): void {
    if (this.cache.size >= this.maxCache) {
      // Éviction FIFO simple.
      const first = this.cache.keys().next().value as string | undefined;
      if (first !== undefined) this.cache.delete(first);
    }
    this.cache.set(key, vec);
  }
}

/**
 * Crée un moteur d'embedding WebLLM (import dynamique → chunk séparé). N'est PAS
 * appelé dans les tests (WebGPU indisponible) ; le SemanticEmbedder reçoit alors
 * un moteur injecté.
 */
export async function createEmbeddingEngine(
  modelId: string,
  onProgress?: (report: { progress: number; text: string }) => void,
): Promise<EmbeddingEngine> {
  const webllm = (await import('@mlc-ai/web-llm')) as unknown as {
    CreateMLCEngine: (
      id: string,
      opts: { initProgressCallback?: (r: { progress: number; text: string }) => void },
    ) => Promise<EmbeddingEngine>;
  };
  return webllm.CreateMLCEngine(modelId, {
    ...(onProgress ? { initProgressCallback: onProgress } : {}),
  });
}

/** Modèle d'embedding par défaut (le plus léger). */
export const DEFAULT_EMBEDDING_MODEL = 'snowflake-arctic-embed-s-q0f32-MLC-b4';
