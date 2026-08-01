// src/shared/comprehension/ClaimExtractor.ts
//
// Extrait d'une page les AFFIRMATIONS atomiques (« claims ») — des propositions
// vérifiables, pas des phrases. C'est l'unité du delta : on compare des
// affirmations à des croyances, pas des textes à des textes.

import { logger } from '@shared/utils/secureLogger';
import type { ChatCapable } from '../llm/ContentAnalysis';

const MAX_CHARS = 4000;

export function buildClaimPrompt(text: string, maxChars = MAX_CHARS): { role: 'system' | 'user'; content: string }[] {
  return [
    {
      role: 'system',
      content:
        "Tu extrais les affirmations factuelles principales d'un texte. Une affirmation = une " +
        'proposition vérifiable, autoportante, reformulée simplement (pas une citation). ' +
        'Ignore les opinions vagues, les formules de style, la navigation. ' +
        'Réponds STRICTEMENT en JSON : {"claims": ["...", "..."]} (3 à 6 maximum, les plus centrales).',
    },
    { role: 'user', content: `Texte :\n"""\n${text.slice(0, maxChars)}\n"""` },
  ];
}

export function parseClaims(raw: string): string[] {
  try {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end > start) {
      const parsed = JSON.parse(raw.slice(start, end + 1)) as { claims?: unknown };
      if (Array.isArray(parsed.claims)) {
        return parsed.claims
          .filter((c): c is string => typeof c === 'string')
          .map((c) => c.trim())
          .filter((c) => c.length >= 8)
          .slice(0, 6);
      }
    }
  } catch (error) {
    logger.warn('ClaimExtractor: JSON non parsable', error as Error);
  }
  return [];
}

export async function extractClaims(engine: ChatCapable, text: string): Promise<string[]> {
  const raw = await engine.chat(buildClaimPrompt(text), { temperature: 0.1, maxTokens: 400 });
  return parseClaims(raw);
}
