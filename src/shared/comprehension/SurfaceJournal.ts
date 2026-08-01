// src/shared/comprehension/SurfaceJournal.ts
//
// Journal de ce qui a « fait surface » — la matière du « 3 choses qui ont bougé
// dans ta compréhension aujourd'hui ». Persistant, borné aux entrées récentes.

import { logger } from '@shared/utils/secureLogger';
import type { DeltaKind, RelationVerdict } from './types';
import type { KVStorage } from './KnowledgeStore';

export interface SurfaceEntry {
  ts: number;
  kind: DeltaKind;
  claimText: string;
  rationale: string;
  domain?: string;
  relatedClaimId?: string;
}

const KEY = 'symbiont_surface_journal';
const DEFAULT_MAX = 200;

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

export class SurfaceJournal {
  private readonly storage: KVStorage | undefined;
  private readonly max: number;

  constructor(opts?: { storage?: KVStorage; max?: number }) {
    this.storage = opts?.storage ?? chromeStorage();
    this.max = opts?.max ?? DEFAULT_MAX;
  }

  async load(): Promise<SurfaceEntry[]> {
    try {
      if (this.storage) {
        const raw = await this.storage.get(KEY);
        const entries = raw?.[KEY] as SurfaceEntry[] | undefined;
        if (Array.isArray(entries)) return entries;
      }
    } catch (error) {
      logger.warn('SurfaceJournal: chargement échoué', error as Error);
    }
    return [];
  }

  /** Ajoute des révisions surface (les plus récentes en tête), borné à `max`. */
  async append(
    revisions: RelationVerdict[],
    opts: { now: number; domain?: string },
  ): Promise<SurfaceEntry[]> {
    const entries = await this.load();
    const fresh: SurfaceEntry[] = revisions.map((r) => ({
      ts: opts.now,
      kind: r.kind,
      claimText: r.claimText,
      rationale: r.rationale,
      ...(opts.domain ? { domain: opts.domain } : {}),
      ...(r.relatedClaimId ? { relatedClaimId: r.relatedClaimId } : {}),
    }));
    const merged = [...fresh, ...entries].slice(0, this.max);
    try {
      if (this.storage) await this.storage.set({ [KEY]: merged });
    } catch (error) {
      logger.warn('SurfaceJournal: persistance échouée', error as Error);
    }
    return merged;
  }

  /** Entrées depuis un timestamp (ex. début de journée) pour la vue « ce qui a bougé ». */
  async since(ts: number): Promise<SurfaceEntry[]> {
    return (await this.load()).filter((e) => e.ts >= ts);
  }
}
