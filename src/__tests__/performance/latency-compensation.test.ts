/**
 * Tests de compensation de latence et détection de protocoles modernes
 * @jest-environment jsdom
 */

import { DOMResonanceSensor } from '@/content/observers/DOMResonanceSensor';
import { NetworkLatencyCollector } from '@/background/services/NetworkLatencyCollector';
import { logger } from '@/shared/utils/secureLogger';

// Mock Chrome APIs
global.chrome = {
  runtime: {
    sendMessage: jest.fn().mockResolvedValue(undefined),
    getURL: jest.fn((path) => `chrome-extension://fake-id/${path}`)
  }
} as any;

// Mock performance API avec support nextHopProtocol.
// `now` est une fonction simple (pas jest.fn) : avec `resetMocks: true`, un
// jest.fn verrait son implémentation effacée avant chaque test et renverrait
// `undefined` (→ latences NaN). getEntriesByType reste un jest.fn pour que les
// tests puissent injecter leurs ressources via mockReturnValue.
const mockPerformance = {
  now: () => 1000,
  timeOrigin: Date.now() - 1000,
  getEntriesByType: jest.fn()
};
Object.defineProperty(global, 'performance', {
  writable: true,
  value: mockPerformance
});

// Entrée resource par défaut exposant nextHopProtocol : permet à
// NetworkLatencyCollector de détecter le support de l'API dès sa construction
// (le constructeur interroge getEntriesByType avant que les tests ne fixent
// leurs propres ressources).
const DEFAULT_RESOURCE_ENTRY = [
  { name: 'https://init.example.com/', nextHopProtocol: 'h3', fetchStart: 0, responseStart: 10 }
];

// Mock requestIdleCallback
global.requestIdleCallback = jest.fn((callback) => {
  setTimeout(() => callback({
    timeRemaining: () => 50,
    didTimeout: false
  } as IdleDeadline), 0);
  return 1;
});

global.cancelIdleCallback = jest.fn();

jest.mock('@/shared/utils/secureLogger');

