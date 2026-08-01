// src/shared/comprehension/KnowledgeStore.ts
//
// Persistance du modèle du monde (chrome.storage.local). Le symbiote doit
// survivre aux sessions et grossir. On borne la taille (contrainte de stockage)
// en gardant les croyances les plus saillantes.

import { logger } from '@shared/utils/secureLogger';
import type { Claim } from './types';
import { KnowledgeModel } from './KnowledgeModel';

/** Interface de stockage clé/valeur (chrome.storage.local en prod, mock en test). */
export interface KVStorage {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

const KEY = 'symbiont_knowledge_model';
const DEFAULT_MAX_CLAIMS = 500;

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

export class KnowledgeStore {
  private readonly storage: KVStorage | undefined;
  private readonly maxClaims: number;

  constructor(opts?: { storage?: KVStorage; maxClaims?: number }) {
    this.storage = opts?.storage ?? chromeStorage();
    this.maxClaims = opts?.maxClaims ?? DEFAULT_MAX_CLAIMS;
  }

  /** Charge le modèle persistant (vide si rien / erreur). */
  async load(): Promise<KnowledgeModel> {
    try {
      if (this.storage) {
        const raw = await this.storage.get(KEY);
        const claims = raw?.[KEY] as Claim[] | undefined;
        if (Array.isArray(claims)) return KnowledgeModel.fromJSON(claims);
      }
    } catch (error) {
      logger.warn('KnowledgeStore: chargement échoué, modèle vide', error as Error);
    }
    return new KnowledgeModel();
  }

  /** Persiste le modèle (borné à maxClaims). Retourne le nombre élagué. */
  async save(model: KnowledgeModel): Promise<number> {
    const pruned = model.prune(this.maxClaims);
    try {
      if (this.storage) await this.storage.set({ [KEY]: model.toJSON() });
    } catch (error) {
      logger.warn('KnowledgeStore: persistance échouée', error as Error);
    }
    return pruned;
  }
}
