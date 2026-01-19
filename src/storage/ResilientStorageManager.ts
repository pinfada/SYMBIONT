/**
 * ResilientStorageManager
 *
 * Version améliorée du HybridStorageManager intégrant:
 * - Backpressure logistique pour éviter la saturation
 * - Quorum sensing pour la coordination inter-contextes
 * - Élagage automatique de la mémoire cache (LRU)
 * - Coalescing des écritures pour réduire les I/O
 * - Circuit breaker pour les couches défaillantes
 *
 * Résout le problème d'asphyxie IndexedDB en régulant les flux.
 */

import { logger } from '@/shared/utils/secureLogger';
import { backpressureController, BackpressureLevel } from '@/core/metabolic/BackpressureController';
import { circadianCycle } from '@/core/metabolic/CircadianCycle';
import { createQuorumManager, QuorumSensingManager, ContextType } from '@/core/resilience/QuorumSensing';
import { softwareEpigenetics } from '@/core/resilience/SoftwareEpigenetics';
import { neuromodulation } from '@/core/metabolic/Neuromodulation';

// Types
export interface StorageMetrics {
  totalReads: number;
  totalWrites: number;
  cacheHits: number;
  cacheMisses: number;
  coalescedWrites: number;
  rejectedWrites: number;
  layerFailures: Record<string, number>;
  averageWriteLatency: number;
}

export interface StorageHealth {
  isHealthy: boolean;
  memoryLayerStatus: 'ok' | 'degraded' | 'failed';
  chromeStorageStatus: 'ok' | 'degraded' | 'failed';
  indexedDBStatus: 'ok' | 'degraded' | 'failed';
  localStorageStatus: 'ok' | 'degraded' | 'failed';
  backpressureLevel: BackpressureLevel;
  cacheSize: number;
  pendingWrites: number;
}

interface CacheEntry {
  key: string;
  value: unknown;
  timestamp: number;
  accessCount: number;
  lastAccess: number;
  dirty: boolean;         // Modifié mais pas encore persisté
  size: number;           // Estimation de la taille en bytes
}

interface PendingWrite {
  key: string;
  value: unknown;
  timestamp: number;
  attempts: number;
  priority: 'critical' | 'normal' | 'low';
}

interface CircuitBreaker {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
  halfOpenAt: number;
}

// Configuration
const CONFIG = {
  MAX_CACHE_SIZE_MB: 50,           // 50 MB max de cache mémoire
  MAX_CACHE_ENTRIES: 1000,         // Maximum d'entrées en cache
  WRITE_COALESCE_DELAY: 2000,      // 2 secondes de coalescing
  INTEGRITY_CHECK_INTERVAL: 300000, // 5 minutes (était 60s)
  CIRCUIT_BREAKER_THRESHOLD: 5,    // Échecs avant ouverture
  CIRCUIT_BREAKER_RESET: 60000,    // 1 minute pour reset
  INDEXEDDB_TIMEOUT: 10000,        // 10 secondes (était 60s problématique)
  BATCH_WRITE_SIZE: 10,            // Taille des lots d'écriture
  LRU_EVICTION_THRESHOLD: 0.9,     // Éviction à 90% de capacité
};

// Clés critiques qui ne doivent jamais être rejetées
const CRITICAL_KEYS = [
  'organism_state',
  'neural_mesh_state',
  'consciousness_state',
  'encryption_key',
  'user_preferences'
];

// Fallback localStorage pour service worker
const swLocalStorage = {
  getItem: (key: string) => {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch {
      // Silently fail
    }
  },
  removeItem: (key: string) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch {
      // Silently fail
    }
  }
};

const swIndexedDB = typeof indexedDB !== 'undefined' ? indexedDB : null;

/**
 * Gestionnaire de stockage résilient
 */
export class ResilientStorageManager {
  // Couches de stockage
  private memoryCache: Map<string, CacheEntry> = new Map();
  private persistentStorage = chrome.storage?.local;
  private indexedDB: IDBDatabase | null = null;
  private emergencyLocalStorage = swLocalStorage;

  // État
  private indexedDBReady: Promise<boolean>;
  private isInitialized: boolean = false;
  private currentCacheSizeBytes: number = 0;

