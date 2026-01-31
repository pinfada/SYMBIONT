/**
 * RateLimiter.ts
 * Implémentation d'un rate limiter avec sliding window
 * Utilise le Token Bucket algorithm pour une distribution équitable
 */

import { logger } from '@/shared/utils/secureLogger';

export interface RateLimiterConfig {
  maxRequests: number;          // Nombre maximum de requêtes
  windowMs: number;              // Fenêtre de temps en ms
  blockDurationMs?: number;      // Durée de blocage après dépassement
  enableSlidingWindow?: boolean; // Utiliser sliding window vs fixed window
}

export class RateLimiter {
  private readonly config: Required<RateLimiterConfig>;
  private requests: number[] = []; // Timestamps des requêtes
  private blockedUntil: number = 0;
  private totalAttempts: number = 0;
  private blockedAttempts: number = 0;

  constructor(config: RateLimiterConfig) {
    this.config = {
      blockDurationMs: 60000, // 1 minute par défaut
      enableSlidingWindow: true,
      ...config
    };
  }

  /**
   * Tente de consommer un token
   */
  public tryConsume(tokens: number = 1): boolean {
    const now = Date.now();
    this.totalAttempts++;

    // Vérifier si on est bloqué
    if (now < this.blockedUntil) {
      this.blockedAttempts++;
      logger.debug(`[RateLimiter] Blocked until ${new Date(this.blockedUntil).toISOString()}`);
      return false;
    }

    // Nettoyer les anciennes requêtes
    this.cleanOldRequests(now);

    // Vérifier si on peut consommer
    if (this.requests.length + tokens <= this.config.maxRequests) {
      // Ajouter les nouveaux tokens
      for (let i = 0; i < tokens; i++) {
        this.requests.push(now);
      }
      return true;
    }

    // Rate limit dépassé - bloquer temporairement
    this.blockedUntil = now + this.config.blockDurationMs;
    this.blockedAttempts++;

    logger.warn(`[RateLimiter] Rate limit exceeded: ${this.requests.length}/${this.config.maxRequests} in window`);
    return false;
  }

  /**
   * Vérifie si on peut consommer sans réellement le faire
   */
  public canConsume(tokens: number = 1): boolean {
    const now = Date.now();

    if (now < this.blockedUntil) {
      return false;
    }

    // Créer une copie pour la simulation
    const simulatedRequests = [...this.requests];
    this.cleanRequestArray(simulatedRequests, now);

    return simulatedRequests.length + tokens <= this.config.maxRequests;
  }

  /**
   * Obtient le nombre de tokens disponibles
   */
  public getAvailableTokens(): number {
    const now = Date.now();

    if (now < this.blockedUntil) {
      return 0;
    }

    this.cleanOldRequests(now);
    return Math.max(0, this.config.maxRequests - this.requests.length);
  }

  /**
   * Obtient le temps avant le prochain token disponible
   */
  public getTimeUntilNextToken(): number | null {
    const now = Date.now();

    if (now < this.blockedUntil) {
      return this.blockedUntil - now;
    }

    if (this.requests.length < this.config.maxRequests) {
      return 0; // Token disponible immédiatement
    }

    // Trouver la plus ancienne requête
    if (this.requests.length > 0) {
      const oldestRequest = Math.min(...this.requests);
      const timeUntilExpiry = (oldestRequest + this.config.windowMs) - now;
      return Math.max(0, timeUntilExpiry);
    }

    return null;
  }

  /**
   * Réinitialise le rate limiter
   */
  public reset(): void {
    this.requests = [];
    this.blockedUntil = 0;
    logger.debug('[RateLimiter] Reset');
  }

  /**
   * Obtient les métriques
   */
  public getMetrics(): {
    currentUsage: number;
    maxRequests: number;
    availableTokens: number;
    isBlocked: boolean;
    timeUntilUnblock: number | null;
    totalAttempts: number;
    blockedAttempts: number;
    blockRate: number;
  } {
    const now = Date.now();
    this.cleanOldRequests(now);

    return {
      currentUsage: this.requests.length,
      maxRequests: this.config.maxRequests,
      availableTokens: this.getAvailableTokens(),
      isBlocked: now < this.blockedUntil,
      timeUntilUnblock: now < this.blockedUntil ? this.blockedUntil - now : null,
      totalAttempts: this.totalAttempts,
      blockedAttempts: this.blockedAttempts,
      blockRate: this.totalAttempts > 0 ? this.blockedAttempts / this.totalAttempts : 0
    };
  }

  /**
   * Nettoie les requêtes expirées
   */
  private cleanOldRequests(now: number): void {
    if (this.config.enableSlidingWindow) {
      // Sliding window : garder seulement les requêtes dans la fenêtre
      const cutoff = now - this.config.windowMs;
      this.requests = this.requests.filter(timestamp => timestamp > cutoff);
    } else {
      // Fixed window : réinitialiser à chaque fenêtre
      if (this.requests.length > 0) {
        const oldestRequest = Math.min(...this.requests);
        if (now - oldestRequest >= this.config.windowMs) {
          this.requests = [];
        }
      }
    }
  }

  /**
   * Version statique pour nettoyer un tableau
   */
  private cleanRequestArray(requests: number[], now: number): void {
    const cutoff = now - this.config.windowMs;
    for (let i = requests.length - 1; i >= 0; i--) {
      if (requests[i] <= cutoff) {
        requests.splice(i, 1);
      }
    }
  }
}

/**
 * Rate limiter global pour éviter la duplication
 */
export class GlobalRateLimiter {
  private static limiters: Map<string, RateLimiter> = new Map();

  /**
   * Obtient ou crée un rate limiter
   */
  public static getLimiter(key: string, config?: RateLimiterConfig): RateLimiter {
    let limiter = this.limiters.get(key);

    if (!limiter) {
      limiter = new RateLimiter(config || {
        maxRequests: 10,
        windowMs: 60000
      });
      this.limiters.set(key, limiter);
    }

    return limiter;
  }

  /**
   * Réinitialise tous les limiters
   */
  public static resetAll(): void {
    for (const limiter of this.limiters.values()) {
      limiter.reset();
    }
  }

  /**
   * Obtient les métriques globales
   */
  public static getGlobalMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};

    for (const [key, limiter] of this.limiters) {
      metrics[key] = limiter.getMetrics();
    }

    return metrics;
  }
}