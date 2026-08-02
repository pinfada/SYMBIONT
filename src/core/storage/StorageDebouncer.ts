/**
 * StorageDebouncer - Réduit les écritures IndexedDB par debouncing
 *
 * PROBLÈME RÉSOLU:
 * - Avant: saveOrganism() appelé toutes les 30s → 120 écritures/h
 * - Après: Debounce de 2s → Maximum 30 écritures/h (si changements constants)
 *
 * GAIN: -75% écritures IndexedDB
 */

import { OrganismState } from '../../shared/types/organism';
import { IndexedDBCoordinator } from './IndexedDBCoordinator';
import { logger } from '../../shared/utils/secureLogger';

/** Un appelant qui attend que son écriture soit réellement passée. */
interface Waiter {
  resolve: () => void;
  reject: (error: unknown) => void;
}

interface DebouncedOperation<T> {
  data: T;
  timer: ReturnType<typeof setTimeout>;
  timestamp: number;
  /**
   * Tous les appelants en attente de cette écriture.
   *
   * Un `saveX()` qui en supplante un autre DOIT hériter de ses waiters. Sans
   * ça, la promesse supplantée ne se résout jamais : la frame async de son
   * appelant est retenue indéfiniment. `updateOrganismTraits()` faisant un
   * `await saveOrganism()` à chaque visite de page, la moindre navigation
   * rapide fuyait une frame — d'où la montée mémoire en usage prolongé.
   */
  waiters: Waiter[];
}

/** Vide la liste et résout tout le monde. Vider évite un double-règlement. */
function resolveAll(waiters: Waiter[]): void {
  for (const waiter of waiters.splice(0)) waiter.resolve();
}

/** Vide la liste et rejette tout le monde avec la même erreur. */
function rejectAll(waiters: Waiter[], error: unknown): void {
  for (const waiter of waiters.splice(0)) waiter.reject(error);
}

export class StorageDebouncer {
  private static instance: StorageDebouncer | null = null;
  private pendingOrganisms = new Map<string, DebouncedOperation<OrganismState>>();
  private pendingBehaviors = new Map<string, DebouncedOperation<any>>();
  private readonly DEBOUNCE_MS: number;
  private readonly MAX_PENDING_TIME_MS: number;
  private coordinator: IndexedDBCoordinator | null = null;

  private constructor(debounceMs: number = 2000, maxPendingMs: number = 10000) {
    this.DEBOUNCE_MS = debounceMs; // 2 secondes par défaut
    this.MAX_PENDING_TIME_MS = maxPendingMs; // Flush forcé après 10s max
  }

  static getInstance(debounceMs?: number, maxPendingMs?: number): StorageDebouncer {
    if (!this.instance) {
      this.instance = new StorageDebouncer(debounceMs, maxPendingMs);
    }
    return this.instance;
  }

  async setCoordinator(coordinator: IndexedDBCoordinator): Promise<void> {
    this.coordinator = coordinator;
  }

  /**
   * Sauvegarde debounced d'un organisme
   */
  async saveOrganism(organism: OrganismState): Promise<void> {
    if (!this.coordinator) {
      throw new Error('Coordinator not set');
    }
    return this.schedule(
      this.pendingOrganisms,
      'organism-' + organism.id,
      organism,
      (key, data) => this._flushOrganism(key, data),
      { organismId: organism.id }
    );
  }

  /**
   * Sauvegarde debounced d'un behavior
   */
  async saveBehavior(behavior: any): Promise<void> {
    if (!this.coordinator) {
      throw new Error('Coordinator not set');
    }
    return this.schedule(
      this.pendingBehaviors,
      'behavior-' + behavior.url,
      behavior,
      (key, data) => this._flushBehavior(key, data),
      { url: behavior.url }
    );
  }

  /**
   * Planifie une écriture debounced et renvoie une promesse qui se résout
   * quand l'écriture est réellement passée.
   *
   * Chemin unique pour organismes et behaviors : les deux avaient la même
   * logique dupliquée, donc le même défaut à corriger deux fois.
   *
   * @param pending registre des opérations en attente pour ce type
   * @param key clé de coalescence (une écriture en vol par clé)
   * @param data données à écrire ; la plus récente gagne
   * @param flush écriture effective
   * @param logContext champs ajoutés aux logs de debug
   */
  private async schedule<T>(
    pending: Map<string, DebouncedOperation<T>>,
    key: string,
    data: T,
    flush: (key: string, data: T) => Promise<void>,
    logContext: Record<string, unknown>
  ): Promise<void> {
    const now = Date.now();
    const existing = pending.get(key);

    // Les appelants déjà en attente sur cette clé seront servis par l'écriture
    // qu'on planifie ici (elle porte des données plus récentes) : on reprend
    // leurs resolvers. Les perdre laissait leurs promesses pendantes à jamais.
    const inherited = existing ? existing.waiters : [];
    const startedAt = existing ? existing.timestamp : now;

    if (existing) {
      clearTimeout(existing.timer);
      pending.delete(key);
    }

    // En attente depuis trop longtemps : on écrit maintenant plutôt que de
    // repousser le flush indéfiniment sous un flux d'appels continu.
    if (existing && now - startedAt > this.MAX_PENDING_TIME_MS) {
      logger.debug('[StorageDebouncer] Max pending time reached, flushing immediately', {
        ...logContext,
        pendingTime: now - startedAt
      });
      try {
        await flush(key, data);
      } catch (error) {
        rejectAll(inherited, error);
        throw error;
      }
      resolveAll(inherited);
      return;
    }

    return new Promise<void>((resolve, reject) => {
      const waiters: Waiter[] = [...inherited, { resolve, reject }];

      const timer = setTimeout(async () => {
        try {
          await flush(key, data);
          resolveAll(waiters);
        } catch (error) {
          logger.error('[StorageDebouncer] Failed to flush', error);
          rejectAll(waiters, error);
        }
      }, this.DEBOUNCE_MS);

      pending.set(key, { data, timer, timestamp: startedAt, waiters });

      logger.debug('[StorageDebouncer] Save debounced', {
        ...logContext,
        debounceMs: this.DEBOUNCE_MS,
        waiting: waiters.length
      });
    });
  }

