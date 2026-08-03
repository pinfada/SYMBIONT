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
  /**
   * `false` quand le modèle n'a rien produit d'exploitable : le rapport est
   * alors un marqueur d'échec, pas un verdict.
   *
   * Sans ce drapeau, l'échec renvoyait `score: 50 / level: 'moyenne'`, que
   * rien ne distinguait d'une vraie évaluation « moyenne » : l'UI affichait un
   * verdict inventé et l'organisme recevait un signal de vigilance fondé sur
   * du vide. Tout consommateur doit traiter `parsed: false` comme « pas
   * d'analyse », jamais comme un score.
   */
  parsed: boolean;
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

/** Retire les clôtures markdown (```json …  ```) dont les petits modèles entourent souvent leur JSON. */
function stripFences(raw: string): string {
  return raw.replace(/```(?:json)?/gi, '');
}

/**
 * Extrait le premier objet JSON *complet* par comptage d'accolades, en
 * ignorant celles situées dans une chaîne. Plus sûr que `indexOf('{')` +
 * `lastIndexOf('}')`, qui agrège deux objets distincts en une tranche invalide.
 * Renvoie null si aucun objet complet — cas fréquent d'une génération tronquée.
 */
function firstBalancedObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
    } else if (ch === '\\') {
      escaped = true;
    } else if (ch === '"') {
      inString = !inString;
    } else if (!inString) {
      if (ch === '{') depth += 1;
      else if (ch === '}' && --depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/** Champs bruts attendus du modèle, avant validation. */
interface RawFields {
  score?: unknown;
  summary?: unknown;
  signals?: unknown;
}

/**
 * Récupération de dernier recours sur une sortie tronquée ou presque-JSON.
 * On n'accepte que si une clé "score" est présente : c'est la preuve que le
 * modèle a tenté le format demandé. Sans elle, on refuse d'inventer un verdict.
 */
function salvageFields(text: string): RawFields | null {
  const score = /"score"\s*:\s*(-?\d+(?:\.\d+)?)/.exec(text);
  if (!score) return null;

  const summary = /"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(text);
  const signalsBlock = /"signals"\s*:\s*\[([^\]]*)\]/.exec(text);
  const signals = signalsBlock
    ? [...signalsBlock[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1])
    : [];

  return {
    score: Number(score[1]),
    ...(summary ? { summary: summary[1] } : {}),
    signals,
  };
}

/**
 * Valide les champs bruts. Renvoie null si le score est inexploitable : un
 * JSON valide mais sans score n'est pas un verdict, et le compter comme tel
 * fabriquerait un 50/100 que le modèle n'a jamais donné.
 */
function toReport(fields: RawFields, domain?: string): ReliabilityReport | null {
  const raw = typeof fields.score === 'string' ? Number(fields.score) : fields.score;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;

  const score = clampScore(raw);
  const signals = Array.isArray(fields.signals)
    ? fields.signals.filter((s): s is string => typeof s === 'string').slice(0, 8)
    : [];
  const summary =
    typeof fields.summary === 'string' && fields.summary.trim()
      ? fields.summary.trim()
      : 'Évaluation générée par le modèle local.';

  const report = { score, level: levelFromScore(score), summary, signals, parsed: true };
  return domain ? { ...report, domain } : report;
}

/**
 * Parse la réponse brute du modèle en `ReliabilityReport`, du plus strict au
 * plus tolérant. Si rien n'est exploitable, renvoie un rapport marqué
 * `parsed: false` — un marqueur d'échec, pas un verdict à 50/100.
 */
export function parseReport(raw: string, domain?: string): ReliabilityReport {
  const text = stripFences(raw);

  const objectText = firstBalancedObject(text);
  if (objectText) {
    try {
      const report = toReport(JSON.parse(objectText) as RawFields, domain);
      if (report) return report;
      logger.warn('ContentAnalysis: JSON valide mais score absent ou non numérique');
    } catch (error) {
      logger.warn('ContentAnalysis: objet JSON non parsable', error as Error);
    }
  }

  // Sortie tronquée (max_tokens atteint) ou JSON approximatif : on tente de
  // récupérer les champs plutôt que de jeter une réponse qui existe.
  const salvaged = salvageFields(text);
  if (salvaged) {
    const report = toReport(salvaged, domain);
    if (report) {
      logger.warn('ContentAnalysis: JSON incomplet, champs récupérés en format libre');
      return report;
    }
  }

  logger.warn('ContentAnalysis: aucune sortie structurée exploitable');
  const failed = {
    score: 50,
    level: 'moyenne' as ReliabilityLevel,
    summary: 'Analyse indisponible (le modèle n’a pas renvoyé de résultat structuré).',
    signals: [],
    parsed: false,
  };
  return domain ? { ...failed, domain } : failed;
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
