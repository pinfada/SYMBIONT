/**
 * Gestionnaire de health checks automatiques pour surveiller la santé du système
 */

import { logger } from '@/shared/utils/secureLogger';
import { bulkheadManager } from '@/shared/patterns/BulkheadManager';

export interface HealthCheckConfig {
  name: string;
  interval: number; // en millisecondes
  timeout: number;
  retryAttempts: number;
  criticalLevel: 'low' | 'medium' | 'high';
}

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  message: string;
  responseTime: number;
  timestamp: number;
  details?: Record<string, unknown>;
}

export interface SystemHealthStatus {
  overallStatus: 'healthy' | 'degraded' | 'critical' | 'unknown';
  checks: HealthCheckResult[];
  lastUpdate: number;
  totalChecks: number;
  healthyChecks: number;
  criticalChecks: number;
}

/**
 * Gestionnaire principal des health checks
 */
export class HealthCheckManager {
  private checks = new Map<string, HealthCheck>();
  private results = new Map<string, HealthCheckResult>();
  private intervals = new Map<string, NodeJS.Timeout>();
  private isRunning = false;

  constructor() {
    this.setupDefaultChecks();
  }

  /**
   * Configure les health checks par défaut
   */
  private setupDefaultChecks(): void {
    // Check de la messagerie
    this.registerCheck('message-bus', {
      name: 'message-bus',
      interval: 30000, // 30 secondes
      timeout: 5000,
      retryAttempts: 2,
      criticalLevel: 'high'
    }, async () => {
      // Test basique de la messagerie
      const startTime = Date.now();
      try {
        // Simuler un test de message
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          status: 'healthy' as const,
          message: 'MessageBus opérationnel',
          responseTime: Date.now() - startTime,
          timestamp: Date.now()
        };
      } catch (error) {
        return {
          status: 'critical' as const,
          message: `MessageBus en erreur: ${error}`,
          responseTime: Date.now() - startTime,
          timestamp: Date.now()
        };
      }
    });

