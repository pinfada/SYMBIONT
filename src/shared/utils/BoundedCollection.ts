// src/shared/utils/BoundedCollection.ts
import { logger } from './secureLogger';

/**
 * Collection avec taille limitée pour éviter les fuites mémoire
 * Utilise une stratégie LRU (Least Recently Used)
 */
export class BoundedArray<T> {
  private items: T[] = [];
  private readonly maxSize: number;
  private readonly name: string;

  constructor(maxSize: number, name = 'BoundedArray') {
    this.maxSize = Math.max(1, maxSize);
    this.name = name;
  }

  add(item: T): void {
    this.items.push(item);
    
    if (this.items.length > this.maxSize) {
      const removed = this.items.splice(0, this.items.length - this.maxSize);
      logger.debug(`${this.name}: Cleaned ${removed.length} old items, keeping ${this.items.length}/${this.maxSize}`);
    }
  }

  addBatch(items: T[]): void {
    this.items.push(...items);
    
    if (this.items.length > this.maxSize) {
      const removed = this.items.splice(0, this.items.length - this.maxSize);
      logger.debug(`${this.name}: Batch cleaned ${removed.length} old items`);
    }
  }

  getAll(): readonly T[] {
    return this.items;
  }

  getRecent(count: number): readonly T[] {
    return this.items.slice(-Math.min(count, this.items.length));
  }

  // Array-like methods for compatibility
  slice(start?: number, end?: number): T[] {
    return this.items.slice(start, end);
  }

  filter(predicate: (value: T, index: number, array: T[]) => boolean): T[] {
    return this.items.filter(predicate);
  }

  reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U {
    return this.items.reduce(callbackfn, initialValue);
  }

  // Iterator support
  [Symbol.iterator](): Iterator<T> {
    return this.items[Symbol.iterator]();
  }

  // Length getter for array-like behavior
  get length(): number {
    return this.items.length;
  }

  clear(): void {
    const cleared = this.items.length;
    this.items = [];
    logger.debug(`${this.name}: Cleared ${cleared} items`);
  }

  size(): number {
    return this.items.length;
  }

  isFull(): boolean {
    return this.items.length >= this.maxSize;
  }

  getMemoryUsage(): { count: number; maxSize: number; utilizationPercent: number } {
    return {
      count: this.items.length,
      maxSize: this.maxSize,
      utilizationPercent: (this.items.length / this.maxSize) * 100
    };
  }
}

/**
 * Map avec taille limitée et TTL (Time To Live)
 */
export class BoundedMap<K, V> {
  private items = new Map<K, { value: V; timestamp: number }>();
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private readonly name: string;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(maxSize: number, ttlMs = 0, name = 'BoundedMap') {
    this.maxSize = Math.max(1, maxSize);
    this.ttlMs = ttlMs;
    this.name = name;

    // Nettoyage automatique si TTL configuré
    if (this.ttlMs > 0) {
      this.startCleanupTimer();
    }
  }

  set(key: K, value: V): void {
    const now = Date.now();
    
    // Nettoie les anciens éléments si nécessaire
    this.cleanupExpired();
    
    // Supprime le plus ancien si taille max atteinte
    if (this.items.size >= this.maxSize && !this.items.has(key)) {
      const firstKey = this.items.keys().next().value;
      if (firstKey !== undefined) {
        this.items.delete(firstKey);
        logger.debug(`${this.name}: Removed oldest item to make space`);
      }
    }

    this.items.set(key, { value, timestamp: now });
  }

  get(key: K): V | undefined {
    const item = this.items.get(key);
    if (!item) return undefined;

    // Vérifie le TTL
    if (this.ttlMs > 0 && Date.now() - item.timestamp > this.ttlMs) {
      this.items.delete(key);
      return undefined;
    }

    return item.value;
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): boolean {
    return this.items.delete(key);
  }

  clear(): void {
    const cleared = this.items.size;
    this.items.clear();
    logger.debug(`${this.name}: Cleared ${cleared} items`);
  }

  size(): number {
    this.cleanupExpired();
    return this.items.size;
  }

  private cleanupExpired(): void {
    if (this.ttlMs <= 0) return;

    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.items.entries()) {
      if (now - item.timestamp > this.ttlMs) {
        this.items.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`${this.name}: Cleaned ${cleaned} expired items`);
    }
  }

  private startCleanupTimer(): void {
    // Nettoie toutes les minutes
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, 60000);
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }

  getMemoryUsage(): { count: number; maxSize: number; utilizationPercent: number } {
    this.cleanupExpired();
    return {
      count: this.items.size,
      maxSize: this.maxSize,
      utilizationPercent: (this.items.size / this.maxSize) * 100
    };
  }
}