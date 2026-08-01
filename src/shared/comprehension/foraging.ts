// src/shared/comprehension/foraging.ts
//
// « Fourrage » (foraging / anti-recherche) — le pari inverse du moteur de
// recherche. Au lieu que l'utilisateur formule une requête, c'est l'organisme
// qui dérive, DE SON PROPRE modèle du monde, ce qu'il est curieux de comprendre
// ensuite. Deux gisements de curiosité : les croyances CONTESTÉES (remises en
// cause récemment par une surface 'contredit'/'déplace') et les croyances
// MINCES (peu saillantes, là où l'organisme est superficiel).
//
// Pur & moteur injecté (aucun chrome, aucun temps caché) : `selectForagingSeeds`
// choisit les graines depuis le modèle + le journal surface ; `deriveForagingTargets`
// demande au LLM local d'en tirer des QUESTIONS ouvertes à explorer.

import { logger } from '@shared/utils/secureLogger';
import type { KnowledgeModel } from './KnowledgeModel';
import type { SurfaceEntry } from './SurfaceJournal';
import type { ChatCapable } from '../llm/ContentAnalysis';

/** Une croyance jugée digne d'être creusée, avec la raison de son choix. */
export interface ForagingSeed {
  id: string;
  text: string;
  reason: 'contested' | 'thin';
}

/** Une question ouverte que l'organisme veut explorer, tirée d'une ou plusieurs graines. */
export interface ForagingTarget {
  question: string;
  rationale: string;
  weight: number;
  seedIds: string[];
}

const DEFAULT_MAX_SEEDS = 6;
const DEFAULT_CURIOSITY = 0.5;

/** Relations surface qui « contestent » une croyance (les autres ne comptent pas ici). */
const CONTESTING_KINDS = new Set(['contredit', 'déplace']);

/** En dessous de cette saillance, l'organisme est superficiel sur la croyance. */
const THIN_SALIENCE = 1;

/** Poids relatif d'une graine : une croyance contestée vaut plus qu'une croyance mince. */
const REASON_WEIGHT: Record<ForagingSeed['reason'], number> = {
  contested: 1,
  thin: 0.5,
};

/**
 * Choisit les croyances à explorer. Pur. `contested` = croyances référencées par
 * des entrées surface récentes 'contredit'/'déplace' (via `relatedClaimId`).
 * `thin` = croyances peu saillantes (salience <= 1). Dédupliqué (les contestées
 * priment sur les minces), borné à `max` (défaut 6).
 */
export function selectForagingSeeds(
  model: KnowledgeModel,
  recentSurface: SurfaceEntry[],
  max: number = DEFAULT_MAX_SEEDS,
): ForagingSeed[] {
  const seeds: ForagingSeed[] = [];
  const seen = new Set<string>();

  // 1) Croyances contestées — parcours des surfaces récentes, ordre conservé.
  for (const entry of recentSurface) {
    if (!CONTESTING_KINDS.has(entry.kind)) continue;
    if (!entry.relatedClaimId) continue;
    const claim = model.get(entry.relatedClaimId);
    if (!claim || seen.has(claim.id)) continue;
    seen.add(claim.id);
    seeds.push({ id: claim.id, text: claim.text, reason: 'contested' });
  }

  // 2) Croyances minces — là où l'organisme reste superficiel.
  for (const claim of model.all()) {
    if (claim.salience > THIN_SALIENCE) continue;
    if (seen.has(claim.id)) continue;
    seen.add(claim.id);
    seeds.push({ id: claim.id, text: claim.text, reason: 'thin' });
  }

  return seeds.slice(0, Math.max(0, max));
}

/** Nombre de questions visées : la curiosité (0..1) dilate la largeur d'exploration. */
function targetLimit(curiosity: number, max?: number): number {
  const c = Math.max(0, Math.min(1, Number.isFinite(curiosity) ? curiosity : DEFAULT_CURIOSITY));
  const fromCuriosity = Math.max(1, Math.round(1 + c * 5)); // curiosité 0 → 1, 0.5 → 4, 1 → 6
  return max !== undefined ? Math.min(Math.max(0, max), fromCuriosity) : fromCuriosity;
}

