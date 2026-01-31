import { logger } from '@/shared/utils/secureLogger';

/**
 * NetworkLatencyCollector avec détection QUIC/HTTP3 robuste
 *
 * CORRECTIONS:
 * - Vérification de support nextHopProtocol
 * - Fallback pour navigateurs non compatibles
 * - Gestion d'erreur sur les propriétés manquantes
 */
export class NetworkLatencyCollectorFixed {
  private latencyBuffer: number[] = [];
  private readonly MAX_BUFFER_SIZE = 100;

  // Statistiques protocoles avec validation
  private protocolStats = {
    quic: { count: 0, totalLatency: 0, zeroRTT: 0 },
    http2: { count: 0, totalLatency: 0 },
    http1: { count: 0, totalLatency: 0 },
    unknown: { count: 0, totalLatency: 0 }, // Pour protocoles non identifiés
    udpTrackers: new Set<string>()
  };

  // Feature detection pour nextHopProtocol
  private readonly supportsNextHopProtocol = this.checkNextHopProtocolSupport();

  private checkNextHopProtocolSupport(): boolean {
    try {
      // Vérifier si l'API existe et est accessible
      if (!('performance' in window) || !performance.getEntriesByType) {
        return false;
      }

      const testEntry = performance.getEntriesByType('resource')[0];
      if (testEntry && 'nextHopProtocol' in testEntry) {
        logger.info('[NetworkLatencyCollector] nextHopProtocol supported');
        return true;
      }

      logger.warn('[NetworkLatencyCollector] nextHopProtocol NOT supported');
      return false;
    } catch (error) {
      logger.error('[NetworkLatencyCollector] Error checking protocol support:', error);
      return false;
    }
  }

  private measureResourceTimingLatency(): void {
    if (!('performance' in window) || !performance.getEntriesByType) {
      return;
    }

    try {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const recentResources = resources.slice(-20);

      for (const resource of recentResources) {
        // SÉCURITÉ: Vérifier que toutes les propriétés existent
        if (!this.validateResourceTiming(resource)) {
          continue;
        }

        let protocol = 'unknown';
        let isQUIC = false;
        let isHTTP2 = false;

        // Détection protocole avec fallback
        if (this.supportsNextHopProtocol) {
          try {
            protocol = (resource as any).nextHopProtocol || 'unknown';
            isQUIC = protocol.toLowerCase().includes('h3') ||
                    protocol.toLowerCase().includes('quic');
            isHTTP2 = protocol.toLowerCase().includes('h2');
          } catch (err) {
            logger.debug('[NetworkLatencyCollector] Protocol detection failed', { err });
          }
        } else {
          // FALLBACK: Heuristiques pour détecter QUIC sans nextHopProtocol
          isQUIC = this.detectQUICHeuristic(resource);
          isHTTP2 = this.detectHTTP2Heuristic(resource);
        }

        // Calcul de latence adapté au protocole
        const networkLatency = this.calculateProtocolLatency(resource, isQUIC, isHTTP2);

        if (networkLatency > 0 && Number.isFinite(networkLatency)) {
          this.recordLatency(networkLatency);
          this.updateProtocolStats(protocol, isQUIC, isHTTP2, networkLatency);

          // Détection tracking UDP/QUIC avec validation URL
          if (isQUIC) {
            this.detectQUICTracking(resource.name, networkLatency, protocol);
          }
        }
      }
    } catch (error) {
      logger.error('[NetworkLatencyCollector] Resource timing error:', error);
    }
  }

  private validateResourceTiming(resource: PerformanceResourceTiming): boolean {
    // Vérifier que les propriétés critiques existent et sont valides
    return !!(
      resource &&
      typeof resource.fetchStart === 'number' &&
      typeof resource.responseStart === 'number' &&
      resource.fetchStart >= 0 &&
      resource.responseStart >= resource.fetchStart &&
      resource.name &&
      typeof resource.name === 'string'
    );
  }

  private detectQUICHeuristic(resource: PerformanceResourceTiming): boolean {
    // Heuristiques pour détecter QUIC sans nextHopProtocol
    // QUIC a généralement:
    // - Pas de temps de connexion TCP (connectEnd - connectStart ≈ 0)
    // - Latence très faible sur connexions répétées (0-RTT)

    const connectionTime = resource.connectEnd - resource.connectStart;
    const totalTime = resource.responseStart - resource.fetchStart;

    // QUIC probable si connexion instantanée et réponse rapide
    return connectionTime < 5 && totalTime < 50;
  }

  private detectHTTP2Heuristic(resource: PerformanceResourceTiming): boolean {
    // HTTP/2 a généralement:
    // - Connexion réutilisée (secureConnectionStart = 0)
    // - Temps de transfert optimisé

    return resource.secureConnectionStart === 0 &&
           resource.connectEnd === resource.connectStart;
  }

