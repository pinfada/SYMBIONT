// src/background/offscreen-llm.ts
//
// Handler LLM du document offscreen. Le moteur WebLLM y vit de façon
// persistante : le modèle reste chargé même quand le popup est fermé, et une
// génération/analyse continue en arrière-plan. Le popup (client) envoie des
// LLMRequest ; on répond par des LLMResponse corrélées par `id`.
//
// WebLLM n'est importé (par LocalLLMEngine) qu'au premier `load` : tant que le
// module cognitif n'est pas activé, ce handler ne coûte qu'un listener.

import { logger } from '@/shared/utils/secureLogger';
import { LocalLLMEngine, type ChatMessage } from '@/shared/llm/LocalLLMEngine';
import { analyzeContent, type ChatCapable } from '@/shared/llm/ContentAnalysis';
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

/**
 * Installe le handler LLM offscreen. `engineFactory` permet d'injecter un
 * moteur factice pour les tests ; par défaut un LocalLLMEngine réel.
 */
export function installOffscreenLLM(engineFactory?: () => EngineLike): void {
  if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;
  const engine: EngineLike = engineFactory ? engineFactory() : (new LocalLLMEngine() as EngineLike);

  chrome.runtime.onMessage.addListener((message: unknown) => {
    if (!isLLMRequest(message)) return false;
    void handleRequest(message, engine);
    return false; // réponse asynchrone via sendMessage, pas via sendResponse
  });
}

async function handleRequest(req: LLMRequest, engine: EngineLike): Promise<void> {
  const reply = (r: LLMResponse) => {
    try {
      void chrome.runtime.sendMessage(r);
    } catch (error) {
      logger.warn('offscreen-llm: envoi réponse échoué', error as Error);
    }
  };
  const done = (result: Extract<LLMResponse, { event: 'done' }>['result']) =>
    reply({ source: LLM_TARGET, id: req.id, event: 'done', result });

  try {
    switch (req.kind) {
      case 'load':
        await engine.load(req.modelId, (p) =>
          reply({ source: LLM_TARGET, id: req.id, event: 'progress', progress: p.progress, text: p.text }),
        );
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
