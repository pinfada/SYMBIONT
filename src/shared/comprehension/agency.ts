// src/shared/comprehension/agency.ts
//
// L'agentivité du symbiote (pari n°3 de docs/VISION.md) : le droit de dire
// « non, pas ça » — mais de façon ACCEPTABLE, pas paternaliste. La grammaire :
//
//   1. il ne résiste que sur un SCHÉMA (jamais un item isolé) ;
//   2. il EXPLIQUE toujours pourquoi ;
//   3. il REDIRIGE (propose une alternative) plutôt que de bloquer ;
//   4. tu peux TOUJOURS passer outre (canOverride est toujours vrai).
//
// C'est un agent, pas un cerbère : il négocie, il n'interdit pas.

import { logger } from '@shared/utils/secureLogger';
import type { DeltaKind } from './types';
import type { ReliabilityLevel } from '../llm/ContentAnalysis';
import type { KVStorage } from './KnowledgeStore';

/** Une lecture récente, pour juger le « régime » de consommation. */
export interface DietItem {
  ts: number;
  /** A fait surface (a révisé la compréhension) ? */
  surfaced: boolean;
  /** Relation dominante de la digestion, si connue. */
  dominantKind?: DeltaKind;
  /** Fiabilité de la page, si une analyse a eu lieu. */
  reliability?: ReliabilityLevel;
}

/** Posture du symbiote face à une action proposée. */
export type AgencyStance = 'accept' | 'reluctant' | 'redirect';

export interface AgencyVerdict {
  stance: AgencyStance;
  /** Explication (vide si accept). */
  reason: string;
  /** L'utilisateur peut toujours forcer : TOUJOURS vrai (agent, pas cerbère). */
  canOverride: boolean;
  /** Alternative proposée en cas de redirection. */
  suggestion?: string;
}

const WINDOW = 5;
const LOW_RELIABILITY_STREAK = 3;
const ECHO_MIN = 4;
const LOW_ENERGY = 20;

/**
 * Décide la posture du symbiote AVANT une digestion, d'après son énergie et son
 * régime récent (le plus récent en tête). Pur et déterministe.
 */
export function decideAgency(input: { energy: number; recentDiet: DietItem[] }): AgencyVerdict {
  const recent = input.recentDiet.slice(0, WINDOW);
  const accept: AgencyVerdict = { stance: 'accept', reason: '', canOverride: true };

  // 1) Régime peu fiable répété → redirige vers autre chose.
  const lowReliability = recent.filter((d) => d.reliability === 'faible').length;
  if (lowReliability >= LOW_RELIABILITY_STREAK) {
    return {
      stance: 'redirect',
      reason: 'Tu enchaînes du contenu peu fiable. Je préfère t’aider à chercher autre chose.',
      canOverride: true,
      suggestion: 'Lance « 🔎 Ce que je cherche à comprendre ».',
    };
  }

  // 2) Chambre d'écho : plusieurs lectures d'affilée qui ne révisent RIEN.
  if (recent.length >= ECHO_MIN && recent.every((d) => !d.surfaced)) {
    return {
      stance: 'redirect',
      reason: 'Tes dernières lectures n’ont rien changé à ta compréhension — tu tournes en rond.',
      canOverride: true,
      suggestion: 'Et si tu te laissais surprendre ? Essaie « 🔎 Ce que je cherche à comprendre ».',
    };
  }

  // 3) Fatigue : énergie basse → réticence (mais jamais un refus dur).
  if (input.energy < LOW_ENERGY) {
    return {
      stance: 'reluctant',
      reason: 'Je suis fatigué (énergie basse). On peut lever le pied — ou insiste si c’est important.',
      canOverride: true,
    };
  }

  return accept;
}

// --- Persistance du régime récent -------------------------------------------

const KEY = 'symbiont_diet_log';
const DEFAULT_MAX = 30;

function chromeStorage(): KVStorage | undefined {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const local = chrome.storage.local;
    return {
      get: (key) => local.get(key) as Promise<Record<string, unknown>>,
      set: (items) => local.set(items) as Promise<void>,
    };
  }
  return undefined;
}

export class DietLog {
  private readonly storage: KVStorage | undefined;
  private readonly max: number;

  constructor(opts?: { storage?: KVStorage; max?: number }) {
    this.storage = opts?.storage ?? chromeStorage();
    this.max = opts?.max ?? DEFAULT_MAX;
  }

  /** Régime récent, le plus récent en tête. */
  async load(): Promise<DietItem[]> {
    try {
      if (this.storage) {
        const raw = await this.storage.get(KEY);
        const items = raw?.[KEY] as DietItem[] | undefined;
        if (Array.isArray(items)) return items;
      }
    } catch (error) {
      logger.warn('DietLog: chargement échoué', error as Error);
    }
    return [];
  }

  /** Enregistre une lecture (en tête), borné à `max`. */
  async record(item: DietItem): Promise<DietItem[]> {
    const items = await this.load();
    const merged = [item, ...items].slice(0, this.max);
    try {
      if (this.storage) await this.storage.set({ [KEY]: merged });
    } catch (error) {
      logger.warn('DietLog: persistance échouée', error as Error);
    }
    return merged;
  }
}
