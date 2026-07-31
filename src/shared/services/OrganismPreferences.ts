// src/shared/services/OrganismPreferences.ts
// Préférences utilisateur réellement fonctionnelles, persistées dans
// chrome.storage.local et câblées au moteur de rendu (OrganismRenderer).
//
// Un cache synchrone permet au rendu (boucle d'animation) de lire les
// préférences à chaque frame sans await ; la valeur se met à jour dès que
// le chargement asynchrone se termine, et les abonnés sont notifiés.

import { logger } from '@shared/utils/secureLogger';

export type RenderQuality = 'high' | 'standard' | 'eco';

export interface OrganismPreferences {
  /** Fige les animations (accessibilité / économie). */
  reduceMotion: boolean;
  /** Qualité du rendu WebGL : supersampling appliqué. */
  renderQuality: RenderQuality;
}

const STORAGE_KEY = 'symbiont_preferences';

function defaultReduceMotion(): boolean {
  try {
    return typeof matchMedia === 'function'
      && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

const DEFAULTS: OrganismPreferences = {
  reduceMotion: defaultReduceMotion(),
  renderQuality: 'high',
};

/** Facteur de supersampling associé à chaque niveau de qualité. */
export const RENDER_SCALE: Record<RenderQuality, number> = {
  high: 2,
  standard: 1.5,
  eco: 1,
};

type Listener = (prefs: OrganismPreferences) => void;

class PreferencesStore {
  private cache: OrganismPreferences = { ...DEFAULTS };
  private listeners = new Set<Listener>();
  private loaded = false;

  constructor() {
    this.load();
  }

  /** Lecture synchrone (valeurs par défaut tant que le chargement n'est pas fini). */
  get(): OrganismPreferences {
    return this.cache;
  }

  async load(): Promise<OrganismPreferences> {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEY]);
      const stored = result?.[STORAGE_KEY] as Partial<OrganismPreferences> | undefined;
      this.cache = { ...DEFAULTS, ...(stored ?? {}) };
    } catch (error) {
      logger.warn('[Preferences] Load failed, using defaults', error);
      this.cache = { ...DEFAULTS };
    }
    this.loaded = true;
    this.notify();
    return this.cache;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  async update(patch: Partial<OrganismPreferences>): Promise<void> {
    this.cache = { ...this.cache, ...patch };
    this.notify();
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: this.cache });
    } catch (error) {
      logger.warn('[Preferences] Save failed', error);
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.cache);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) {
      try { l(this.cache); } catch { /* isolé */ }
    }
  }
}

export const organismPreferences = new PreferencesStore();
