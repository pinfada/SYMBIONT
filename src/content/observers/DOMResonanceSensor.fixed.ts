import { logger } from '@/shared/utils/secureLogger';
import { SecureRandom } from '@/shared/utils/secureRandom';

/**
 * CORRECTION CRITIQUE: Synchronisation temporelle cross-context
 *
 * PROBLÈME: performance.now() n'est PAS comparable entre contextes
 * - Content script: temps depuis navigation start
 * - Background: temps depuis service worker start
 *
 * SOLUTION: Utiliser un timestamp absolu + delta relatif
 */
export class DOMResonanceSensorFixed {
  // ... autres propriétés ...

  private emitResonanceSignal(intensity: number): void {
    if (intensity < 0) {
      throw new Error('Resonance intensity must be non-negative');
    }

    this.smoothedResonance = this.emaAlpha * intensity +
                             (1 - this.emaAlpha) * this.smoothedResonance;

    if (this.smoothedResonance > this.metrics.peakResonance) {
      this.metrics.peakResonance = this.smoothedResonance;
    }

    const RESONANCE_THRESHOLD = 0.4;

    if (this.smoothedResonance > RESONANCE_THRESHOLD) {
      // SOLUTION: Double timestamp pour synchronisation correcte
      const detectionTime = Date.now(); // Temps absolu de détection
      const sendTime = Date.now(); // Temps juste avant envoi

      const resonanceData = {
        type: 'DOM_RESONANCE_DETECTED',
        payload: {
          resonance: this.smoothedResonance,
          jitter: this.metrics.averageJitter,
          shadowActivity: this.shadowActivityBuffer.length,

          // Timestamps corrigés pour synchronisation cross-context
          timestamps: {
            detection: detectionTime,     // Moment exact de détection
            emission: sendTime,           // Moment d'envoi
            // Pas de performance.now() car non comparable !
          },

          metrics: this.getMetrics(),
          state: this.getResonanceState()
        }
      };

      // Mesurer le temps d'envoi
      const preSend = Date.now();

      chrome.runtime.sendMessage(resonanceData)
        .then(() => {
          const postSend = Date.now();
          const sendLatency = postSend - preSend;

          // Log avec latence mesurée localement
          logger.debug('Resonance signal sent', {
            resonance: this.smoothedResonance,
            sendLatency: `${sendLatency}ms`,
            threshold: RESONANCE_THRESHOLD
          });
        })
        .catch((err: Error) => {
          logger.warn('Failed to send resonance signal', {
            error: err.message,
            resonance: this.smoothedResonance
          });
        });
    }
  }
}