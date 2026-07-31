// src/shared/llm/offscreenProtocol.ts
//
// Protocole de messages entre le popup (client) et le document offscreen
// (moteur LLM). En MV3, chrome.runtime.sendMessage diffuse à tous les contextes
// de l'extension : le popup peut donc adresser directement l'offscreen (créé au
// préalable par le service worker), et l'offscreen répond de la même façon.
// Chaque échange est corrélé par un `id`.

import type { ChatMessage } from './LocalLLMEngine';
import type { ReliabilityReport } from './ContentAnalysis';

export const LLM_TARGET = 'offscreen-llm' as const;
/** Message demandant au service worker de garantir l'existence de l'offscreen. */
export const ENSURE_OFFSCREEN_LLM = 'ENSURE_OFFSCREEN_LLM' as const;

/** Charge utile d'une requête (sans les champs d'enveloppe target/id). */
export type LLMRequestPayload =
  | { kind: 'load'; modelId: string }
  | { kind: 'chat'; messages: ChatMessage[]; temperature?: number; maxTokens?: number }
  | { kind: 'analyze'; text: string; domain?: string }
  | { kind: 'status' };

export type LLMRequest = LLMRequestPayload & { target: typeof LLM_TARGET; id: string };

export type LLMResponse =
  | { source: typeof LLM_TARGET; id: string; event: 'progress'; progress: number; text: string }
  | { source: typeof LLM_TARGET; id: string; event: 'token'; delta: string }
  | { source: typeof LLM_TARGET; id: string; event: 'done'; result: LLMResult }
  | { source: typeof LLM_TARGET; id: string; event: 'error'; message: string };

export type LLMResult =
  | { kind: 'load'; modelId: string | null }
  | { kind: 'chat'; text: string }
  | { kind: 'analyze'; report: ReliabilityReport }
  | { kind: 'status'; status: string; modelId: string | null };

export function isLLMRequest(m: unknown): m is LLMRequest {
  return !!m && typeof m === 'object' && (m as { target?: unknown }).target === LLM_TARGET;
}

export function isLLMResponse(m: unknown): m is LLMResponse {
  return !!m && typeof m === 'object' && (m as { source?: unknown }).source === LLM_TARGET;
}