  private calculateProtocolLatency(
    resource: PerformanceResourceTiming,
    isQUIC: boolean,
    isHTTP2: boolean
  ): number {
    try {
      if (isQUIC) {
        // QUIC: mesurer depuis fetch jusqu'à response (pas de TCP)
        return Math.max(0, resource.responseStart - resource.fetchStart);
      } else if (isHTTP2) {
        // HTTP/2: connexion déjà établie, mesurer transfert
        return Math.max(0, resource.responseStart - resource.requestStart);
      } else {
        // HTTP/1.x: latence complète incluant TCP/TLS
        return Math.max(0, resource.connectEnd - resource.fetchStart);
      }
    } catch (error) {
      // Fallback en cas d'erreur
      return resource.responseStart - resource.fetchStart;
    }
  }

  private updateProtocolStats(
    protocol: string,
    isQUIC: boolean,
    isHTTP2: boolean,
    latency: number
  ): void {
    if (isQUIC) {
      this.protocolStats.quic.count++;
      this.protocolStats.quic.totalLatency += latency;
      if (latency < 50) {
        this.protocolStats.quic.zeroRTT++;
      }
    } else if (isHTTP2) {
      this.protocolStats.http2.count++;
      this.protocolStats.http2.totalLatency += latency;
    } else if (protocol !== 'unknown') {
      this.protocolStats.http1.count++;
      this.protocolStats.http1.totalLatency += latency;
    } else {
      this.protocolStats.unknown.count++;
      this.protocolStats.unknown.totalLatency += latency;
    }
  }

  private detectQUICTracking(url: string, latency: number, protocol: string): void {
    try {
      // Validation URL avant parsing
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      const hostname = urlObj.hostname;

      // Patterns de tracking élargis
      const trackingPatterns = [
        'track', 'analytics', 'telemetry', 'collect',
        'beacon', 'metric', 'pixel', 'event',
        '_ga', '_utm', 'fbclid', 'gclid'
      ];

      const isTracking = trackingPatterns.some(pattern =>
        pathname.includes(pattern) ||
        urlObj.search.includes(pattern)
      );

      if (isTracking) {
        this.protocolStats.udpTrackers.add(hostname);

        logger.warn('[NetworkLatencyCollector] QUIC tracking detected', {
          hostname,
          path: pathname.substring(0, 50),
          latency: latency.toFixed(2),
          protocol
        });
      }
    } catch (error) {
      // URL invalide, ignorer silencieusement
      logger.debug('[NetworkLatencyCollector] Invalid URL for tracking detection', { url });
    }
  }

  private recordLatency(latency: number): void {
    // Validation stricte
    if (!Number.isFinite(latency) || latency < 0 || latency > 60000) {
      logger.debug('[NetworkLatencyCollector] Invalid latency rejected', { latency });
      return;
    }

    this.latencyBuffer.push(latency);
    if (this.latencyBuffer.length > this.MAX_BUFFER_SIZE) {
      this.latencyBuffer.shift();
    }
  }

  getStatistics(): {
    average: number;
    min: number;
    max: number;
    variance: number;
    samples: number;
    protocols: {
      quic: { count: number; avgLatency: number; zeroRTTRate: number };
      http2: { count: number; avgLatency: number };
      http1: { count: number; avgLatency: number };
      unknown: { count: number; avgLatency: number };
      udpTrackers: string[];
      protocolSupport: boolean;
    };
  } {
    const basicStats = this.calculateBasicStats();

    return {
      ...basicStats,
      protocols: {
        quic: this.getProtocolAverage('quic'),
        http2: this.getProtocolAverage('http2'),
        http1: this.getProtocolAverage('http1'),
        unknown: this.getProtocolAverage('unknown'),
        udpTrackers: Array.from(this.protocolStats.udpTrackers),
        protocolSupport: this.supportsNextHopProtocol
      }
    };
  }

  private calculateBasicStats() {
    if (this.latencyBuffer.length === 0) {
      return { average: 0, min: 0, max: 0, variance: 0, samples: 0 };
    }

    const sum = this.latencyBuffer.reduce((a, b) => a + b, 0);
    const average = sum / this.latencyBuffer.length;
    const min = Math.min(...this.latencyBuffer);
    const max = Math.max(...this.latencyBuffer);

    const squaredDiffs = this.latencyBuffer.map(value => Math.pow(value - average, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / this.latencyBuffer.length;

    return { average, min, max, variance, samples: this.latencyBuffer.length };
  }

  private getProtocolAverage(type: 'quic' | 'http2' | 'http1' | 'unknown') {
    const stats = this.protocolStats[type];
    const avgLatency = stats.count > 0 ? stats.totalLatency / stats.count : 0;

    if (type === 'quic') {
      return {
        count: stats.count,
        avgLatency,
        zeroRTTRate: stats.count > 0 ? (stats as any).zeroRTT / stats.count : 0
      };
    }

    return { count: stats.count, avgLatency };
  }
}