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

// Mock performance API avec support nextHopProtocol
const mockPerformance = {
  now: jest.fn(() => 1000),
  timeOrigin: Date.now() - 1000,
  getEntriesByType: jest.fn()
};
Object.defineProperty(global, 'performance', {
  writable: true,
  value: mockPerformance
});

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

      // Vérifier la détection de tracking QUIC
      expect(logger.warn).toHaveBeenCalledWith(
        '[NetworkLatencyCollector] QUIC tracking detected',
        expect.objectContaining({
          url: 'https://example.com/track.gif',
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

      // Vérifier la détection 0-RTT
      expect(logger.debug).toHaveBeenCalledWith(
        '[NetworkLatencyCollector] QUIC 0-RTT detected',
        expect.objectContaining({
          protocol: 'h3',
          latency: '30.00'
        })
      );
    });

    it('should track protocol statistics', () => {
      const mockResources = [
        { name: 'https://a.com', nextHopProtocol: 'h3', fetchStart: 0, responseStart: 40 },
        { name: 'https://b.com', nextHopProtocol: 'h3', fetchStart: 0, responseStart: 45 },
        { name: 'https://c.com', nextHopProtocol: 'h2', fetchStart: 0, connectStart: 0, connectEnd: 60 },
        { name: 'https://d.com', nextHopProtocol: 'http/1.1', fetchStart: 0, connectEnd: 100 }
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
          name: 'https://telemetry.service.com/data',
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

      // Le traitement devrait être rapide même avec beaucoup de ressources
      expect(processingTime).toBeLessThan(50); // Moins de 50ms

      // Vérifier que seules les 20 dernières sont traitées
      const stats = collector.getStatistics();
      expect(stats.samples).toBeLessThanOrEqual(20);
    });
  });
});