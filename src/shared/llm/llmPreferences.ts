// src/shared/llm/llmPreferences.ts
//
// Préférences du LLM local, persistées dans chrome.storage.local. Séparé de
// OrganismPreferences pour rester strictement additif (le module cognitif est
// opt-in et ne doit pas alourdir le chemin de rendu).

import { logger } from '@shared/utils/secureLogger';
import { normalizeModelId, DEFAULT_MODEL_ID } from './modelCatalog';

export interface LLMPreferences {
  /** L'utilisateur a activé le module cognitif local. */
  enabled: boolean;
  /** Modèle sélectionné (toujours normalisé vers un id du catalogue). */
  modelId: string;
  /**
   * L'utilisateur a explicitement consenti au téléchargement du modèle
   * (plusieurs centaines de Mo). Sépare « activé » de « a accepté le coût ».
   */
  downloadConsented: boolean;
  /**
   * Utiliser l'embedding sémantique (2ᵉ modèle ~240 Mo, meilleure récupération
   * des croyances) au lieu du hachage local. Opt-in.
   */
  semanticEmbedding: boolean;
  /**
   * Modèles dont les poids ont été téléchargés avec succès au moins une fois
   * (cache IndexedDB de WebLLM). Écrit au succès de load(), jamais avant —
   * `downloadConsented` signifie seulement « a accepté le coût », pas « les
   * poids sont sur le disque ». Permet de distinguer un premier téléchargement
   * d'une réactivation depuis le cache quand le moteur a été perdu (fermeture
   * du popup sur Firefox, fermeture du document offscreen sur Chrome).
   */
  cachedModelIds: string[];
}

const STORAGE_KEY = 'symbiont_llm_preferences';

const DEFAULTS: LLMPreferences = {
  enabled: false,
  modelId: DEFAULT_MODEL_ID,
  downloadConsented: false,
  semanticEmbedding: false,
  cachedModelIds: [],
};

type Listener = (prefs: LLMPreferences) => void;

function hasChromeStorage(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    !!chrome.storage &&
    !!chrome.storage.local
  );
}

class LLMPreferencesStore {
  private cache: LLMPreferences = { ...DEFAULTS };
  private listeners = new Set<Listener>();
  private loaded = false;

  constructor() {
    void this.load();
  }

  get(): LLMPreferences {
    return this.cache;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  async load(): Promise<LLMPreferences> {
    try {
      if (hasChromeStorage()) {
        const stored = await chrome.storage.local.get(STORAGE_KEY);
        const raw = (stored?.[STORAGE_KEY] ?? {}) as Partial<LLMPreferences>;
        this.cache = {
          enabled: raw.enabled ?? DEFAULTS.enabled,
          modelId: normalizeModelId(raw.modelId),
          downloadConsented: raw.downloadConsented ?? DEFAULTS.downloadConsented,
          semanticEmbedding: raw.semanticEmbedding ?? DEFAULTS.semanticEmbedding,
          cachedModelIds: Array.isArray(raw.cachedModelIds)
            ? raw.cachedModelIds.filter((id): id is string => typeof id === 'string')
            : [],
        };
      }
    } catch (error) {
      logger.warn('LLMPreferences: échec du chargement, valeurs par défaut', error as Error);
      this.cache = { ...DEFAULTS };
    } finally {
      this.loaded = true;
      this.notify();
    }
    return this.cache;
  }

  async update(patch: Partial<LLMPreferences>): Promise<LLMPreferences> {
    this.cache = {
      ...this.cache,
      ...patch,
      modelId: normalizeModelId(patch.modelId ?? this.cache.modelId),
    };
    try {
      if (hasChromeStorage()) {
        await chrome.storage.local.set({ [STORAGE_KEY]: this.cache });
      }
    } catch (error) {
      logger.warn('LLMPreferences: échec de la persistance', error as Error);
    }
    this.notify();
    return this.cache;
  }

  /**
   * Enregistre qu'un modèle est présent dans le cache de poids local.
   * À appeler uniquement après un `load()` réussi. Idempotent.
   */
  async markModelCached(modelId: string): Promise<LLMPreferences> {
    if (this.cache.cachedModelIds.includes(modelId)) {
      return this.cache;
    }
    return this.update({ cachedModelIds: [...this.cache.cachedModelIds, modelId] });
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) {
      try {
        l(this.cache);
      } catch (error) {
        logger.warn('LLMPreferences: listener en erreur', error as Error);
      }
    }
  }
}

export const llmPreferences = new LLMPreferencesStore();
