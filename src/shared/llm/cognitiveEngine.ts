// src/shared/llm/cognitiveEngine.ts
//
// Abstraction commune : le moteur cognitif peut vivre dans le document
// offscreen (v3, persiste popup fermé) ou dans le popup (repli). L'UI ne
// dépend que de cette interface.

import { logger } from '@shared/utils/secureLogger';
import { LocalLLMEngine, type ChatMessage, type ChatOptions } from './LocalLLMEngine';
import { analyzeContent, type ReliabilityReport } from './ContentAnalysis';
import { OffscreenLLMClient } from './OffscreenLLMClient';

export interface CognitiveEngine {
  /** Où tourne réellement le moteur. */
  readonly location: 'offscreen' | 'popup';
  load(modelId: string, onProgress?: (p: { progress: number; text: string }) => void): Promise<void>;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
  analyze(text: string, opts?: { domain?: string }): Promise<ReliabilityReport>;
  isReady(): boolean;
  getStatus(): string;
  getModelId(): string | null;
}

/** Adaptateur du moteur in-popup vers l'interface commune. */
class PopupCognitiveEngine implements CognitiveEngine {
  readonly location = 'popup' as const;
  private readonly engine = new LocalLLMEngine();

  load(modelId: string, onProgress?: (p: { progress: number; text: string }) => void): Promise<void> {
    return this.engine.load(modelId, onProgress);
  }
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    return this.engine.chat(messages, options);
  }
  analyze(text: string, opts: { domain?: string } = {}): Promise<ReliabilityReport> {
    return analyzeContent(this.engine, text, opts.domain ? { domain: opts.domain } : {});
  }
  isReady(): boolean {
    return this.engine.isReady();
  }
  getStatus(): string {
    return this.engine.getStatus();
  }
  getModelId(): string | null {
    return this.engine.getModelId();
  }
}

/**
 * Crée le moteur cognitif. Préfère l'offscreen (le modèle y survit à la
 * fermeture du popup) ; si l'offscreen est injoignable, repli transparent sur
 * le moteur in-popup.
 */
export async function createCognitiveEngine(deps?: {
  makeOffscreen?: () => Pick<OffscreenLLMClient, 'ensure'> & CognitiveEngine;
  makePopup?: () => CognitiveEngine;
}): Promise<CognitiveEngine> {
  const makePopup = deps?.makePopup ?? (() => new PopupCognitiveEngine());
  const makeOffscreen = deps?.makeOffscreen ?? (() => new OffscreenLLMClient());

  try {
    const client = makeOffscreen();
    await client.ensure();
    logger.info('cognitiveEngine: moteur offscreen prêt', undefined, 'llm');
    return client;
  } catch (error) {
    logger.warn('cognitiveEngine: offscreen indisponible, repli in-popup', error as Error);
    return makePopup();
  }
}
