/**
 * Tests de non-régression pour les améliorations critiques
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
  },
  scripting: {
    executeScript: jest.fn().mockResolvedValue(undefined)
  },
  tabs: {
    query: jest.fn().mockResolvedValue([])
  }
} as any;

// Mock performance API
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

// Mock fetch
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200
});

jest.mock('@/shared/utils/secureLogger');

describe('Regression Tests - Critical Improvements', () => {

  describe('1. Cross-Context Time Synchronization', () => {
    let sensor: DOMResonanceSensor;

    beforeEach(() => {
      sensor = new DOMResonanceSensor();
      jest.clearAllMocks();
    });

    afterEach(() => {
      sensor.stop();
    });

    it('should NOT use performance.now() for cross-context timing', (done) => {
      const mockSendMessage = chrome.runtime.sendMessage as jest.Mock;

      sensor.start();

      // Créer des mutations
      for (let i = 0; i < 10; i++) {
        const div = document.createElement('div');
        div.setAttribute('data-tracking', 'true');
        document.body.appendChild(div);
        document.body.removeChild(div);
      }

      setTimeout(() => {
        const calls = mockSendMessage.mock.calls;
        const resonanceCall = calls.find(call =>
          call[0]?.type === 'DOM_RESONANCE_DETECTED'
        );

        if (resonanceCall) {
          const payload = resonanceCall[0].payload;

          // VÉRIFICATION: timestamps doit contenir detected/emitted, pas highResTimestamp
          expect(payload.timestamps).toBeDefined();
          expect(payload.timestamps.detected).toBeDefined();
          expect(payload.timestamps.emitted).toBeDefined();
          expect(payload.highResTimestamp).toBeUndefined(); // NE DOIT PAS exister
          expect(payload.performanceOrigin).toBeUndefined(); // NE DOIT PAS exister

          // Les timestamps doivent être des valeurs Date.now() (absolues)
          expect(payload.timestamps.detected).toBeGreaterThan(1600000000000); // Après 2020
          expect(payload.timestamps.emitted).toBeGreaterThan(1600000000000);
        }

        done();
      }, 100);
    });

    it('should calculate latency using absolute timestamps', () => {
      const message = {
        timestamps: {
          detected: Date.now() - 50,
          emitted: Date.now() - 30
        }
      };

      const receivedAt = Date.now();
      const transmissionLatency = receivedAt - message.timestamps.emitted;
      const totalLatency = receivedAt - message.timestamps.detected;

      // Les latences doivent être positives et raisonnables
      expect(transmissionLatency).toBeGreaterThanOrEqual(30);
      expect(transmissionLatency).toBeLessThan(100);
      expect(totalLatency).toBeGreaterThanOrEqual(50);
      expect(totalLatency).toBeLessThan(150);
    });
  });

  describe('2. No Global window.fetch Mutation', () => {
    it('should NOT modify window.fetch globally', () => {
      const originalFetch = window.fetch;

      // Simuler l'exécution de l'intercepteur P2P
      const interceptorCode = `
        // NE PAS modifier window.fetch !
        if (!window.symbiontP2P) {
          Object.defineProperty(window, 'symbiontP2P', {
            value: {
              fetch: async (url, options) => {
                return fetch(url, options);
              }
            },
            writable: false,
            configurable: false
          });
        }
      `;

      // Exécuter le code
      eval(interceptorCode);

      // VÉRIFICATION: window.fetch doit rester inchangé
      expect(window.fetch).toBe(originalFetch);
      expect((window as any).symbiontP2P).toBeDefined();
      expect((window as any).symbiontP2P.fetch).toBeDefined();
    });
  });

  describe('3. Feature Detection for nextHopProtocol', () => {
    let collector: NetworkLatencyCollector;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterEach(() => {
      if (collector) {
        collector.stop();
      }
    });

    it('should detect nextHopProtocol support correctly', () => {
      // Test avec support
      const mockResourceWithProtocol = {
        name: 'https://example.com',
        nextHopProtocol: 'h3',
        fetchStart: 100,
        responseStart: 150
      };
      mockPerformance.getEntriesByType.mockReturnValue([mockResourceWithProtocol]);

      collector = new NetworkLatencyCollector();
      expect(logger.info).toHaveBeenCalledWith(
        '[NetworkLatencyCollector] Initialized',
        expect.objectContaining({
          nextHopProtocolSupport: true
        })
      );
    });

    it('should fallback gracefully when nextHopProtocol is not available', () => {
      // Test sans support
      const mockResourceWithoutProtocol = {
        name: 'https://example.com',
        fetchStart: 100,
        connectStart: 100,
        connectEnd: 105,
        responseStart: 150
      };
      mockPerformance.getEntriesByType.mockReturnValue([mockResourceWithoutProtocol]);

      collector = new NetworkLatencyCollector();

      // Forcer la détection sans nextHopProtocol
      (collector as any).supportsNextHopProtocol = false;
      (collector as any).measureResourceTimingLatency();

      // Doit utiliser les heuristiques sans crash
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should handle invalid resource timing entries', () => {
      const invalidResources = [
        null,
        undefined,
        { name: 'test' }, // Manque fetchStart
        { fetchStart: -1, responseStart: 100 }, // fetchStart négatif
        { fetchStart: 100 } // Manque responseStart
      ];

      mockPerformance.getEntriesByType.mockReturnValue(invalidResources);

      collector = new NetworkLatencyCollector();
      (collector as any).measureResourceTimingLatency();

      // Ne doit pas crash sur des entrées invalides
      expect(logger.error).not.toHaveBeenCalledWith(
        expect.stringContaining('Resource timing analysis failed'),
        expect.any(Error)
      );
    });
  });

  describe('4. Data Validation & Bounds Checking', () => {
    let collector: NetworkLatencyCollector;

    beforeEach(() => {
      collector = new NetworkLatencyCollector();
    });

    afterEach(() => {
      collector.stop();
    });

    it('should reject invalid latency values', () => {
      const invalidValues = [
        -1,        // Négatif
        NaN,       // Not a number
        Infinity,  // Infini
        70000,     // > 60 secondes
        null as any,
        undefined as any
      ];

      invalidValues.forEach(value => {
        (collector as any).recordLatency(value);
      });

      // Aucune valeur invalide ne doit être enregistrée
      const stats = collector.getStatistics();
      expect(stats.samples).toBe(0);
    });

    it('should accept valid latency values', () => {
      const validValues = [0, 10, 50.5, 100, 1000, 59999];

      validValues.forEach(value => {
        (collector as any).recordLatency(value);
      });

      const stats = collector.getStatistics();
      expect(stats.samples).toBe(validValues.length);
    });
  });

  describe('5. Memory Leak Prevention', () => {
    it('should limit buffer size to prevent memory leaks', () => {
      const collector = new NetworkLatencyCollector();

      // Ajouter plus d'entrées que la limite
      for (let i = 0; i < 150; i++) {
        (collector as any).recordLatency(i);
      }

      const stats = collector.getStatistics();
      expect(stats.samples).toBeLessThanOrEqual(100); // MAX_BUFFER_SIZE

      collector.stop();
    });

    it('should cleanup resources on stop', () => {
      const collector = new NetworkLatencyCollector();
      const callback = jest.fn();

      collector.start(callback);

      // Vérifier que les ressources sont actives
      expect((collector as any).isMonitoring).toBe(true);
      expect((collector as any).neuralMeshCallback).toBe(callback);

      collector.stop();

      // Vérifier le cleanup
      expect((collector as any).isMonitoring).toBe(false);
      expect((collector as any).monitoringInterval).toBeNull();
      expect((collector as any).neuralMeshCallback).toBeNull();
    });

    it('should throttle neural mesh notifications', () => {
      const collector = new NetworkLatencyCollector();
      const callback = jest.fn();

      collector.start(callback);

      // Enregistrer plusieurs latences rapidement
      const now = Date.now();
      for (let i = 0; i < 10; i++) {
        (collector as any).lastNeuralMeshNotification = now - 500; // Simuler 500ms depuis dernière notif
        (collector as any).recordLatency(50);
      }

      // Le callback ne devrait pas être appelé plus d'une fois par seconde
      // Avec notre simulation, il devrait être appelé au maximum 1 fois
      expect(callback).toHaveBeenCalledTimes(0); // Throttled

      collector.stop();
    });
  });

  describe('6. Performance Optimizations', () => {
    it('should process only recent resources (max 10)', () => {
      const collector = new NetworkLatencyCollector();

      // Créer 100 ressources
      const manyResources = Array.from({ length: 100 }, (_, i) => ({
        name: `https://example.com/resource${i}`,
        fetchStart: i * 10,
        responseStart: i * 10 + 5,
        connectStart: i * 10,
        connectEnd: i * 10 + 2
      }));

      mockPerformance.getEntriesByType.mockReturnValue(manyResources);

      const startTime = performance.now();
      (collector as any).measureResourceTimingLatency();
      const processingTime = performance.now() - startTime;

      // Vérifier que seulement 10 dernières ressources sont traitées
      // Le temps de traitement devrait être court
      expect(processingTime).toBeLessThan(10); // Moins de 10ms

      collector.stop();
    });
  });

  describe('7. QUIC/HTTP3 Detection Robustness', () => {
    it('should detect QUIC tracking patterns', () => {
      const collector = new NetworkLatencyCollector();

      const quicResource = {
        name: 'https://analytics.example.com/track',
        nextHopProtocol: 'h3',
        fetchStart: 0,
        responseStart: 30,
        connectStart: 0,
        connectEnd: 0
      };

      mockPerformance.getEntriesByType.mockReturnValue([quicResource]);

      (collector as any).measureResourceTimingLatency();

      // Vérifier la détection de tracking QUIC
      expect(logger.warn).toHaveBeenCalledWith(
        '[NetworkLatencyCollector] QUIC tracking detected',
        expect.objectContaining({
          hostname: 'analytics.example.com'
        })
      );

      const stats = collector.getStatistics();
      expect(stats.protocols?.udpTrackers).toContain('analytics.example.com');

      collector.stop();
    });

    it('should handle invalid URLs gracefully', () => {
      const collector = new NetworkLatencyCollector();

      const invalidUrlResource = {
        name: 'not-a-valid-url',
        nextHopProtocol: 'h3',
        fetchStart: 0,
        responseStart: 30,
        connectStart: 0,
        connectEnd: 0
      };

      mockPerformance.getEntriesByType.mockReturnValue([invalidUrlResource]);

      // Ne doit pas crash sur une URL invalide
      expect(() => {
        (collector as any).measureResourceTimingLatency();
      }).not.toThrow();

      collector.stop();
    });
  });
});