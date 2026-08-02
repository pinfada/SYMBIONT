// src/shared/llm/LocalLLMEngine.ts
//
// Enveloppe fine et testable autour de WebLLM (@mlc-ai/web-llm). Le moteur
// tourne dans un contexte document (popup en v1 ; document offscreen en v2
// pour l'analyse de fond). WebLLM est chargé par import() dynamique afin que
// webpack le mette dans un chunk séparé : le bundle initial du popup reste
// léger, le gros paquet n'est téléchargé que si l'utilisateur active le module.
//
// Les poids du modèle sont mis en cache par WebLLM (Cache API) : un rechargement
// ultérieur repart du cache, sans re-télécharger.

import { logger } from '@shared/utils/secureLogger';
import { normalizeModelId } from './modelCatalog';

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface LoadProgress {
  /** Progression 0..1 rapportée par WebLLM. */
  progress: number;
  /** Texte d'état lisible (« Fetching param … », « Loading model … »). */
  text: string;
}

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'generating' | 'error';

export interface ChatOptions {
  onToken?: (delta: string) => void;
  temperature?: number;
  maxTokens?: number;
  /** Permet d'interrompre une génération en cours. */
  signal?: AbortSignal;
}

// --- Types structurels minimaux du moteur WebLLM (évite un couplage dur) ---

interface MLCChunk {
  choices?: Array<{ delta?: { content?: string | null } }>;
}
interface MLCCompletion {
  choices?: Array<{ message?: { content?: string | null } }>;
}
interface MLCLikeEngine {
  chat: {
    completions: {
      create: (opts: {
        messages: ChatMessage[];
        stream?: boolean;
        temperature?: number;
        max_tokens?: number;
      }) => Promise<AsyncIterable<MLCChunk> | MLCCompletion>;
    };
  };
  unload?: () => Promise<void>;
  interruptGenerate?: () => void;
}

export type CreateEngineFn = (
  modelId: string,
  opts: { initProgressCallback?: (report: { progress: number; text: string }) => void },
) => Promise<MLCLikeEngine>;

/** Fabrique par défaut : import() dynamique de WebLLM (chunk séparé). */
const defaultCreateEngine: CreateEngineFn = async (modelId, opts) => {
  const webllm = (await import(/* webpackChunkName: "webllm" */ '@mlc-ai/web-llm')) as unknown as {
    CreateMLCEngine: CreateEngineFn;
  };
  return webllm.CreateMLCEngine(modelId, opts);
};

export class LocalLLMEngine {
  private engine: MLCLikeEngine | null = null;
  private status: EngineStatus = 'idle';
  private modelId: string | null = null;
  private readonly createEngine: CreateEngineFn;

  constructor(deps?: { createEngine?: CreateEngineFn }) {
    this.createEngine = deps?.createEngine ?? defaultCreateEngine;
  }

  getStatus(): EngineStatus {
    return this.status;
  }

  getModelId(): string | null {
    return this.modelId;
  }

  isReady(): boolean {
    return this.status === 'ready' && this.engine !== null;
  }

  /**
   * Charge (ou recharge) un modèle. Idempotent si le modèle demandé est déjà
   * prêt. `onProgress` reçoit la progression de téléchargement/initialisation.
   */
  async load(modelId: string, onProgress?: (p: LoadProgress) => void): Promise<void> {
    const target = normalizeModelId(modelId);

    if (this.isReady() && this.modelId === target) {
      onProgress?.({ progress: 1, text: 'Modèle déjà chargé.' });
      return;
    }

    // Changement de modèle : on libère l'ancien d'abord.
    if (this.engine) {
      await this.unload();
    }

    this.status = 'loading';
    try {
      this.engine = await this.createEngine(target, {
        initProgressCallback: (report) => {
          onProgress?.({
            progress: typeof report.progress === 'number' ? report.progress : 0,
            text: report.text ?? '',
          });
        },
      });
      this.modelId = target;
      this.status = 'ready';
      logger.info('LocalLLMEngine: modèle chargé', { modelId: target }, 'llm');
    } catch (error) {
      this.status = 'error';
      this.engine = null;
      this.modelId = null;
      logger.error('LocalLLMEngine: échec du chargement du modèle', error as Error);
      throw error;
    }
  }

  /**
   * Génère une réponse à partir d'un historique de messages. Diffuse les
   * tokens via `onToken` si fourni et renvoie le texte complet.
   */
  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    if (!this.engine || this.status === 'idle' || this.status === 'loading') {
      throw new Error('LocalLLMEngine: aucun modèle chargé. Appelez load() d’abord.');
    }
    const engine = this.engine;
    this.status = 'generating';
    try {
      const response = await engine.chat.completions.create({
        messages,
        stream: true,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 512,
      });

      let full = '';

      if (isAsyncIterable<MLCChunk>(response)) {
        for await (const chunk of response) {
          if (options.signal?.aborted) {
            engine.interruptGenerate?.();
            break;
          }
          const delta = chunk?.choices?.[0]?.delta?.content ?? '';
          if (delta) {
            full += delta;
            options.onToken?.(delta);
          }
        }
      } else {
        // Repli non-stream (certains moteurs / mocks).
        full = response?.choices?.[0]?.message?.content ?? '';
        if (full) options.onToken?.(full);
      }

      this.status = 'ready';
      return full;
    } catch (error) {
      this.status = this.engine ? 'ready' : 'error';
      logger.error('LocalLLMEngine: échec de la génération', error as Error);
      throw error;
    }
  }

  async unload(): Promise<void> {
    try {
      await this.engine?.unload?.();
    } catch (error) {
      logger.warn('LocalLLMEngine: erreur au déchargement', error as Error);
    } finally {
      this.engine = null;
      this.modelId = null;
      this.status = 'idle';
    }
  }
}

function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
  return (
    value != null &&
    typeof (value as AsyncIterable<T>)[Symbol.asyncIterator] === 'function'
  );
}