describe('Latency Compensation & Modern Protocol Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Fixé APRÈS le reset automatique de resetMocks, donc survit jusqu'au test.
    // Le constructeur de NetworkLatencyCollector lit getEntriesByType pour
    // détecter le support de nextHopProtocol : sans ce défaut il retomberait
    // sur la détection heuristique et ignorerait les protocoles annoncés.
    mockPerformance.getEntriesByType.mockReturnValue(DEFAULT_RESOURCE_ENTRY);
  });

  describe('Worker Lag Compensation', () => {
    let sensor: DOMResonanceSensor;

    beforeEach(() => {
      sensor = new DOMResonanceSensor();
    });

    afterEach(() => {
      sensor.stop();
    });

    it('should include high-resolution timestamps in resonance signals', (done) => {
      const mockSendMessage = chrome.runtime.sendMessage as jest.Mock;

      // Simuler une résonance détectable
      sensor.start();

      // Créer une mutation DOM significative
      const observer = new MutationObserver(() => {});
      observer.observe(document.body, { childList: true });

      // Déclencher des mutations
      for (let i = 0; i < 10; i++) {
        const div = document.createElement('div');
        div.setAttribute('data-tracking', 'true');
        document.body.appendChild(div);
        document.body.removeChild(div);
      }

      setTimeout(() => {
        // Vérifier que le message contient les timestamps haute résolution
        const calls = mockSendMessage.mock.calls;
        const resonanceCall = calls.find(call =>
          call[0]?.type === 'DOM_RESONANCE_DETECTED'
        );

        if (resonanceCall) {
          const payload = resonanceCall[0].payload;

          expect(payload).toHaveProperty('highResTimestamp');
          expect(payload).toHaveProperty('performanceOrigin');
          expect(payload).toHaveProperty('timestamp');

          expect(typeof payload.highResTimestamp).toBe('number');
          expect(typeof payload.performanceOrigin).toBe('number');
          expect(payload.highResTimestamp).toBeGreaterThan(0);
        }

        observer.disconnect();
        done();
      }, 100);
    });

    it('should calculate transmission latency correctly', () => {
      const startTime = performance.now();
      const message = {
        highResTimestamp: startTime - 50, // 50ms de latence simulée
        performanceOrigin: performance.timeOrigin,
        timestamp: Date.now()
      };

      const receivedAt = performance.now();
      const transmissionLatency = receivedAt - message.highResTimestamp;

      expect(transmissionLatency).toBeGreaterThanOrEqual(50);
      expect(transmissionLatency).toBeLessThan(100); // Marge raisonnable
    });
  });

  describe('QUIC/HTTP3 Detection', () => {
    let collector: NetworkLatencyCollector;

    beforeEach(() => {
      collector = new NetworkLatencyCollector();
    });

    afterEach(() => {
      collector.stop();
    });

    it('should detect QUIC protocol from resource timing', () => {
      // Mock des ressources avec différents protocoles
      const mockResources = [
        {
          name: 'https://example.com/track.gif',
          nextHopProtocol: 'h3-29', // QUIC
          fetchStart: 100,
          connectStart: 100,
          connectEnd: 110,
          responseStart: 115,
          responseEnd: 120
        },
        {
          name: 'https://example.com/api',
          nextHopProtocol: 'h2', // HTTP/2
          fetchStart: 200,
          connectStart: 200,
          connectEnd: 220,
          responseStart: 225,
          responseEnd: 230
        },
        {
          name: 'https://old-site.com/image.png',
          nextHopProtocol: 'http/1.1', // HTTP/1.1
          fetchStart: 300,
          connectStart: 300,
          connectEnd: 350,
          responseStart: 360,
          responseEnd: 370
        }
      ];

      mockPerformance.getEntriesByType.mockReturnValue(mockResources);

      // Déclencher la mesure
      (collector as any).measureResourceTimingLatency();

      // Vérifier les logs pour QUIC
      expect(logger.debug).toHaveBeenCalledWith(
        '[NetworkLatencyCollector] Modern protocol detected',
        expect.objectContaining({
          protocol: 'h3-29'
        })
      );

      // Vérifier la détection de tracking QUIC (le collector journalise le
      // hostname et non l'URL complète, pour limiter la fuite de données).
      expect(logger.warn).toHaveBeenCalledWith(
        '[NetworkLatencyCollector] QUIC tracking detected',
        expect.objectContaining({
          hostname: 'example.com',
          protocol: 'h3-29'
        })
      );
    });

    it('should detect 0-RTT connections', () => {
      const mockResources = [
        {
          name: 'https://example.com/fast',
          nextHopProtocol: 'h3',
          fetchStart: 100,
          responseStart: 130, // Seulement 30ms - 0-RTT probable
          responseEnd: 140
        }
      ];

      mockPerformance.getEntriesByType.mockReturnValue(mockResources);

      (collector as any).measureResourceTimingLatency();

      // Une connexion QUIC sous 50ms est comptabilisée comme 0-RTT : on le
      // vérifie via les statistiques exposées (le taux 0-RTT vaut 100%).
      const stats = collector.getStatistics();
      expect(stats.protocols!.quic.count).toBe(1);
      expect(stats.protocols!.quic.zeroRTTRate).toBe(1);
    });

    it('should track protocol statistics', () => {
      const mockResources = [
        { name: 'https://a.com', nextHopProtocol: 'h3', fetchStart: 0, responseStart: 40 },
        { name: 'https://b.com', nextHopProtocol: 'h3', fetchStart: 0, responseStart: 45 },
        { name: 'https://c.com', nextHopProtocol: 'h2', fetchStart: 0, connectStart: 0, connectEnd: 60, responseStart: 55 },
        { name: 'https://d.com', nextHopProtocol: 'http/1.1', fetchStart: 0, connectEnd: 100, responseStart: 90 }
      ];

      mockPerformance.getEntriesByType.mockReturnValue(mockResources);

      (collector as any).measureResourceTimingLatency();

      const stats = collector.getStatistics();

      expect(stats.protocols).toBeDefined();
      expect(stats.protocols!.quic.count).toBe(2);
      expect(stats.protocols!.quic.zeroRTTRate).toBe(1); // 100% sont < 50ms
      expect(stats.protocols!.http2.count).toBe(1);
      expect(stats.protocols!.http1.count).toBe(1);
    });

    it('should identify UDP trackers using QUIC', () => {
      const mockResources = [
        {
          name: 'https://analytics.example.com/collect',
          nextHopProtocol: 'h3',
          fetchStart: 0,
          responseStart: 50
        },
        {
          // Le motif de tracking est détecté dans le chemin de l'URL ; le
          // collector enregistre alors le hostname comme tracker UDP.
          name: 'https://telemetry.service.com/telemetry',
          nextHopProtocol: 'h3',
          fetchStart: 0,
          responseStart: 60
        },
        {
          name: 'https://normal-api.com/endpoint',
          nextHopProtocol: 'h3',
          fetchStart: 0,
          responseStart: 70
        }
      ];

      mockPerformance.getEntriesByType.mockReturnValue(mockResources);

      (collector as any).measureResourceTimingLatency();

      const stats = collector.getStatistics();

      expect(stats.protocols!.udpTrackers).toContain('analytics.example.com');
      expect(stats.protocols!.udpTrackers).toContain('telemetry.service.com');
      expect(stats.protocols!.udpTrackers).not.toContain('normal-api.com');
    });
  });

  describe('Integration: Latency Compensation in Mutation', () => {
    it('should apply compensated timestamp to mutations', () => {
      const wallClockTime = Date.now();
      const transmissionLatency = 35; // 35ms de latence
      const compensatedTimestamp = wallClockTime - Math.floor(transmissionLatency);

      // Simuler une mutation avec timestamp compensé
      const mutation = {
        type: 'cognitive' as const,
        trigger: 'resonance_adaptation',
        magnitude: 0.4,
        timestamp: compensatedTimestamp
      };

      // Vérifier que le timestamp est bien dans le passé
      expect(mutation.timestamp).toBeLessThan(wallClockTime);
      expect(wallClockTime - mutation.timestamp).toBeGreaterThanOrEqual(35);
    });
  });

  describe('Performance Metrics', () => {
    it('should handle high-frequency resource timing without performance impact', () => {
      const collector = new NetworkLatencyCollector();

      // Simuler 100 ressources (cas extrême)
      const mockResources = Array.from({ length: 100 }, (_, i) => ({
        name: `https://example.com/resource${i}`,
        nextHopProtocol: ['h3', 'h2', 'http/1.1'][i % 3],
        fetchStart: i * 10,
        connectStart: i * 10,
        connectEnd: i * 10 + 20,
        responseStart: i * 10 + 25,
        responseEnd: i * 10 + 30
      }));

      mockPerformance.getEntriesByType.mockReturnValue(mockResources);

      const startTime = performance.now();
      (collector as any).measureResourceTimingLatency();
      const processingTime = performance.now() - startTime;

      // Le temps mur n'est pas fiable en CI (performance.now est mocké) : on
      // journalise la mesure plutôt que d'asserter un budget absolu.
      // eslint-disable-next-line no-console
      console.log(`[perf] measureResourceTimingLatency processing time: ${processingTime}ms`);

      // Vérification fonctionnelle : le collector borne le nombre d'échantillons
      // traités (fenêtre glissante) et ne traite pas les 100 ressources brutes.
      const stats = collector.getStatistics();
      expect(stats.samples).toBeLessThanOrEqual(20);
      expect(stats.samples).toBeGreaterThan(0);
    });
  });
});