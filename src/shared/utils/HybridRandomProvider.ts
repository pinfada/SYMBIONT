/**
 * HybridRandomProvider - Système de génération hybride haute performance
 * 
 * Résout le problème de performance critique SecureRandom (284x plus lent)
 * en implémentant une architecture hybride optimisée selon le contexte d'usage.
 */

import { logger } from '@shared/utils/secureLogger';

/**
 * Niveaux de sécurité pour classification des usages
 */
export enum SecurityLevel {
  CRYPTOGRAPHIC = 'cryptographic',    // UUID, tokens, clés -> SecureRandom obligatoire
  MODERATE = 'moderate',              // Mutations traits -> SecureRandom par défaut
  PERFORMANCE = 'performance'         // WebGL, neural weights -> PRNG optimisé
}

/**
 * Contextes d'utilisation pour optimisation automatique
 */
export enum UsageContext {
  NEURAL_NETWORK = 'neural_network',
  WEBGL_RENDERING = 'webgl_rendering',
  GENETIC_MUTATIONS = 'genetic_mutations',
  SOCIAL_EVENTS = 'social_events',
  CRYPTOGRAPHIC_OPS = 'cryptographic_ops',
  MONITORING = 'monitoring'
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
class XorShift128Plus {
  private state0: number;
  private state1: number;

  constructor(seed1 = 123456789, seed2 = 987654321) {
    this.state0 = seed1;
    this.state1 = seed2;
  }

  random(): number {
    let s1 = this.state0;
    const s0 = this.state1;
    
    this.state0 = s0;
    s1 ^= s1 << 23;
    s1 ^= s1 >>> 17;
    s1 ^= s0;
    s1 ^= s0 >>> 26;
    this.state1 = s1;
    
    const result = (s0 + s1) >>> 0;
    return result / 0x100000000;
  }

  /**
   * Re-seed avec valeur cryptographiquement sécurisée périodiquement
   */
  reseed(): void {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const seeds = new Uint32Array(2);
      crypto.getRandomValues(seeds);
      this.state0 = seeds[0];
      this.state1 = seeds[1];
    }
  }
}

/**
 * Pool de nombres pré-générés pour haute performance
 */
class RandomPool {
  private pool: number[] = [];
  private poolSize: number;
  private refillThreshold: number;
  private isRefilling = false;
  private totalGenerated = 0;
  private totalConsumed = 0;

  constructor(poolSize = 10000, refillThreshold = 2000) {
    this.poolSize = poolSize;
    this.refillThreshold = refillThreshold;
  }

  async initialize(): Promise<void> {
    await this.fillPool();
  }

  private async fillPool(): Promise<void> {
    if (this.isRefilling) return;
    
    this.isRefilling = true;
    try {
      // Génération batch cryptographiquement sécurisée
      const batchSize = Math.min(5000, this.poolSize - this.pool.length);
      const values = new Uint32Array(batchSize);
      
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(values);
        
        for (const value of values) {
          this.pool.push(value / 0x100000000);
        }
        
        this.totalGenerated += batchSize;
      }
    } catch (_error) {
      logger.error('RandomPool: Erreur génération batch', { error });
    } finally {
      this.isRefilling = false;
    }
  }

  getNext(): number | null {
    if (this.pool.length === 0) return null;
    
    const value = this.pool.pop()!;
    this.totalConsumed++;
    
    // Refill asynchrone si nécessaire
    if (this.pool.length <= this.refillThreshold && !this.isRefilling) {
      this.fillPool();
    }
    
    return value;
  }

  getStats() {
    return {
      poolSize: this.pool.length,
      totalGenerated: this.totalGenerated,
      totalConsumed: this.totalConsumed,
      hitRate: this.totalConsumed > 0 ? (this.totalConsumed - this.pool.length) / this.totalConsumed : 0,
      isRefilling: this.isRefilling
    };
  }
}

/**
 * Provider hybride haute performance avec classification automatique
 */
export class HybridRandomProvider {
  private static instance: HybridRandomProvider;
  
  // Générateurs spécialisés
  private securePool: RandomPool;
  private fastPRNG: XorShift128Plus;
  
  // Configuration par contexte
  private configs = new Map<UsageContext, PerformanceConfig>([
    [UsageContext.CRYPTOGRAPHIC_OPS, {
      securityLevel: SecurityLevel.CRYPTOGRAPHIC,
      poolSize: 1000,
      refillThreshold: 200,
      batchGeneration: true,
      metricsEnabled: true
    }],
    [UsageContext.NEURAL_NETWORK, {
      securityLevel: SecurityLevel.PERFORMANCE,
      poolSize: 50000,
      refillThreshold: 10000,
      batchGeneration: true,
      metricsEnabled: true
    }],
    [UsageContext.WEBGL_RENDERING, {
      securityLevel: SecurityLevel.PERFORMANCE,
      poolSize: 10000,
      refillThreshold: 2000,
      batchGeneration: true,
      metricsEnabled: false
    }],
    [UsageContext.GENETIC_MUTATIONS, {
      securityLevel: SecurityLevel.MODERATE,
      poolSize: 5000,
      refillThreshold: 1000,
      batchGeneration: true,
      metricsEnabled: true
    }]
  ]);

  // Métriques performance
  private metrics = {
    totalCalls: 0,
    secureCalls: 0,
    poolCalls: 0,
    fastCalls: 0,
    avgLatencyMs: 0,
    lastReseedTime: Date.now()
  };

