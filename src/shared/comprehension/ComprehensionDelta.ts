// src/shared/comprehension/ComprehensionDelta.ts
//
// Le moteur du delta de compréhension (pari n°1 de la vision). Pour chaque
// affirmation d'une page, il récupère les croyances proches déjà assimilées et
// demande au LLM local de CLASSER la relation : confirme / complète / contredit
// / déplace / nouveau. Puis il agrège en un score de révision et décide si le
// symbiote doit « faire surface » ou digérer en silence.
//
// Invariant fondateur (anti-feed) : la NOUVEAUTÉ pure ne fait jamais surface.
// Seule une relation au modèle déjà su (contredit/déplace/complète) le peut.

import { logger } from '@shared/utils/secureLogger';
import type { ChatCapable } from '../llm/ContentAnalysis';
import type { KnowledgeModel } from './KnowledgeModel';
import {
  type DeltaKind,
  type DeltaReport,
  type RelationVerdict,
  KIND_WEIGHT,
  SURFACE_THRESHOLD,
  SURFACING_KINDS,
} from './types';

const VALID_KINDS: ReadonlySet<string> = new Set<DeltaKind>([
  'confirme',
  'complète',
  'contredit',
  'déplace',
  'nouveau',
]);

function normalizeKind(raw: unknown): DeltaKind {
  const k = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  const map: Record<string, DeltaKind> = {
    confirme: 'confirme',
    confirms: 'confirme',
    complète: 'complète',
    complete: 'complète',
    contredit: 'contredit',
    contradicts: 'contredit',
    déplace: 'déplace',
    deplace: 'déplace',
    reframes: 'déplace',
    nouveau: 'nouveau',
    new: 'nouveau',
  };
  return map[k] ?? (VALID_KINDS.has(k) ? (k as DeltaKind) : 'nouveau');
}

export function buildRelationPrompt(
  newClaim: string,
  knownClaims: { id: string; text: string }[],
): { role: 'system' | 'user'; content: string }[] {
  const known = knownClaims.length
    ? knownClaims.map((c, i) => `[${i}] ${c.text}`).join('\n')
    : '(le modèle ne contient encore rien de proche)';
  return [
    {
      role: 'system',
      content:
        "On te donne une AFFIRMATION nouvelle et des CROYANCES déjà assimilées par l'utilisateur. " +
        'Classe la relation de l\'affirmation au modèle existant, en choisissant :\n' +
        '- "confirme" : redit une croyance existante (rien de neuf) ;\n' +
        '- "complète" : ajoute une nuance/précision à une croyance existante ;\n' +
        '- "contredit" : s\'oppose à une croyance existante ;\n' +
        '- "déplace" : recadre / change la manière de voir une croyance existante ;\n' +
        '- "nouveau" : sans lien réel avec les croyances listées.\n' +
        'Réponds STRICTEMENT en JSON : ' +
        '{"kind":"...", "related":<index de la croyance concernée ou -1>, "confidence":0..1, "rationale":"court"}.',
    },
    { role: 'user', content: `AFFIRMATION :\n${newClaim}\n\nCROYANCES :\n${known}` },
  ];
}

function parseRelation(
  raw: string,
  newClaim: string,
  knownClaims: { id: string; text: string }[],
): RelationVerdict {
  try {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end > start) {
      const p = JSON.parse(raw.slice(start, end + 1)) as {
        kind?: unknown;
        related?: unknown;
        confidence?: unknown;
        rationale?: unknown;
      };
      const kind = normalizeKind(p.kind);
      const relIdx = typeof p.related === 'number' ? p.related : -1;
      const related = relIdx >= 0 && relIdx < knownClaims.length ? knownClaims[relIdx] : undefined;
      const confidence =
        typeof p.confidence === 'number' && Number.isFinite(p.confidence)
          ? Math.max(0, Math.min(1, p.confidence))
          : 0.5;
      return {
        claimText: newClaim,
        kind: kind === 'nouveau' ? 'nouveau' : related ? kind : 'nouveau',
        ...(related ? { relatedClaimId: related.id } : {}),
        confidence,
        rationale: typeof p.rationale === 'string' ? p.rationale : '',
      };
    }
  } catch (error) {
    logger.warn('ComprehensionDelta: relation non parsable', error as Error);
  }
  return { claimText: newClaim, kind: 'nouveau', confidence: 0.3, rationale: 'non classé' };
}

/**
 * Évalue le delta de compréhension d'un ensemble d'affirmations vis-à-vis du
 * modèle. NE MODIFIE PAS le modèle (l'accrétion est laissée à l'appelant, qui
 * décide quoi digérer). Pur et testable (moteur injecté).
 */
export async function assessDelta(
  engine: ChatCapable,
  model: KnowledgeModel,
  claims: string[],
  opts: { domain?: string } = {},
): Promise<DeltaReport> {
  const verdicts: RelationVerdict[] = [];

  for (const claim of claims) {
    const candidates = model.retrieve(claim, 5).map((r) => ({ id: r.claim.id, text: r.claim.text }));
    const raw = await engine.chat(buildRelationPrompt(claim, candidates), {
      temperature: 0.1,
      maxTokens: 200,
    });
    verdicts.push(parseRelation(raw, claim, candidates));
  }

  // Score = max des poids pondérés par la confiance. La nouveauté pure pèse peu.
  let score = 0;
  let dominant: RelationVerdict | undefined;
  for (const v of verdicts) {
    const s = KIND_WEIGHT[v.kind] * v.confidence;
    if (s > score) {
      score = s;
      dominant = v;
    }
  }

  const revisions = verdicts.filter(
    (v) => SURFACING_KINDS.has(v.kind) && KIND_WEIGHT[v.kind] * v.confidence >= SURFACE_THRESHOLD,
  );

  return {
    score,
    surface: revisions.length > 0,
    dominantKind: dominant?.kind ?? 'confirme',
    revisions,
    verdicts,
    ...(opts.domain ? { domain: opts.domain } : {}),
  };
}
