// src/background/offscreen-llm.ts
//
// Handler LLM du document offscreen. Le moteur WebLLM y vit de façon
// persistante : le modèle reste chargé même quand le popup est fermé, et une
// génération/analyse/embedding continue en arrière-plan. Le popup (client)
// envoie des LLMRequest ; on répond par des LLMResponse corrélées par `id`.
//
// Deux modèles peuvent y vivre : le modèle de chat (load/chat/analyze) et,
// optionnellement, un modèle d'embedding (kind 'embed'), chargé paresseusement
// au premier embedding demandé. Rien n'est importé tant que rien n'est demandé.

import { logger } from '@/shared/utils/secureLogger';
import { LocalLLMEngine, type ChatMessage } from '@/shared/llm/LocalLLMEngine';
import { analyzeContent, type ChatCapable } from '@/shared/llm/ContentAnalysis';
import {
  SemanticEmbedder,
  createEmbeddingEngine,
  DEFAULT_EMBEDDING_MODEL,
  type EmbeddingEngine,
} from '@/shared/comprehension';
import {
  isLLMRequest,
  type LLMRequest,
  type LLMResponse,
  LLM_TARGET,
} from '@/shared/llm/offscreenProtocol';

interface EngineLike extends ChatCapable {
  load: (modelId: string, onProgress?: (p: { progress: number; text: string }) => void) => Promise<void>;
  chat: (
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number; onToken?: (d: string) => void },
  ) => Promise<string>;
  getStatus: () => string;
  getModelId: () => string | null;
}

type ProgressCb = (p: { progress: number; text: string }) => void;
type EmbeddingFactory = (modelId: string, onProgress?: ProgressCb) => Promise<EmbeddingEngine>;
type GetEmbedder = (modelId: string | undefined, onProgress?: ProgressCb) => Promise<SemanticEmbedder>;

/**
 * Installe le handler LLM offscreen. `engineFactory` / `embeddingFactory`
 * permettent d'injecter des moteurs factices pour les tests.
 */
export function installOffscreenLLM(
  engineFactory?: () => EngineLike,
  embeddingFactory: EmbeddingFactory = createEmbeddingEngine,
): void {
  if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;
  const engine: EngineLike = engineFactory ? engineFactory() : (new LocalLLMEngine() as EngineLike);

  // Embedder chargé paresseusement au premier 'embed'.
  let embedder: SemanticEmbedder | null = null;
  const getEmbedder: GetEmbedder = async (modelId, onProgress) => {
    if (!embedder) {
      const eng = await embeddingFactory(modelId ?? DEFAULT_EMBEDDING_MODEL, onProgress);
      embedder = new SemanticEmbedder(eng);
    }
    return embedder;
  };

  chrome.runtime.onMessage.addListener((message: unknown) => {
    if (!isLLMRequest(message)) return false;
    void handleRequest(message, engine, getEmbedder);
    return false; // réponse asynchrone via sendMessage, pas via sendResponse
  });
}

async function handleRequest(req: LLMRequest, engine: EngineLike, getEmbedder: GetEmbedder): Promise<void> {
  const reply = (r: LLMResponse) => {
    try {
      void chrome.runtime.sendMessage(r);
    } catch (error) {
      logger.warn('offscreen-llm: envoi réponse échoué', error as Error);
    }
  };
  const done = (result: Extract<LLMResponse, { event: 'done' }>['result']) =>
    reply({ source: LLM_TARGET, id: req.id, event: 'done', result });
  const progress = (p: { progress: number; text: string }) =>
    reply({ source: LLM_TARGET, id: req.id, event: 'progress', progress: p.progress, text: p.text });

  try {
    switch (req.kind) {
      case 'load':
        await engine.load(req.modelId, progress);
        done({ kind: 'load', modelId: engine.getModelId() });
        break;

      case 'chat': {
        const text = await engine.chat(req.messages, {
          ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
          ...(req.maxTokens !== undefined ? { maxTokens: req.maxTokens } : {}),
          onToken: (delta) => reply({ source: LLM_TARGET, id: req.id, event: 'token', delta }),
        });
        done({ kind: 'chat', text });
        break;
      }

      case 'analyze': {
        const report = await analyzeContent(engine, req.text, req.domain ? { domain: req.domain } : {});
        done({ kind: 'analyze', report });
        break;
      }

      case 'embed': {
        const e = await getEmbedder(req.modelId, progress);
        const embedding = await e.embed(req.text);
        done({ kind: 'embed', embedding });
        break;
      }

      case 'status':
        done({ kind: 'status', status: engine.getStatus(), modelId: engine.getModelId() });
        break;
    }
  } catch (error) {
    reply({
      source: LLM_TARGET,
      id: req.id,
      event: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