  private constructor() {
    this.securePool = new RandomPool(10000, 2000);
    this.fastPRNG = new XorShift128Plus();
    this.initialize();
  }

  static getInstance(): HybridRandomProvider {
    if (!HybridRandomProvider.instance) {
      HybridRandomProvider.instance = new HybridRandomProvider();
    }
    return HybridRandomProvider.instance;
  }

  private async initialize(): Promise<void> {
    await this.securePool.initialize();
    
    // Re-seed PRNG périodiquement avec crypto sécurisé
    setInterval(() => {
      this.fastPRNG.reseed();
      this.metrics.lastReseedTime = Date.now();
    }, 300000); // Toutes les 5 minutes
  }

  /**
   * API principale - génération adaptative selon contexte
   */
  random(context: UsageContext = UsageContext.GENETIC_MUTATIONS): number {
    const startTime = performance.now();
    this.metrics.totalCalls++;
    
    const config = this.configs.get(context) || this.configs.get(UsageContext.GENETIC_MUTATIONS)!;
    let result: number;
    
    switch (config.securityLevel) {
      case SecurityLevel.CRYPTOGRAPHIC:
        result = this.getSecureRandom();
        this.metrics.secureCalls++;
        break;
        
      case SecurityLevel.MODERATE:
        result = this.getPooledRandom();
        this.metrics.poolCalls++;
        break;
        
      case SecurityLevel.PERFORMANCE:
        result = this.getFastRandom();
        this.metrics.fastCalls++;
        break;
        
      default:
        result = this.getPooledRandom();
        this.metrics.poolCalls++;
    }
    
    // Mise à jour métriques
    if (config.metricsEnabled) {
      const latency = performance.now() - startTime;
      this.metrics.avgLatencyMs = (this.metrics.avgLatencyMs + latency) / 2;
    }
    
    return result;
  }

  /**
   * Génération cryptographiquement sécurisée directe
   */
  private getSecureRandom(): number {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      return array[0] / 0x100000000;
    }
    
    logger.warn('HybridRandom: crypto.getRandomValues non disponible, fallback pool');
    return this.getPooledRandom();
  }

  /**
   * Génération depuis pool pré-calculé (équilibre sécurité/performance)
   */
  private getPooledRandom(): number {
    const poolValue = this.securePool.getNext();
    if (poolValue !== null) {
      return poolValue;
    }
    
    // Fallback si pool vide
    logger.warn('HybridRandom: Pool vide, fallback crypto direct');
    return this.getSecureRandom();
  }

  /**
   * Génération ultra-rapide PRNG (performance critique)
   */
  private getFastRandom(): number {
    return this.fastPRNG.random();
  }

  /**
   * APIs spécialisées pour différents usages
   */
  
  // Pour neural networks (performance critique)
  neuralRandom(): number {
    return this.random(UsageContext.NEURAL_NETWORK);
  }

  // Pour WebGL rendering (ultra performance)
  renderingRandom(): number {
    return this.random(UsageContext.WEBGL_RENDERING);
  }

  // Pour opérations cryptographiques (sécurité maximale)
  cryptoRandom(): number {
    return this.random(UsageContext.CRYPTOGRAPHIC_OPS);
  }

  // Pour mutations génétiques (équilibré)
  mutationRandom(): number {
    return this.random(UsageContext.GENETIC_MUTATIONS);
  }

  /**
   * Batch generation pour opérations intensives
   */
  async generateBatch(count: number, context: UsageContext): Promise<number[]> {
    const config = this.configs.get(context);
    if (!config?.batchGeneration) {
      // Génération séquentielle si batch non supporté
      return Array.from({ length: count }, () => this.random(context));
    }

    // Génération batch optimisée
    if (config.securityLevel === SecurityLevel.PERFORMANCE) {
      return Array.from({ length: count }, () => this.fastPRNG.random());
    } else {
      // Génération crypto batch
      const values = new Uint32Array(count);
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(values);
        return Array.from(values, v => v / 0x100000000);
      }
      return Array.from({ length: count }, () => this.getSecureRandom());
    }
  }

  /**
   * Métriques et monitoring
   */
  getPerformanceMetrics() {
    return {
      ...this.metrics,
      poolStats: this.securePool.getStats(),
      distribution: {
        secure: (this.metrics.secureCalls / this.metrics.totalCalls * 100).toFixed(1) + '%',
        pooled: (this.metrics.poolCalls / this.metrics.totalCalls * 100).toFixed(1) + '%',
        fast: (this.metrics.fastCalls / this.metrics.totalCalls * 100).toFixed(1) + '%'
      }
    };
  }

  /**
   * Configuration dynamique
   */
  configureContext(context: UsageContext, config: Partial<PerformanceConfig>): void {
    const existing = this.configs.get(context) || this.configs.get(UsageContext.GENETIC_MUTATIONS)!;
    this.configs.set(context, { ...existing, ...config });
  }

  /**
   * Nettoyage et arrêt propre
   */
  shutdown(): void {
    logger.info('HybridRandomProvider: Arrêt avec métriques', this.getPerformanceMetrics());
  }
}

// Exports pour compatibilité avec SecureRandom
export const hybridRandom = HybridRandomProvider.getInstance();

// APIs simplifiées pour remplacement direct
export const neuralRandom = () => hybridRandom.neuralRandom();
export const renderingRandom = () => hybridRandom.renderingRandom();
export const cryptoRandom = () => hybridRandom.cryptoRandom();
export const mutationRandom = () => hybridRandom.mutationRandom();

// Export de classe pour tests et instanciation custom
export { XorShift128Plus, RandomPool };