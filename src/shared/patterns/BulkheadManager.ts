/**
 * Implémentation du pattern Bulkhead pour l'isolation des ressources
 * Évite qu'une défaillance dans un composant affecte les autres
 */

import { logger } from '@/shared/utils/secureLogger';

export interface BulkheadConfig {
  name: string;
  maxConcurrentRequests: number;
  timeout: number;
  fallbackStrategy: 'circuit-breaker' | 'fail-fast' | 'retry';
  retryAttempts?: number;
}

export interface BulkheadMetrics {
  name: string;
  activeRequests: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastError?: string;
  lastErrorTime?: number;
}

/**
 * Gestionnaire de bulkheads pour l'isolation des services
 */
export class BulkheadManager {
  private bulkheads = new Map<string, Bulkhead>();
  private metrics = new Map<string, BulkheadMetrics>();

  /**
   * Crée ou récupère un bulkhead pour un service
   */
  createBulkhead(config: BulkheadConfig): Bulkhead {
    if (this.bulkheads.has(config.name)) {
      return this.bulkheads.get(config.name)!;
    }

    const bulkhead = new Bulkhead(config);
    this.bulkheads.set(config.name, bulkhead);
    
    // Initialise les métriques
    this.metrics.set(config.name, {
      name: config.name,
      activeRequests: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
    });

    logger.info(`Bulkhead créé: ${config.name}`, config);
    return bulkhead;
  }

  /**
   * Exécute une fonction dans un bulkhead isolé
   */
  async execute<T>(
    bulkheadName: string, 
    operation: () => Promise<T>,
    _context?: string
  ): Promise<T> {
    const bulkhead = this.bulkheads.get(bulkheadName);
    if (!bulkhead) {
      throw new Error(`Bulkhead non trouvé: ${bulkheadName}`);
    }

    const startTime = Date.now();
    this.updateMetrics(bulkheadName, 'start');

    try {
      const result = await bulkhead.execute(operation);
      const duration = Date.now() - startTime;
      this.updateMetrics(bulkheadName, 'success', duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateMetrics(bulkheadName, 'error', duration, error);
      throw error;
    }
  }

  /**
   * Met à jour les métriques d'un bulkhead
   */
  private updateMetrics(
    name: string, 
    event: 'start' | 'success' | 'error', 
    duration?: number,
    error?: unknown
  ): void {
    const metrics = this.metrics.get(name);
    if (!metrics) return;

    switch (event) {
      case 'start':
        metrics.activeRequests++;
        metrics.totalRequests++;
        break;
      case 'success':
        metrics.activeRequests--;
        metrics.successfulRequests++;
        if (duration) {
          metrics.averageResponseTime = 
            (metrics.averageResponseTime * (metrics.successfulRequests - 1) + duration) / 
            metrics.successfulRequests;
        }
        break;
      case 'error':
        metrics.activeRequests--;
        metrics.failedRequests++;
        if (error) {
          metrics.lastError = error instanceof Error ? error.message : String(error);
          metrics.lastErrorTime = Date.now();
        }
        break;
    }
  }

  /**
   * Récupère les métriques de tous les bulkheads
   */
  getMetrics(): BulkheadMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Récupère les métriques d'un bulkhead spécifique
   */
  getBulkheadMetrics(name: string): BulkheadMetrics | null {
    return this.metrics.get(name) || null;
  }

  /**
   * Vérifie la santé de tous les bulkheads
   */
  getHealthStatus(): Record<string, 'healthy' | 'degraded' | 'failed'> {
    const status: Record<string, 'healthy' | 'degraded' | 'failed'> = {};

    for (const [name, metrics] of this.metrics) {
      const failureRate = metrics.totalRequests > 0 ? 
        metrics.failedRequests / metrics.totalRequests : 0;
      
      if (failureRate > 0.5) {
        status[name] = 'failed';
      } else if (failureRate > 0.2 || metrics.averageResponseTime > 5000) {
        status[name] = 'degraded';
      } else {
        status[name] = 'healthy';
      }
    }

    return status;
  }
}

/**
 * Implémentation d'un bulkhead individuel
 */
class Bulkhead {
  private config: BulkheadConfig;
  private activeRequests = 0;
  private circuitBreakerOpen = false;
  private lastFailureTime = 0;
  private readonly circuitBreakerTimeout = 30000; // 30 secondes

  constructor(config: BulkheadConfig) {
    this.config = config;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Vérification du circuit breaker
    if (this.circuitBreakerOpen) {
      const now = Date.now();
      if (now - this.lastFailureTime < this.circuitBreakerTimeout) {
        throw new Error(`Circuit breaker ouvert pour ${this.config.name}`);
      } else {
        this.circuitBreakerOpen = false;
        logger.info(`Circuit breaker fermé pour ${this.config.name}`);
      }
    }

    // Vérification de la limite de requêtes concurrentes
    if (this.activeRequests >= this.config.maxConcurrentRequests) {
      if (this.config.fallbackStrategy === 'fail-fast') {
        throw new Error(`Bulkhead saturé: ${this.config.name}`);
      }
      // Attendre qu'une place se libère (avec timeout)
      await this.waitForSlot();
    }

    this.activeRequests++;

    try {
      // Exécuter l'opération avec timeout
      const result = await this.executeWithTimeout(operation);
      return result;
    } catch (error) {
      this.handleFailure(error);
      throw error;
    } finally {
      this.activeRequests--;
    }
  }

  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout dans bulkhead ${this.config.name}`));
      }, this.config.timeout);

      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private async waitForSlot(): Promise<void> {
    const maxWaitTime = this.config.timeout;
    const startTime = Date.now();

    while (this.activeRequests >= this.config.maxConcurrentRequests) {
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error(`Timeout d'attente pour bulkhead ${this.config.name}`);
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  private handleFailure(error: unknown): void {
    if (this.config.fallbackStrategy === 'circuit-breaker') {
      this.circuitBreakerOpen = true;
      this.lastFailureTime = Date.now();
      logger.warn(`Circuit breaker ouvert pour ${this.config.name}:`, error);
    }
  }
}

// Instance globale du gestionnaire de bulkheads
export const bulkheadManager = new BulkheadManager();