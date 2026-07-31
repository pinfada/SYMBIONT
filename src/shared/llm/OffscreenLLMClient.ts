// src/shared/llm/OffscreenLLMClient.ts
//
// Client popup du moteur LLM qui vit dans le document offscreen. Le service
// worker crée l'offscreen (ENSURE_OFFSCREEN_LLM) ; ensuite le popup adresse
// directement l'offscreen par broadcast runtime, corrélé par `id`.
//
// Implémente la même surface que le moteur in-popup (load/chat/analyze/status)
// pour que l'UI soit agnostique de l'emplacement du moteur.

import { logger } from '@shared/utils/secureLogger';
import type { ChatMessage, ChatOptions } from './LocalLLMEngine';
import type { ReliabilityReport } from './ContentAnalysis';
import {
  LLM_TARGET,
  ENSURE_OFFSCREEN_LLM,
  isLLMResponse,
  type LLMRequest,
  type LLMRequestPayload,
  type LLMResult,
} from './offscreenProtocol';

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `llm-${idCounter}-${Date.now()}`;
}

interface ChromeRuntimeLike {
  sendMessage: (msg: unknown) => Promise<unknown> | void;
  onMessage: {
    addListener: (cb: (msg: unknown) => void) => void;
    removeListener: (cb: (msg: unknown) => void) => void;
  };
}

function getRuntime(): ChromeRuntimeLike | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = typeof chrome !== 'undefined' ? (chrome as any) : undefined;
  return c?.runtime?.sendMessage && c?.runtime?.onMessage ? c.runtime : undefined;
}

export class OffscreenLLMClient {
  readonly location = 'offscreen' as const;
  private status = 'idle';
  private modelId: string | null = null;
  private ensured = false;
  private readonly defaultTimeout: number;

  constructor(opts?: { timeoutMs?: number }) {
    this.defaultTimeout = opts?.timeoutMs ?? 120000;
  }

  getStatus(): string {
    return this.status;
  }
  getModelId(): string | null {
    return this.modelId;
  }
  isReady(): boolean {
    return this.status === 'ready';
  }

  /** Demande au service worker de garantir le document offscreen. */
  async ensure(): Promise<void> {
    const rt = getRuntime();
    if (!rt) throw new Error('Runtime extension indisponible (contexte hors-popup ?).');
    const res = (await rt.sendMessage({ type: ENSURE_OFFSCREEN_LLM })) as
      | { ok?: boolean; error?: string }
      | undefined;
    if (res && res.ok === false) throw new Error(res.error || 'Création offscreen refusée.');
    this.ensured = true;
  }

  private request(
    req: LLMRequestPayload,
    handlers: {
      onProgress?: (p: { progress: number; text: string }) => void;
      onToken?: (delta: string) => void;
      timeoutMs?: number;
    } = {},
  ): Promise<LLMResult> {
    const rt = getRuntime();
    if (!rt) return Promise.reject(new Error('Runtime extension indisponible.'));
    const id = nextId();
    const full: LLMRequest = { target: LLM_TARGET, id, ...req };

    return new Promise<LLMResult>((resolve, reject) => {
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        rt.onMessage.removeListener(listener);
        reject(new Error('Délai dépassé : le moteur offscreen ne répond pas.'));
      }, handlers.timeoutMs ?? this.defaultTimeout);

      const listener = (msg: unknown) => {
        if (!isLLMResponse(msg) || msg.id !== id) return;
        if (msg.event === 'progress') {
          handlers.onProgress?.({ progress: msg.progress, text: msg.text });
        } else if (msg.event === 'token') {
          handlers.onToken?.(msg.delta);
        } else if (msg.event === 'done') {
          if (done) return;
          done = true;
          clearTimeout(timer);
          rt.onMessage.removeListener(listener);
          resolve(msg.result);
        } else if (msg.event === 'error') {
          if (done) return;
          done = true;
          clearTimeout(timer);
          rt.onMessage.removeListener(listener);
          reject(new Error(msg.message));
        }
      };

      rt.onMessage.addListener(listener);
      try {
        void rt.sendMessage(full);
      } catch (e) {
        clearTimeout(timer);
        rt.onMessage.removeListener(listener);
        reject(e as Error);
      }
    });
  }

  async load(modelId: string, onProgress?: (p: { progress: number; text: string }) => void): Promise<void> {
    if (!this.ensured) await this.ensure();
    this.status = 'loading';
    try {
      const res = await this.request(
        { kind: 'load', modelId },
        onProgress ? { onProgress } : {},
      );
      if (res.kind === 'load') this.modelId = res.modelId;
      this.status = 'ready';
    } catch (e) {
      this.status = 'error';
      logger.error('OffscreenLLMClient: load échoué', e as Error);
      throw e;
    }
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    this.status = 'generating';
    try {
      const res = await this.request(
        {
          kind: 'chat',
          messages,
          ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
          ...(options.maxTokens !== undefined ? { maxTokens: options.maxTokens } : {}),
        },
        options.onToken ? { onToken: options.onToken } : {},
      );
      this.status = 'ready';
      return res.kind === 'chat' ? res.text : '';
    } catch (e) {
      this.status = 'ready';
      throw e;
    }
  }

  async analyze(text: string, opts: { domain?: string } = {}): Promise<ReliabilityReport> {
    const res = await this.request({
      kind: 'analyze',
      text,
      ...(opts.domain ? { domain: opts.domain } : {}),
    });
    if (res.kind !== 'analyze') throw new Error('Réponse d’analyse inattendue.');
    return res.report;
  }
}