  // Coordination
  private quorumManager: QuorumSensingManager | null = null;
  private contextType: ContextType;

  // Files d'attente et coalescing
  private pendingWrites: Map<string, PendingWrite> = new Map();
  private writeCoalesceTimers: Map<string, NodeJS.Timeout> = new Map();

  // Circuit breakers par couche
  private circuitBreakers: Record<string, CircuitBreaker> = {
    chromeStorage: { failures: 0, lastFailure: 0, isOpen: false, halfOpenAt: 0 },
    indexedDB: { failures: 0, lastFailure: 0, isOpen: false, halfOpenAt: 0 },
    localStorage: { failures: 0, lastFailure: 0, isOpen: false, halfOpenAt: 0 }
  };

  // Métriques
  private metrics: StorageMetrics = {
    totalReads: 0,
    totalWrites: 0,
    cacheHits: 0,
    cacheMisses: 0,
    coalescedWrites: 0,
    rejectedWrites: 0,
    layerFailures: {},
    averageWriteLatency: 0
  };

  // Timers
  private integrityCheckTimer: ReturnType<typeof setInterval> | null = null;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(contextType: ContextType = 'background') {
    this.contextType = contextType;
    this.indexedDBReady = this.setupIndexedDB();
  }

  /**
   * Initialise le gestionnaire de stockage
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Attendre IndexedDB
    await this.indexedDBReady;

    // Initialiser le quorum sensing
    this.quorumManager = createQuorumManager(this.contextType);
    await this.quorumManager.start();

    // Démarrer les tâches périodiques (avec fréquence réduite)
    this.startPeriodicTasks();

    // Charger le cache initial depuis le stockage persistant
    await this.warmupCache();

    this.isInitialized = true;
    logger.info('[ResilientStorageManager] Initialized', { contextType: this.contextType });
  }

  /**
   * Configure IndexedDB avec timeout réduit
   */
  private setupIndexedDB(): Promise<boolean> {
    return new Promise((resolve) => {
      let settled = false;

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          logger.warn('[ResilientStorageManager] IndexedDB init timeout');
          this.recordLayerFailure('indexedDB');
          resolve(false);
        }
      }, CONFIG.INDEXEDDB_TIMEOUT);

