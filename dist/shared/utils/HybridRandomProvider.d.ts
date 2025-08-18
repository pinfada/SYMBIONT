/**
 * HybridRandomProvider - Système de génération hybride haute performance
 *
 * Résout le problème de performance critique SecureRandom (284x plus lent)
 * en implémentant une architecture hybride optimisée selon le contexte d'usage.
 */
/**
 * Niveaux de sécurité pour classification des usages
 */
export declare enum SecurityLevel {
    CRYPTOGRAPHIC = "cryptographic",// UUID, tokens, clés -> SecureRandom obligatoire
    MODERATE = "moderate",// Mutations traits -> SecureRandom par défaut
    PERFORMANCE = "performance"
}
/**
 * Contextes d'utilisation pour optimisation automatique
 */
export declare enum UsageContext {
    NEURAL_NETWORK = "neural_network",
    WEBGL_RENDERING = "webgl_rendering",
    GENETIC_MUTATIONS = "genetic_mutations",
    SOCIAL_EVENTS = "social_events",
    CRYPTOGRAPHIC_OPS = "cryptographic_ops",
    MONITORING = "monitoring"
}
/**
 * Configuration performance pour différents contextes
 */
interface PerformanceConfig {
    securityLevel: SecurityLevel;
    poolSize: number;
    refillThreshold: number;
    batchGeneration: boolean;
    metricsEnabled: boolean;
}
/**
 * PRNG ultra-rapide xorshift128+ pour performance critique
 */
declare class XorShift128Plus {
    private state0;
    private state1;
    constructor(seed1?: number, seed2?: number);
    random(): number;
    /**
     * Re-seed avec valeur cryptographiquement sécurisée périodiquement
     */
    reseed(): void;
}
/**
 * Pool de nombres pré-générés pour haute performance
 */
declare class RandomPool {
    private pool;
    private poolSize;
    private refillThreshold;
    private isRefilling;
    private totalGenerated;
    private totalConsumed;
    constructor(poolSize?: number, refillThreshold?: number);
    initialize(): Promise<void>;
    private fillPool;
    getNext(): number | null;
    getStats(): {
        poolSize: number;
        totalGenerated: number;
        totalConsumed: number;
        hitRate: number;
        isRefilling: boolean;
    };
}
/**
 * Provider hybride haute performance avec classification automatique
 */
export declare class HybridRandomProvider {
    private static instance;
    private securePool;
    private fastPRNG;
    private configs;
    private metrics;
    private constructor();
    static getInstance(): HybridRandomProvider;
    private initialize;
    /**
     * API principale - génération adaptative selon contexte
     */
    random(context?: UsageContext): number;
    /**
     * Génération cryptographiquement sécurisée directe
     */
    private getSecureRandom;
    /**
     * Génération depuis pool pré-calculé (équilibre sécurité/performance)
     */
    private getPooledRandom;
    /**
     * Génération ultra-rapide PRNG (performance critique)
     */
    private getFastRandom;
    /**
     * APIs spécialisées pour différents usages
     */
    neuralRandom(): number;
    renderingRandom(): number;
    cryptoRandom(): number;
    mutationRandom(): number;
    /**
     * Batch generation pour opérations intensives
     */
    generateBatch(count: number, context: UsageContext): Promise<number[]>;
    /**
     * Métriques et monitoring
     */
    getPerformanceMetrics(): {
        poolStats: {
            poolSize: number;
            totalGenerated: number;
            totalConsumed: number;
            hitRate: number;
            isRefilling: boolean;
        };
        distribution: {
            secure: string;
            pooled: string;
            fast: string;
        };
        totalCalls: number;
        secureCalls: number;
        poolCalls: number;
        fastCalls: number;
        avgLatencyMs: number;
        lastReseedTime: number;
    };
    /**
     * Configuration dynamique
     */
    configureContext(context: UsageContext, config: Partial<PerformanceConfig>): void;
    /**
     * Nettoyage et arrêt propre
     */
    shutdown(): void;
}
export declare const hybridRandom: HybridRandomProvider;
export declare const neuralRandom: () => number;
export declare const renderingRandom: () => number;
export declare const cryptoRandom: () => number;
export declare const mutationRandom: () => number;
export { XorShift128Plus, RandomPool };
//# sourceMappingURL=HybridRandomProvider.d.ts.map