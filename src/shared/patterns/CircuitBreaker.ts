/**
 * CircuitBreaker.ts
 * Pattern Circuit Breaker pour éviter les cascades d'échecs
 * Implémentation robuste avec états CLOSED, OPEN, HALF_OPEN
 */

import { logger } from '@/shared/utils/secureLogger';

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Nombre d'échecs avant ouverture
  successThreshold?: number;      // Nombre de succès pour fermer depuis HALF_OPEN
  resetTimeout: number;           // Temps avant passage en HALF_OPEN (ms)
  monitoringPeriod: number;      // Fenêtre de temps pour compter les échecs (ms)
  onStateChange?: (newState: CircuitBreakerState) => void;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private nextHalfOpenTime: number = 0;
  private readonly config: Required<CircuitBreakerConfig>;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      successThreshold: 3,
      onStateChange: () => {},
      ...config
    };
  }

  /**
   * Vérifie si une exécution peut avoir lieu
   */
  public canExecute(): boolean {
    const now = Date.now();

    switch (this.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        if (now >= this.nextHalfOpenTime) {
          this.setState('HALF_OPEN');
          return true;
        }
        return false;

      case 'HALF_OPEN':
        return true;

      default:
        return false;
    }
  }

  /**
   * Enregistre un succès
   */
  public recordSuccess(): void {
    switch (this.state) {
      case 'CLOSED':
        // Réinitialiser le compteur si la fenêtre est dépassée
        if (this.shouldResetCounters()) {
          this.resetCounters();
        }
        break;

      case 'HALF_OPEN':
        this.successCount++;
        if (this.successCount >= this.config.successThreshold) {
          this.setState('CLOSED');
          this.resetCounters();
        }
        break;

      case 'OPEN':
        // Ne devrait pas arriver si canExecute est respecté
        logger.warn('[CircuitBreaker] Success recorded while OPEN');
        break;
    }
  }

  /**
   * Enregistre un échec
   */
  public recordFailure(): void {
    const now = Date.now();

    switch (this.state) {
      case 'CLOSED':
        // Réinitialiser si hors de la fenêtre de monitoring
        if (this.shouldResetCounters()) {
          this.resetCounters();
        }

        this.failureCount++;
        this.lastFailureTime = now;

        if (this.failureCount >= this.config.failureThreshold) {
          this.setState('OPEN');
          this.nextHalfOpenTime = now + this.config.resetTimeout;
        }
        break;

      case 'HALF_OPEN':
        this.setState('OPEN');
        this.nextHalfOpenTime = now + this.config.resetTimeout;
        this.resetCounters();
        break;

      case 'OPEN':
        // Mettre à jour le timeout si nouvel échec
        this.nextHalfOpenTime = now + this.config.resetTimeout;
        break;
    }
  }

  /**
   * Obtient l'état actuel
   */
  public getState(): CircuitBreakerState {
    // Vérifier si on doit passer en HALF_OPEN
    if (this.state === 'OPEN' && Date.now() >= this.nextHalfOpenTime) {
      this.setState('HALF_OPEN');
    }
    return this.state;
  }

  /**
   * Obtient les métriques
   */
  public getMetrics(): {
    state: CircuitBreakerState;
    failureCount: number;
    successCount: number;
    timeUntilHalfOpen: number | null;
  } {
    return {
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      timeUntilHalfOpen: this.state === 'OPEN'
        ? Math.max(0, this.nextHalfOpenTime - Date.now())
        : null
    };
  }

  /**
   * Force la réinitialisation
   */
  public reset(): void {
    this.setState('CLOSED');
    this.resetCounters();
  }

  /**
   * Change l'état et notifie
   */
  private setState(newState: CircuitBreakerState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;

      logger.info(`[CircuitBreaker] State change: ${oldState} -> ${newState}`);
      this.config.onStateChange(newState);
    }
  }

  /**
   * Vérifie si les compteurs doivent être réinitialisés
   */
  private shouldResetCounters(): boolean {
    return Date.now() - this.lastFailureTime > this.config.monitoringPeriod;
  }

  /**
   * Réinitialise les compteurs
   */
  private resetCounters(): void {
    this.failureCount = 0;
    this.successCount = 0;
  }
}