      try {
        const req = swIndexedDB?.open('symbiont-db-v2', 1);
        if (!req) {
          throw new Error('IndexedDB not available');
        }

        req.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('symbiont')) {
            db.createObjectStore('symbiont');
          }
        };

        req.onsuccess = () => {
          if (!settled) {
            clearTimeout(timeout);
            settled = true;
            this.indexedDB = req.result;
            logger.info('[ResilientStorageManager] IndexedDB ready');
            resolve(true);
          }
        };

        req.onerror = () => {
          if (!settled) {
            clearTimeout(timeout);
            settled = true;
            logger.warn('[ResilientStorageManager] IndexedDB failed');
            this.recordLayerFailure('indexedDB');
            resolve(false);
          }
        };
      } catch (e) {
        if (!settled) {
          clearTimeout(timeout);
          settled = true;
          logger.warn('[ResilientStorageManager] IndexedDB exception', e);
          resolve(false);
        }
      }
    });
  }

  /**
   * Démarre les tâches périodiques
   */
  private startPeriodicTasks(): void {
    // Vérification d'intégrité (beaucoup moins fréquente)
    this.integrityCheckTimer = setInterval(() => {
      // Seulement en phase idle ou sleep
      if (circadianCycle.canPerformIntensiveProcessing()) {
        this.performIntegrityCheck();
      }
    }, CONFIG.INTEGRITY_CHECK_INTERVAL);

    // Flush des écritures en attente
    this.flushTimer = setInterval(() => {
      this.flushPendingWrites();
    }, CONFIG.WRITE_COALESCE_DELAY);
  }

  /**
   * Stocke une valeur avec gestion du backpressure
   */
  async store(key: string, data: unknown): Promise<void> {
    // Vérifier si la feature storage est active
    if (!softwareEpigenetics.isFeatureActive('core_storage')) {
      logger.warn('[ResilientStorageManager] Storage feature disabled');
      return;
    }

    // Filtrer les clés qui saturent le stockage
    if (this.shouldSkipKey(key)) {
      logger.info('[ResilientStorageManager] Skipping transient key', { key });
      return;
    }

    // Vérifier le backpressure
    const isCritical = this.isCriticalKey(key);
    if (!isCritical && !backpressureController.canAcceptOperation('write', key)) {
      this.metrics.rejectedWrites++;
      logger.warn('[ResilientStorageManager] Write rejected due to backpressure', { key });
      return;
    }

    // Demander un lock via quorum sensing
    if (this.quorumManager) {
      const lockGranted = await this.quorumManager.requestStorageLock(key, 'write');
      if (!lockGranted && !isCritical) {
        this.metrics.rejectedWrites++;
        return;
      }
    }

    const operationId = backpressureController.startOperation('write', key);
    const startTime = Date.now();

    try {
      // Écrire d'abord en mémoire (toujours rapide)
      this.writeToMemoryCache(key, data);

      // Coalescer les écritures non-critiques
      if (!isCritical) {
        this.scheduleCoalescedWrite(key, data);
      } else {
        // Écriture critique immédiate
        await this.persistToDurableStorage(key, data);
      }

      this.metrics.totalWrites++;
      this.updateWriteLatency(Date.now() - startTime);

    } finally {
      backpressureController.completeOperation(operationId);

      if (this.quorumManager) {
        this.quorumManager.releaseLock(key);
      }
    }
  }

  /**
   * Récupère une valeur
   */
  async retrieve(key: string): Promise<unknown> {
    this.metrics.totalReads++;

    // Vérifier le cache mémoire d'abord
    const cacheEntry = this.memoryCache.get(key);
    if (cacheEntry) {
      cacheEntry.accessCount++;
      cacheEntry.lastAccess = Date.now();
      this.metrics.cacheHits++;
      return cacheEntry.value;
    }

    this.metrics.cacheMisses++;

    // Essayer les couches de stockage dans l'ordre
    const value = await this.retrieveFromDurableStorage(key);

    if (value !== null && value !== undefined) {
      // Mettre en cache pour les prochains accès
      this.writeToMemoryCache(key, value);
    }

    return value;
  }

  /**
   * Écrit dans le cache mémoire avec gestion LRU
   */
  private writeToMemoryCache(key: string, value: unknown): void {
    const serialized = JSON.stringify(value);
    const size = serialized.length * 2; // Approximation UTF-16

    // Vérifier si on doit évincer des entrées
    this.evictIfNeeded(size);

    const existing = this.memoryCache.get(key);
    if (existing) {
      this.currentCacheSizeBytes -= existing.size;
    }

    const entry: CacheEntry = {
      key,
      value,
      timestamp: Date.now(),
      accessCount: existing ? existing.accessCount + 1 : 1,
      lastAccess: Date.now(),
      dirty: true,
      size
    };

    this.memoryCache.set(key, entry);
    this.currentCacheSizeBytes += size;
  }

  /**
   * Éviction LRU si nécessaire
   */
  private evictIfNeeded(newEntrySize: number): void {
    const maxSizeBytes = CONFIG.MAX_CACHE_SIZE_MB * 1024 * 1024;
    const threshold = maxSizeBytes * CONFIG.LRU_EVICTION_THRESHOLD;

    // Vérifier aussi le nombre d'entrées
    while (
      (this.currentCacheSizeBytes + newEntrySize > threshold ||
        this.memoryCache.size >= CONFIG.MAX_CACHE_ENTRIES) &&
      this.memoryCache.size > 0
    ) {
      // Trouver l'entrée la moins récemment utilisée (non critique)
      let lruKey: string | null = null;
      let lruTime = Infinity;

      for (const [k, entry] of this.memoryCache) {
        if (!this.isCriticalKey(k) && entry.lastAccess < lruTime) {
          lruTime = entry.lastAccess;
          lruKey = k;
        }
      }

      if (lruKey) {
        const entry = this.memoryCache.get(lruKey)!;

        // Si l'entrée est dirty, la persister avant éviction
        if (entry.dirty) {
          this.scheduleCoalescedWrite(lruKey, entry.value);
        }

        this.currentCacheSizeBytes -= entry.size;
        this.memoryCache.delete(lruKey);
        logger.info('[ResilientStorageManager] LRU eviction', { key: lruKey });
      } else {
        break; // Plus rien à évincer
      }
    }
  }

  /**
   * Planifie une écriture coalescée
   */
  private scheduleCoalescedWrite(key: string, value: unknown): void {
    // Annuler le timer existant
    const existingTimer = this.writeCoalesceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Mettre à jour la valeur en attente
    this.pendingWrites.set(key, {
      key,
      value,
      timestamp: Date.now(),
      attempts: 0,
      priority: this.isCriticalKey(key) ? 'critical' : 'normal'
    });

    // Planifier l'écriture différée
    const timer = setTimeout(() => {
      this.writeCoalesceTimers.delete(key);
      this.persistSingleKey(key);
    }, CONFIG.WRITE_COALESCE_DELAY);

    this.writeCoalesceTimers.set(key, timer);
  }

  /**
   * Persiste une seule clé
   */
  private async persistSingleKey(key: string): Promise<void> {
    const pending = this.pendingWrites.get(key);
    if (!pending) return;

    try {
      await this.persistToDurableStorage(key, pending.value);
      this.pendingWrites.delete(key);

      // Marquer comme non-dirty dans le cache
      const cacheEntry = this.memoryCache.get(key);
      if (cacheEntry) {
        cacheEntry.dirty = false;
      }

      this.metrics.coalescedWrites++;
    } catch (error) {
      pending.attempts++;
      if (pending.attempts < 3) {
        // Réessayer plus tard
        setTimeout(() => this.persistSingleKey(key), 5000 * pending.attempts);
      } else {
        logger.error('[ResilientStorageManager] Failed to persist after retries', { key, error });
        this.pendingWrites.delete(key);
      }
    }
  }

  /**
   * Flush toutes les écritures en attente
   */
  private async flushPendingWrites(): Promise<void> {
    if (this.pendingWrites.size === 0) return;

    // Vérifier le backpressure
    if (backpressureController.getLevel() === 'emergency') {
      return; // Reporter le flush
    }

    const keys = Array.from(this.pendingWrites.keys()).slice(0, CONFIG.BATCH_WRITE_SIZE);

    for (const key of keys) {
      await this.persistSingleKey(key);
      // Pause entre les écritures pour ne pas saturer
      await this.sleep(50);
    }
  }

  /**
   * Persiste vers le stockage durable (toutes les couches)
   */
  private async persistToDurableStorage(key: string, data: unknown): Promise<void> {
    const promises: Promise<void>[] = [];

    // Chrome Storage
    if (this.persistentStorage && !this.isCircuitBreakerOpen('chromeStorage')) {
      promises.push(this.writeToChromeStorage(key, data));
    }

    // IndexedDB
    if (this.indexedDB && !this.isCircuitBreakerOpen('indexedDB')) {
      promises.push(this.writeToIndexedDB(key, data));
    }

    // Attendre au moins une écriture réussie
    const results = await Promise.allSettled(promises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;

    if (successCount === 0) {
      // Fallback localStorage d'urgence
      try {
        this.emergencyLocalStorage.setItem(key, JSON.stringify(data));
        logger.warn('[ResilientStorageManager] Emergency localStorage used', { key });
      } catch {
        throw new Error('All storage layers failed');
      }
    }
  }

  /**
   * Écrit dans Chrome Storage avec circuit breaker
   */
  private async writeToChromeStorage(key: string, data: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.recordLayerFailure('chromeStorage');
        reject(new Error('Chrome storage timeout'));
      }, 5000);

      this.persistentStorage.set({ [key]: data }, () => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) {
          this.recordLayerFailure('chromeStorage');
          reject(chrome.runtime.lastError);
        } else {
          this.resetCircuitBreaker('chromeStorage');
          resolve();
        }
      });
    });
  }

  /**
   * Écrit dans IndexedDB avec circuit breaker
   */
  private async writeToIndexedDB(key: string, data: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.indexedDB) {
        reject(new Error('IndexedDB not available'));
        return;
      }

      const timeout = setTimeout(() => {
        this.recordLayerFailure('indexedDB');
        reject(new Error('IndexedDB write timeout'));
      }, CONFIG.INDEXEDDB_TIMEOUT);

      try {
        const tx = this.indexedDB.transaction(['symbiont'], 'readwrite');
        const store = tx.objectStore('symbiont');
        const req = store.put(data, key);

        req.onsuccess = () => {
          clearTimeout(timeout);
          this.resetCircuitBreaker('indexedDB');
          resolve();
        };

        req.onerror = () => {
          clearTimeout(timeout);
          this.recordLayerFailure('indexedDB');
          reject(req.error);
        };

        tx.onerror = () => {
          clearTimeout(timeout);
          this.recordLayerFailure('indexedDB');
          reject(tx.error);
        };
      } catch (error) {
        clearTimeout(timeout);
        this.recordLayerFailure('indexedDB');
        reject(error);
      }
    });
  }

  /**
   * Récupère depuis le stockage durable
   */
  private async retrieveFromDurableStorage(key: string): Promise<unknown> {
    // Essayer Chrome Storage
    if (this.persistentStorage && !this.isCircuitBreakerOpen('chromeStorage')) {
      try {
        const result = await this.readFromChromeStorage(key);
        if (result !== undefined) {
          return result;
        }
      } catch {
        // Continue vers la couche suivante
      }
    }

    // Essayer IndexedDB
    if (this.indexedDB && !this.isCircuitBreakerOpen('indexedDB')) {
      try {
        const result = await this.readFromIndexedDB(key);
        if (result !== undefined) {
          return result;
        }
      } catch {
        // Continue vers la couche suivante
      }
    }

    // Fallback localStorage
    try {
      const raw = this.emergencyLocalStorage.getItem(key);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // Pas de données
    }

    return null;
  }

  /**
   * Lit depuis Chrome Storage
   */
  private async readFromChromeStorage(key: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.persistentStorage.get([key], (result: Record<string, unknown>) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result[key]);
        }
      });
    });
  }

  /**
   * Lit depuis IndexedDB
   */
  private async readFromIndexedDB(key: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.indexedDB) {
        reject(new Error('IndexedDB not available'));
        return;
      }

      const tx = this.indexedDB.transaction(['symbiont'], 'readonly');
      const store = tx.objectStore('symbiont');
      const req = store.get(key);

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Vérification d'intégrité (moins fréquente et moins agressive)
   */
  private async performIntegrityCheck(): Promise<void> {
    // Ne vérifier que les clés critiques
    const criticalKeys = Array.from(this.memoryCache.keys())
      .filter(k => this.isCriticalKey(k));

    if (criticalKeys.length === 0) return;

    logger.info('[ResilientStorageManager] Integrity check', { keysToCheck: criticalKeys.length });

    for (const key of criticalKeys.slice(0, 5)) { // Max 5 clés par cycle
      try {
        const memValue = this.memoryCache.get(key)?.value;
        const persistedValue = await this.retrieveFromDurableStorage(key);

        if (memValue !== undefined && persistedValue !== undefined) {
          const memString = JSON.stringify(memValue);
          const persistedString = JSON.stringify(persistedValue);

          if (memString !== persistedString) {
            logger.warn('[ResilientStorageManager] Integrity divergence', { key });
            // Préférer la valeur mémoire (plus récente)
            await this.persistToDurableStorage(key, memValue);
          }
        }
      } catch (error) {
        logger.warn('[ResilientStorageManager] Integrity check failed for key', { key, error });
      }

      // Pause entre les vérifications
      await this.sleep(100);
    }
  }

  /**
   * Précharge le cache depuis le stockage persistant
   */
  private async warmupCache(): Promise<void> {
    try {
      // Charger uniquement les clés critiques au démarrage
      for (const pattern of CRITICAL_KEYS) {
        const value = await this.retrieveFromDurableStorage(pattern);
        if (value !== undefined) {
          this.writeToMemoryCache(pattern, value);
        }
      }
      logger.info('[ResilientStorageManager] Cache warmup complete');
    } catch (error) {
      logger.warn('[ResilientStorageManager] Cache warmup failed', error);
    }
  }

  /**
   * Circuit breaker helpers
   */
  private isCircuitBreakerOpen(layer: string): boolean {
    const cb = this.circuitBreakers[layer];
    if (!cb) return false;

    if (cb.isOpen) {
      // Vérifier si on peut passer en half-open
      if (Date.now() >= cb.halfOpenAt) {
        cb.isOpen = false;
        return false;
      }
      return true;
    }
    return false;
  }

  private recordLayerFailure(layer: string): void {
    const cb = this.circuitBreakers[layer];
    if (!cb) return;

    cb.failures++;
    cb.lastFailure = Date.now();
    this.metrics.layerFailures[layer] = (this.metrics.layerFailures[layer] || 0) + 1;

    if (cb.failures >= CONFIG.CIRCUIT_BREAKER_THRESHOLD) {
      cb.isOpen = true;
      cb.halfOpenAt = Date.now() + CONFIG.CIRCUIT_BREAKER_RESET;
      logger.warn('[ResilientStorageManager] Circuit breaker opened', { layer });
      neuromodulation.processEvent('failure');
    }
  }

  private resetCircuitBreaker(layer: string): void {
    const cb = this.circuitBreakers[layer];
    if (cb) {
      cb.failures = 0;
      cb.isOpen = false;
    }
  }

  /**
   * Helpers
   */
  private isCriticalKey(key: string): boolean {
    return CRITICAL_KEYS.some(pattern => key.includes(pattern));
  }

  private shouldSkipKey(key: string): boolean {
    const skipPatterns = [
      'symbiont_health_alert_',
      'broadcast_',
      '_temp_',
      '_debug_'
    ];
    return skipPatterns.some(pattern => key.includes(pattern));
  }

  private updateWriteLatency(latency: number): void {
    const alpha = 0.1; // Facteur de lissage exponentiel
    this.metrics.averageWriteLatency =
      alpha * latency + (1 - alpha) * this.metrics.averageWriteLatency;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retourne les métriques
   */
  getMetrics(): StorageMetrics {
    return { ...this.metrics };
  }

  /**
   * Retourne l'état de santé
   */
  getHealth(): StorageHealth {
    return {
      isHealthy: !Object.values(this.circuitBreakers).some(cb => cb.isOpen),
      memoryLayerStatus: 'ok',
      chromeStorageStatus: this.isCircuitBreakerOpen('chromeStorage') ? 'failed' : 'ok',
      indexedDBStatus: this.isCircuitBreakerOpen('indexedDB') ? 'failed' : 'ok',
      localStorageStatus: this.isCircuitBreakerOpen('localStorage') ? 'failed' : 'ok',
      backpressureLevel: backpressureController.getLevel(),
      cacheSize: this.memoryCache.size,
      pendingWrites: this.pendingWrites.size
    };
  }

  /**
   * Force un flush de toutes les données en attente
   */
  async forceFlush(): Promise<void> {
    // Annuler tous les timers de coalescing
    for (const timer of this.writeCoalesceTimers.values()) {
      clearTimeout(timer);
    }
    this.writeCoalesceTimers.clear();

    // Persister toutes les écritures en attente
    for (const key of this.pendingWrites.keys()) {
      await this.persistSingleKey(key);
    }

    logger.info('[ResilientStorageManager] Force flush complete');
  }

  /**
   * Nettoyage et arrêt
   */
  async destroy(): Promise<void> {
    // Flush les données en attente
    await this.forceFlush();

    // Arrêter les timers
    if (this.integrityCheckTimer) {
      clearInterval(this.integrityCheckTimer);
    }
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    // Arrêter le quorum sensing
    if (this.quorumManager) {
      this.quorumManager.stop();
    }

    // Nettoyer les timers de coalescing
    for (const timer of this.writeCoalesceTimers.values()) {
      clearTimeout(timer);
    }

    // Fermer IndexedDB
    if (this.indexedDB) {
      this.indexedDB.close();
    }

    logger.info('[ResilientStorageManager] Destroyed');
  }
}

// Factory pour créer des instances selon le contexte
export function createResilientStorage(contextType: ContextType = 'background'): ResilientStorageManager {
  return new ResilientStorageManager(contextType);
}
