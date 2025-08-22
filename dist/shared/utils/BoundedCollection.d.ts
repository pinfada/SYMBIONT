/**
 * Collection avec taille limitée pour éviter les fuites mémoire
 * Utilise une stratégie LRU (Least Recently Used)
 */
export declare class BoundedArray<T> {
    private items;
    private readonly maxSize;
    private readonly name;
    constructor(maxSize: number, name?: string);
    add(item: T): void;
    addBatch(items: T[]): void;
    getAll(): readonly T[];
    getRecent(count: number): readonly T[];
    slice(start?: number, end?: number): T[];
    filter(predicate: (value: T, index: number, array: T[]) => boolean): T[];
    reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
    [Symbol.iterator](): Iterator<T>;
    get length(): number;
    clear(): void;
    size(): number;
    isFull(): boolean;
    getMemoryUsage(): {
        count: number;
        maxSize: number;
        utilizationPercent: number;
    };
}
/**
 * Map avec taille limitée et TTL (Time To Live)
 */
export declare class BoundedMap<K, V> {
    private items;
    private readonly maxSize;
    private readonly ttlMs;
    private readonly name;
    private cleanupTimer;
    constructor(maxSize: number, ttlMs?: number, name?: string);
    set(key: K, value: V): void;
    get(key: K): V | undefined;
    has(key: K): boolean;
    delete(key: K): boolean;
    clear(): void;
    size(): number;
    private cleanupExpired;
    private startCleanupTimer;
    destroy(): void;
    getMemoryUsage(): {
        count: number;
        maxSize: number;
        utilizationPercent: number;
    };
}
//# sourceMappingURL=BoundedCollection.d.ts.map