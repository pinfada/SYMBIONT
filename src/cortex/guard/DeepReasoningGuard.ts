/**
 * DeepReasoningGuard — Encadrement du raisonnement profond (F-10)
 *
 * Gate qui contrôle l'accès au modèle Oracle :
 * - Maximum 1 analyse concurrente
 * - Maximum 3 analyses par minute (RateLimiter)
 * - Timeout obligatoire avec interruption propre
 */

import { RateLimiter } from '@shared/patterns/RateLimiter';

const MAX_ORACLE_PER_MINUTE = 3;
const RATE_WINDOW_MS = 60_000;

export class DeepReasoningGuard {
  private rateLimiter: RateLimiter;
  private activeAnalysis = false;

  constructor() {
    this.rateLimiter = new RateLimiter({
      maxRequests: MAX_ORACLE_PER_MINUTE,
      windowMs: RATE_WINDOW_MS,
    });
  }

  canStartDeepAnalysis(): { allowed: boolean; reason?: string } {
    if (this.activeAnalysis) {
      return { allowed: false, reason: 'analysis_already_running' };
    }

    if (!this.rateLimiter.canConsume()) {
      const waitTime = this.rateLimiter.getTimeUntilNextToken();
      return {
        allowed: false,
        reason: `rate_limit_exceeded_wait_${waitTime}ms`,
      };
    }

    return { allowed: true };
  }

  startAnalysis(): void {
    if (this.activeAnalysis) {
      throw new Error('Cannot start analysis: one is already running');
    }
    this.rateLimiter.tryConsume();
    this.activeAnalysis = true;
  }

  endAnalysis(): void {
    this.activeAnalysis = false;
  }

  createTimeout(
    maxMs: number,
    onTimeout: () => void,
  ): ReturnType<typeof setTimeout> {
    return setTimeout(() => {
      if (this.activeAnalysis) {
        this.activeAnalysis = false;
        onTimeout();
      }
    }, maxMs);
  }

  isAnalysisRunning(): boolean {
    return this.activeAnalysis;
  }

  getMetrics(): {
    activeAnalysis: boolean;
    availableTokens: number;
    rateLimiterMetrics: ReturnType<RateLimiter['getMetrics']>;
  } {
    return {
      activeAnalysis: this.activeAnalysis,
      availableTokens: this.rateLimiter.getAvailableTokens(),
      rateLimiterMetrics: this.rateLimiter.getMetrics(),
    };
  }

  reset(): void {
    this.activeAnalysis = false;
    this.rateLimiter.reset();
  }
}
