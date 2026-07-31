// src/shared/llm/ContentAnalysis.ts
//
// Analyse de fiabilité d'un contenu de page par le LLM local. C'est le cœur de
// la vision « lutter contre la désinformation » : le modèle lit le texte d'une
// page et renvoie un score de fiabilité + des signaux de manipulation, sans
// qu'aucune donnée ne quitte le poste.
//
// La fonction est pure et testable : elle prend un moteur qui sait `chat()`,
// construit un prompt structuré, et parse la réponse JSON de façon robuste
// (les petits modèles ne renvoient pas toujours du JSON parfait).

import { logger } from '@shared/utils/secureLogger';
import type { ChatMessage, ChatOptions } from './LocalLLMEngine';

export type ReliabilityLevel = 'élevée' | 'moyenne' | 'faible';

export interface ReliabilityReport {
  /** 0 (désinformation probable) → 100 (source fiable). */
  score: number;
  level: ReliabilityLevel;
  /** Résumé court de l'évaluation. */
  summary: string;
  /** Signaux détectés (sensationnalisme, sources absentes, …). */
  signals: string[];
  /** Domaine analysé, si connu. */
  domain?: string;
}

/** Interface minimale attendue du moteur (LocalLLMEngine la satisfait). */
export interface ChatCapable {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
}

export interface AnalyzeOptions {
  domain?: string;
  /** Nombre max de caractères de contenu envoyés au modèle. */
  maxChars?: number;
}

const DEFAULT_MAX_CHARS = 4000;

export function levelFromScore(score: number): ReliabilityLevel {
  if (score >= 67) return 'élevée';
  if (score >= 34) return 'moyenne';
  return 'faible';
}

function clampScore(n: unknown): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 50;
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function buildAnalysisPrompt(text: string, opts: AnalyzeOptions = {}): ChatMessage[] {
  const clip = text.slice(0, opts.maxChars ?? DEFAULT_MAX_CHARS);
  return [
    {
      role: 'system',
      content:
        "Tu es un analyste de fiabilité de l'information. On te donne le texte d'une page web. " +
        'Évalue sa fiabilité et repère les signaux de désinformation ou de manipulation ' +
        '(sensationnalisme, absence de sources, appel émotionnel, théorie du complot, affirmations non vérifiables). ' +
        'Réponds STRICTEMENT en JSON, sans texte autour, au format : ' +
        '{"score": <entier 0-100>, "summary": "<phrase courte en français>", "signals": ["<signal>", ...]}. ' +
        'score élevé = fiable/sourcé ; score bas = désinformation probable.',
    },
    {
      role: 'user',
      content: `Domaine : ${opts.domain ?? 'inconnu'}\n\nContenu de la page :\n"""\n${clip}\n"""`,
    },
  ];
}

/**
 * Parse la réponse brute du modèle en `ReliabilityReport`. Tolérant : extrait
 * le premier objet JSON présent, valide les champs, et retombe sur un rapport
 * neutre si rien d'exploitable.
 */
export function parseReport(raw: string, domain?: string): ReliabilityReport {
  const withDomain = (r: Omit<ReliabilityReport, 'domain'>): ReliabilityReport =>
    domain ? { ...r, domain } : r;

  try {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end > start) {
      const parsed = JSON.parse(raw.slice(start, end + 1)) as {
        score?: unknown;
        summary?: unknown;
        signals?: unknown;
      };
      const score = clampScore(parsed.score);
      const signals = Array.isArray(parsed.signals)
        ? parsed.signals.filter((s): s is string => typeof s === 'string').slice(0, 8)
        : [];
      const summary =
        typeof parsed.summary === 'string' && parsed.summary.trim()
          ? parsed.summary.trim()
          : 'Évaluation générée par le modèle local.';
      return withDomain({ score, level: levelFromScore(score), summary, signals });
    }
  } catch (error) {
    logger.warn('ContentAnalysis: JSON non parsable, rapport neutre', error as Error);
  }

  return withDomain({
    score: 50,
    level: 'moyenne',
    summary: 'Analyse indisponible (le modèle n’a pas renvoyé de résultat structuré).',
    signals: [],
  });
}

/**
 * Analyse un texte de page et renvoie un rapport de fiabilité. Ne touche pas
 * à l'organisme (séparation des responsabilités) : l'appelant décide de
 * transmettre le signal via `organismSignal`.
 */
export async function analyzeContent(
  engine: ChatCapable,
  text: string,
  opts: AnalyzeOptions = {},
): Promise<ReliabilityReport> {
  const messages = buildAnalysisPrompt(text, opts);
  const raw = await engine.chat(messages, { temperature: 0.2, maxTokens: 400 });
  return parseReport(raw, opts.domain);
}