function buildForagingPrompt(
  seeds: ForagingSeed[],
  limit: number,
): { role: 'system' | 'user'; content: string }[] {
  const list = seeds
    .map((s, i) => `[${i}] (${s.reason === 'contested' ? 'contestée' : 'mince'}) ${s.text}`)
    .join('\n');
  return [
    {
      role: 'system',
      content:
        "Tu es la curiosité d'un organisme qui apprend. On te donne ses croyances les plus " +
        'instables (contestées) ou superficielles (minces). Formule des QUESTIONS OUVERTES que ' +
        "l'organisme voudrait explorer pour approfondir ou trancher — pas des requêtes, pas des " +
        'réponses. Chaque question relie une ou plusieurs croyances par leur index. ' +
        `Propose au plus ${limit} questions, les plus fécondes d'abord. ` +
        'Réponds STRICTEMENT en JSON, sans texte autour : ' +
        '{"targets":[{"question":"<question ouverte>","rationale":"<pourquoi, phrase courte>","seeds":[<index>,...]}]}.',
    },
    { role: 'user', content: `Croyances :\n${list}` },
  ];
}

/** Poids d'une cible : somme des poids de raison des graines couvertes, borné. */
function targetWeight(seedIds: string[], byId: Map<string, ForagingSeed>): number {
  let sum = 0;
  for (const id of seedIds) {
    const seed = byId.get(id);
    if (seed) sum += REASON_WEIGHT[seed.reason];
  }
  const w = sum > 0 ? sum : 0.1; // une cible sans graine reconnue garde un poids minimal
  return Math.round(Math.max(0.1, Math.min(10, w)) * 100) / 100;
}

/**
 * Parse la réponse brute du modèle en `ForagingTarget[]`. Tolérant : extrait le
 * premier objet JSON, mappe les index de graines vers leurs ids, ignore les
 * index hors bornes, et retombe sur `[]` si rien d'exploitable.
 */
export function parseForagingTargets(
  raw: string,
  seeds: ForagingSeed[],
  limit: number,
): ForagingTarget[] {
  const byId = new Map(seeds.map((s) => [s.id, s]));
  try {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end > start) {
      const parsed = JSON.parse(raw.slice(start, end + 1)) as { targets?: unknown };
      if (Array.isArray(parsed.targets)) {
        const targets: ForagingTarget[] = [];
        for (const t of parsed.targets) {
          const obj = t as { question?: unknown; rationale?: unknown; seeds?: unknown };
          const question = typeof obj.question === 'string' ? obj.question.trim() : '';
          if (question.length < 8) continue;
          const rationale =
            typeof obj.rationale === 'string' && obj.rationale.trim()
              ? obj.rationale.trim()
              : "Exploration dérivée du modèle de l'organisme.";
          const seedIds = Array.isArray(obj.seeds)
            ? obj.seeds
                .filter((i): i is number => typeof i === 'number' && Number.isInteger(i))
                .map((i) => seeds[i])
                .filter((s): s is ForagingSeed => s !== undefined)
                .map((s) => s.id)
            : [];
          targets.push({ question, rationale, weight: targetWeight(seedIds, byId), seedIds });
        }
        return targets.slice(0, Math.max(0, limit));
      }
    }
  } catch (error) {
    logger.warn('Foraging: JSON non parsable, aucune cible', error as Error);
  }
  return [];
}

/**
 * Demande au LLM local de transformer les graines en questions ouvertes que
 * l'organisme veut explorer. `curiosity` (0..1, défaut 0.5) dilate le nombre de
 * cibles (plus curieux → plus, plus large). Retourne `[]` sans graine.
 */
export async function deriveForagingTargets(
  engine: ChatCapable,
  seeds: ForagingSeed[],
  opts: { curiosity?: number; max?: number } = {},
): Promise<ForagingTarget[]> {
  if (seeds.length === 0) return [];
  const limit = targetLimit(opts.curiosity ?? DEFAULT_CURIOSITY, opts.max);
  const raw = await engine.chat(buildForagingPrompt(seeds, limit), {
    temperature: 0.6,
    maxTokens: 500,
  });
  return parseForagingTargets(raw, seeds, limit);
}
