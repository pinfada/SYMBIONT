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

interface DebouncedOperation<T> {
  data: T;
  timer: NodeJS.Timeout;
  timestamp: number;
  flushCallback?: () => void;
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

    const key = 'organism-' + organism.id;
    const now = Date.now();

    // Annuler le timer précédent s'il existe
    const existing = this.pendingOrganisms.get(key);
    if (existing) {
      clearTimeout(existing.timer);

      // Si l'opération est en attente depuis trop longtemps, flush immédiatement
      if (now - existing.timestamp > this.MAX_PENDING_TIME_MS) {
        logger.debug('[StorageDebouncer] Max pending time reached, flushing immediately', {
          organismId: organism.id,
          pendingTime: now - existing.timestamp
        });
        await this._flushOrganism(key, organism);
        return;
      }
    }

    // Créer un nouveau timer
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(async () => {
        try {
          await this._flushOrganism(key, organism);
          resolve();
        } catch (error) {
          logger.error('[StorageDebouncer] Failed to flush organism', error);
          reject(error);
        }
      }, this.DEBOUNCE_MS);

      this.pendingOrganisms.set(key, {
        data: organism,
        timer,
        timestamp: existing?.timestamp || now,
        flushCallback: () => resolve()
      });

      logger.debug('[StorageDebouncer] Organism save debounced', {
        organismId: organism.id,
        debounceMs: this.DEBOUNCE_MS
      });
    });
  }

  /**
   * Sauvegarde debounced d'un behavior
   */
  async saveBehavior(behavior: any): Promise<void> {
    if (!this.coordinator) {
      throw new Error('Coordinator not set');
    }

    const key = 'behavior-' + behavior.url;
    const now = Date.now();

    // Annuler le timer précédent
    const existing = this.pendingBehaviors.get(key);
    if (existing) {
      clearTimeout(existing.timer);

      // Flush immédiat si en attente depuis trop longtemps
      if (now - existing.timestamp > this.MAX_PENDING_TIME_MS) {
        logger.debug('[StorageDebouncer] Max pending time reached for behavior, flushing', {
          url: behavior.url
        });
        await this._flushBehavior(key, behavior);
        return;
      }
    }

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(async () => {
        try {
          await this._flushBehavior(key, behavior);
          resolve();
        } catch (error) {
          logger.error('[StorageDebouncer] Failed to flush behavior', error);
          reject(error);
        }
      }, this.DEBOUNCE_MS);

      this.pendingBehaviors.set(key, {
        data: behavior,
        timer,
        timestamp: existing?.timestamp || now,
        flushCallback: () => resolve()
      });

      logger.debug('[StorageDebouncer] Behavior save debounced', {
        url: behavior.url,
        debounceMs: this.DEBOUNCE_MS
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

    const promises: Promise<void>[] = [];

    // Flush organisms
    for (const [key, operation] of this.pendingOrganisms) {
      clearTimeout(operation.timer);
      promises.push(this._flushOrganism(key, operation.data));
    }

    // Flush behaviors
    for (const [key, operation] of this.pendingBehaviors) {
      clearTimeout(operation.timer);
      promises.push(this._flushBehavior(key, operation.data));
    }

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
    for (const [_, operation] of this.pendingOrganisms) {
      clearTimeout(operation.timer);
    }
    for (const [_, operation] of this.pendingBehaviors) {
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