  /**
   * Flush immédiat d'un organisme spécifique
   */
  private async _flushOrganism(key: string, organism: OrganismState): Promise<void> {
    if (!this.coordinator) {
      throw new Error('Coordinator not set');
    }

    try {
      logger.debug('[StorageDebouncer] Flushing organism', { organismId: organism.id });
      await this.coordinator.saveOrganism(organism);
      this.pendingOrganisms.delete(key);
      logger.debug('[StorageDebouncer] Organism flushed successfully', { organismId: organism.id });
    } catch (error) {
      logger.error('[StorageDebouncer] Failed to flush organism', error);
      throw error;
    }
  }

  /**
   * Flush immédiat d'un behavior spécifique
   */
  private async _flushBehavior(key: string, behavior: any): Promise<void> {
    if (!this.coordinator) {
      throw new Error('Coordinator not set');
    }

    try {
      logger.debug('[StorageDebouncer] Flushing behavior', { url: behavior.url });
      await this.coordinator.saveBehavior(behavior);
      this.pendingBehaviors.delete(key);
      logger.debug('[StorageDebouncer] Behavior flushed successfully', { url: behavior.url });
    } catch (error) {
      logger.error('[StorageDebouncer] Failed to flush behavior', error);
      throw error;
    }
  }

  /**
   * Flush TOUT immédiatement (appelé au shutdown ou avant navigation)
   */
  async flushAll(): Promise<void> {
    logger.info('[StorageDebouncer] Flushing all pending operations', {
      pendingOrganisms: this.pendingOrganisms.size,
      pendingBehaviors: this.pendingBehaviors.size
    });

    // Chaque opération doit régler ses waiters, sinon un flushAll() (shutdown,
    // dispose) laisse pendantes toutes les promesses en attente — la même
    // fuite que sur le chemin de supplantation.
    const drain = <T>(
      pending: Map<string, DebouncedOperation<T>>,
      flush: (key: string, data: T) => Promise<void>
    ): Promise<void>[] =>
      [...pending].map(async ([key, operation]) => {
        clearTimeout(operation.timer);
        try {
          await flush(key, operation.data);
          resolveAll(operation.waiters);
        } catch (error) {
          rejectAll(operation.waiters, error);
          throw error;
        }
      });

    const promises = [
      ...drain(this.pendingOrganisms, (key, data) => this._flushOrganism(key, data)),
      ...drain(this.pendingBehaviors, (key, data) => this._flushBehavior(key, data))
    ];

    try {
      await Promise.all(promises);
      logger.info('[StorageDebouncer] All operations flushed successfully');
    } catch (error) {
      logger.error('[StorageDebouncer] Some operations failed during flush', error);
      throw error;
    }
  }

  /**
   * Obtient le nombre d'opérations en attente
   */
  getPendingCount(): { organisms: number; behaviors: number; total: number } {
    const organisms = this.pendingOrganisms.size;
    const behaviors = this.pendingBehaviors.size;
    return {
      organisms,
      behaviors,
      total: organisms + behaviors
    };
  }

  /**
   * Cleanup (appelé au shutdown)
   */
  async dispose(): Promise<void> {
    logger.info('[StorageDebouncer] Disposing');

    // Flush tout avant de dispose
    await this.flushAll();

    // Clear toutes les timers restantes (au cas où)
    for (const [, operation] of this.pendingOrganisms) {
      clearTimeout(operation.timer);
    }
    for (const [, operation] of this.pendingBehaviors) {
      clearTimeout(operation.timer);
    }

    this.pendingOrganisms.clear();
    this.pendingBehaviors.clear();
    this.coordinator = null;

    logger.info('[StorageDebouncer] Disposed');
  }

  /**
   * Reset singleton (pour tests)
   */
  static reset(): void {
    if (this.instance) {
      this.instance.dispose().catch(err =>
        logger.error('[StorageDebouncer] Error during reset', err)
      );
      this.instance = null;
    }
  }
}

// Export singleton getter
export function getStorageDebouncer(debounceMs?: number, maxPendingMs?: number): StorageDebouncer {
  return StorageDebouncer.getInstance(debounceMs, maxPendingMs);
}