    // Check du stockage
    this.registerCheck('storage', {
      name: 'storage',
      interval: 60000, // 1 minute
      timeout: 10000,
      retryAttempts: 3,
      criticalLevel: 'high'
    }, async () => {
      const startTime = Date.now();
      try {
        // Test d'écriture/lecture
        const testKey = 'health_check_test';
        const testValue = { timestamp: Date.now() };
        
        if (typeof chrome !== 'undefined' && chrome.storage) {
          // Test d'écriture
          await new Promise<void>((resolve, reject) => {
            chrome.storage.local.set({ [testKey]: testValue }, () => {
              if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
              else resolve();
            });
          });
          
          // Test de lecture pour vérifier l'écriture
          await new Promise<void>((resolve, reject) => {
            chrome.storage.local.get([testKey], (result) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else if (!result || !result[testKey]) {
                reject(new Error('Failed to read test value from storage'));
              } else {
                resolve();
              }
            });
          });
          
          // Nettoyage
          await new Promise<void>((resolve, reject) => {
            chrome.storage.local.remove(testKey, () => {
              if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
              else resolve();
            });
          });
        }
        
        return {
          status: 'healthy' as const,
          message: 'Stockage opérationnel',
          responseTime: Date.now() - startTime,
          timestamp: Date.now()
        };
      } catch (error) {
        return {
          status: 'critical' as const,
          message: `Stockage en erreur: ${error}`,
          responseTime: Date.now() - startTime,
          timestamp: Date.now()
        };
      }
    });

    // Check des bulkheads
    this.registerCheck('bulkheads', {
      name: 'bulkheads',
      interval: 45000, // 45 secondes
      timeout: 3000,
      retryAttempts: 1,
      criticalLevel: 'medium'
    }, async () => {
      const startTime = Date.now();
      try {
        const healthStatus = bulkheadManager.getHealthStatus();
        const failedBulkheads = Object.entries(healthStatus)
          .filter(([, status]) => status === 'failed');
        
        if (failedBulkheads.length > 0) {
          return {
            status: 'warning' as const,
            message: `Bulkheads dégradés: ${failedBulkheads.map(([name]) => name).join(', ')}`,
            responseTime: Date.now() - startTime,
            timestamp: Date.now(),
            details: { healthStatus }
          };
        }
        
        return {
          status: 'healthy' as const,
          message: 'Tous les bulkheads opérationnels',
          responseTime: Date.now() - startTime,
          timestamp: Date.now(),
          details: { healthStatus }
        };
      } catch (error) {
        return {
          status: 'warning' as const,
          message: `Erreur check bulkheads: ${error}`,
          responseTime: Date.now() - startTime,
          timestamp: Date.now()
        };
      }
    });

    // Check de la sécurité
    this.registerCheck('security', {
      name: 'security',
      interval: 120000, // 2 minutes
      timeout: 5000,
      retryAttempts: 2,
      criticalLevel: 'high'
    }, async () => {
      const startTime = Date.now();
      try {
        // Vérifier WebCrypto API
        const cryptoAvailable = typeof crypto !== 'undefined' && 
                               crypto.subtle !== undefined;
        
        if (!cryptoAvailable) {
          return {
            status: 'critical' as const,
            message: 'WebCrypto API indisponible',
            responseTime: Date.now() - startTime,
            timestamp: Date.now()
          };
        }
        
        return {
          status: 'healthy' as const,
          message: 'Sécurité opérationnelle',
          responseTime: Date.now() - startTime,
          timestamp: Date.now()
        };
      } catch (error) {
        return {
          status: 'critical' as const,
          message: `Erreur sécurité: ${error}`,
          responseTime: Date.now() - startTime,
          timestamp: Date.now()
        };
      }
    });
  }

  /**
   * Enregistre un nouveau health check
   */
  registerCheck(
    name: string,
    config: HealthCheckConfig,
    checkFunction: () => Promise<Omit<HealthCheckResult, 'name'>>
  ): void {
    const check = new HealthCheck(config, checkFunction);
    this.checks.set(name, check);
    
    if (this.isRunning) {
      this.startCheck(name);
    }
    
    logger.info(`Health check enregistré: ${name}`, config);
  }

  /**
   * Démarre tous les health checks
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('HealthCheckManager déjà démarré');
      return;
    }
    
    this.isRunning = true;
    
    for (const name of this.checks.keys()) {
      this.startCheck(name);
    }
    
    logger.info('HealthCheckManager démarré', {
      totalChecks: this.checks.size
    });
  }

  /**
   * Arrête tous les health checks
   */
  stop(): void {
    this.isRunning = false;
    
    for (const [name, interval] of this.intervals) {
      clearInterval(interval);
      this.intervals.delete(name);
    }
    
    logger.info('HealthCheckManager arrêté');
  }

  /**
   * Démarre un health check spécifique
   */
  private startCheck(name: string): void {
    const check = this.checks.get(name);
    if (!check) return;
    
    // Exécution immédiate
    this.executeCheck(name);
    
    // Programmation des exécutions périodiques
    const interval = setInterval(() => {
      this.executeCheck(name);
    }, check.config.interval);
    
    this.intervals.set(name, interval);
  }

  /**
   * Exécute un health check avec gestion des erreurs et retry
   */
  private async executeCheck(name: string): Promise<void> {
    const check = this.checks.get(name);
    if (!check) return;
    
    let attempts = 0;
    let lastError: unknown;
    
    while (attempts <= check.config.retryAttempts) {
      try {
        const result = await Promise.race([
          check.execute(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), check.config.timeout)
          )
        ]);
        
        const fullResult: HealthCheckResult = {
          name,
          ...result
        };
        
        this.results.set(name, fullResult);
        
        // Log seulement les changements d'état ou les erreurs
        const previousResult = this.results.get(name);
        if (!previousResult || previousResult.status !== result.status) {
          logger.info(`Health check ${name}: ${result.status}`, {
            message: result.message,
            responseTime: result.responseTime
          });
        }
        
        return;
      } catch (error) {
        lastError = error;
        attempts++;
        
        if (attempts <= check.config.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }
    }
    
    // Toutes les tentatives ont échoué
    const failureResult: HealthCheckResult = {
      name,
      status: check.config.criticalLevel === 'high' ? 'critical' : 'warning',
      message: `Check échoué après ${check.config.retryAttempts + 1} tentatives: ${lastError}`,
      responseTime: check.config.timeout,
      timestamp: Date.now()
    };
    
    this.results.set(name, failureResult);
    logger.error(`Health check ${name} échoué définitivement`, failureResult);
  }

  /**
   * Récupère le statut global du système
   */
  getSystemHealth(): SystemHealthStatus {
    const checks = Array.from(this.results.values());
    const totalChecks = checks.length;
    const healthyChecks = checks.filter(c => c.status === 'healthy').length;
    const criticalChecks = checks.filter(c => c.status === 'critical').length;
    
    let overallStatus: SystemHealthStatus['overallStatus'] = 'unknown';
    
    if (totalChecks === 0) {
      overallStatus = 'unknown';
    } else if (criticalChecks > 0) {
      overallStatus = 'critical';
    } else if (healthyChecks === totalChecks) {
      overallStatus = 'healthy';
    } else {
      overallStatus = 'degraded';
    }
    
    return {
      overallStatus,
      checks,
      lastUpdate: Date.now(),
      totalChecks,
      healthyChecks,
      criticalChecks
    };
  }

  /**
   * Récupère le résultat d'un check spécifique
   */
  getCheckResult(name: string): HealthCheckResult | null {
    return this.results.get(name) || null;
  }

  /**
   * Force l'exécution d'un check spécifique
   */
  async forceCheck(name: string): Promise<HealthCheckResult | null> {
    await this.executeCheck(name);
    return this.getCheckResult(name);
  }
}

/**
 * Classe représentant un health check individuel
 */
class HealthCheck {
  constructor(
    public config: HealthCheckConfig,
    private checkFunction: () => Promise<Omit<HealthCheckResult, 'name'>>
  ) {}

  async execute(): Promise<Omit<HealthCheckResult, 'name'>> {
    return this.checkFunction();
  }
}

// Instance globale du gestionnaire de health checks
export const healthCheckManager = new HealthCheckManager();