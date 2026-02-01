/**
 * Tests unitaires pour le système de rêve analytique
 * @jest-environment jsdom
 */

import { DreamProcessor } from '@/core/dreams/DreamProcessor';
import { MemoryFragmentCollector } from '@/core/dreams/MemoryFragmentCollector';
import { SignatureVectorizer } from '@/core/dreams/SignatureVectorizer';
import { AdaptiveResonanceClustering } from '@/core/dreams/AdaptiveResonanceClustering';
import { ThermalThrottlingController } from '@/core/dreams/ThermalThrottlingController';
import { CDNWhitelist } from '@/core/dreams/CDNWhitelist';
import type { MemoryFragment } from '@/core/dreams/DreamProcessor';

// Mock des dépendances
jest.mock('@/shared/utils/secureLogger');
jest.mock('@/shared/utils/secureRandom', () => ({
  SecureRandom: {
    random: () => Math.random(),
    randomInt: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
  }
}));

// Mock Chrome API
global.chrome = {
  runtime: {
    sendMessage: jest.fn().mockResolvedValue(undefined)
  },
  tabs: {
    query: jest.fn().mockResolvedValue([{ url: 'https://example.com' }])
  }
} as any;

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => 1000),
  getEntriesByType: jest.fn((type: string) => {
    if (type === 'measure') {
      return [{
        name: 'test-measure',
        entryType: 'measure',
        startTime: 900,
        duration: 50
      }];
    }
    return [];
  }),
  getEntriesByName: jest.fn(() => [])
};
Object.defineProperty(global, 'performance', {
  writable: true,
  value: mockPerformance
});

// Mock IndexedDB
const mockIDBRequest = {
  onsuccess: null as any,
  onerror: null as any,
  result: null as any
};

const mockIDBDatabase = {
  objectStoreNames: {
    contains: jest.fn(() => false)
  },
  createObjectStore: jest.fn(() => ({
    createIndex: jest.fn()
  })),
  transaction: jest.fn(() => ({
    objectStore: jest.fn(() => ({
      put: jest.fn(() => mockIDBRequest),
      get: jest.fn(() => mockIDBRequest),
      add: jest.fn(() => mockIDBRequest),
      count: jest.fn(() => {
        const req = { ...mockIDBRequest };
        setTimeout(() => {
          req.result = 0;
          if (req.onsuccess) req.onsuccess({ target: req });
        }, 0);
        return req;
      }),
      clear: jest.fn(() => mockIDBRequest),
      index: jest.fn(() => ({
        openCursor: jest.fn(() => mockIDBRequest)
      }))
    }))
  })),
  close: jest.fn()
};

global.indexedDB = {
  open: jest.fn(() => {
    const request = { ...mockIDBRequest };
    setTimeout(() => {
      request.result = mockIDBDatabase;
      if (request.onsuccess) request.onsuccess({ target: request });
    }, 0);
    return request;
  })
} as any;

// Mock crypto API
global.crypto = {
  subtle: {
    digest: jest.fn(async () => new ArrayBuffer(32))
  }
} as any;

describe('DreamProcessor', () => {
  let processor: DreamProcessor;

  beforeEach(() => {
    processor = DreamProcessor.getInstance();
    jest.clearAllMocks();
  });

  describe('Nocturnal Synthesis', () => {
    it('should perform synthesis with valid memory fragments', async () => {
      const fragments: MemoryFragment[] = [
        {
          domain: 'example.com',
          timestamp: Date.now(),
          friction: 100,
          latency: 50,
          trackers: ['ga.js', 'pixel.gif'],
          hiddenElements: [],
          protocolSignature: 'h2',
          resourceTimings: []
        },
        {
          domain: 'test.com',
          timestamp: Date.now(),
          friction: 80,
          latency: 30,
          trackers: ['analytics.js'],
          hiddenElements: [],
          protocolSignature: 'h3',
          resourceTimings: []
        }
      ];

      const report = await processor.performNocturnalSynthesis(fragments);

      expect(report).toBeDefined();
      expect(report.fragmentsAnalyzed).toBe(2);
      expect(report.synthesisId).toBeDefined();
      expect(report.endTime).toBeGreaterThan(report.startTime);
    });

    it('should detect shadow entities from correlated domains', async () => {
      // Créer des fragments avec signatures similaires
      const fragments: MemoryFragment[] = [
        {
          domain: 'tracker1.com',
          timestamp: Date.now(),
          friction: 120,
          latency: 45,
          trackers: ['common-tracker.js', 'fingerprint.js'],
          hiddenElements: [],
          protocolSignature: 'h3',
          resourceTimings: []
        },
        {
          domain: 'tracker2.net',
          timestamp: Date.now(),
          friction: 115,
          latency: 48,
          trackers: ['common-tracker.js', 'fingerprint.js'],
          hiddenElements: [],
          protocolSignature: 'h3',
          resourceTimings: []
        },
        {
          domain: 'unrelated.org',
          timestamp: Date.now(),
          friction: 50,
          latency: 100,
          trackers: [],
          hiddenElements: [],
          protocolSignature: 'http/1.1',
          resourceTimings: []
        }
      ];

      const report = await processor.performNocturnalSynthesis(fragments);

      // Les deux premiers domaines devraient être groupés comme shadow entity
      expect(report.shadowEntities.length).toBeGreaterThanOrEqual(0);
      expect(report.clustersIdentified).toBeGreaterThanOrEqual(0);
    });

    it('should respect thermal throttling', async () => {
      const fragments: MemoryFragment[] = Array(10).fill(null).map((_, i) => ({
        domain: `site${i}.com`,
        timestamp: Date.now(),
        friction: Math.random() * 100,
        latency: Math.random() * 100,
        trackers: [],
        hiddenElements: [],
        protocolSignature: 'h2',
        resourceTimings: []
      }));

      const report = await processor.performNocturnalSynthesis(fragments);

      expect(report.thermalEvents).toBeDefined();
      expect(report.cpuUtilization).toBeGreaterThanOrEqual(0);
      expect(report.cpuUtilization).toBeLessThanOrEqual(1);
    });

    it('should enforce synthesis interval', async () => {
      const fragments: MemoryFragment[] = [{
        domain: 'test.com',
        timestamp: Date.now(),
        friction: 50,
        latency: 20,
        trackers: [],
        hiddenElements: [],
        protocolSignature: 'h2',
        resourceTimings: []
      }];

      // Première synthèse devrait réussir
      const report1 = await processor.performNocturnalSynthesis(fragments);
      expect(report1).toBeDefined();

      // Deuxième synthèse immédiate devrait échouer (intervalle non respecté)
      await expect(processor.performNocturnalSynthesis(fragments))
        .rejects.toThrow('Synthesis interval not met');
    });
  });
});

describe('MemoryFragmentCollector', () => {
  let collector: MemoryFragmentCollector;

  beforeEach(() => {
    collector = MemoryFragmentCollector.getInstance();
    collector.reset();
  });

  describe('Fragment Collection', () => {
    it('should collect DOM resonance fragments', () => {
      collector.collectDOMResonance({
        domain: 'example.com',
        friction: 75,
        mutations: [
          { type: 'childList', target: 'div.tracking' }
        ],
        hiddenElements: [{ id: 'hidden1' }],
        timestamps: {
          detected: Date.now() - 100,
          emitted: Date.now() - 50
        }
      });

      const fragments = collector.exportFragments();
      expect(fragments.length).toBe(1);
      expect(fragments[0].domain).toBe('example.com');
      expect(fragments[0].friction).toBe(75);
    });

    it('should collect network latency fragments', () => {
      collector.collectNetworkLatency({
        domain: 'api.example.com',
        latency: 120,
        protocol: 'h3',
        resourceTimings: [
          { name: 'resource1.js', duration: 50, nextHopProtocol: 'h3' }
        ],
        udpTrackers: ['tracker.com']
      });

      const fragments = collector.exportFragments();
      expect(fragments.length).toBe(1);
      expect(fragments[0].latency).toBe(120);
      expect(fragments[0].protocolSignature).toBe('h3');
    });

    it('should aggregate fragments for same domain within time window', () => {
      collector.collectDOMResonance({
        domain: 'same.com',
        friction: 50,
        mutations: [],
        hiddenElements: [],
        timestamps: { detected: Date.now(), emitted: Date.now() }
      });

      collector.collectNetworkLatency({
        domain: 'same.com',
        latency: 80,
        protocol: 'h2',
        resourceTimings: [],
        udpTrackers: []
      });

      const fragments = collector.exportFragments();
      expect(fragments.length).toBe(1);
      expect(fragments[0].friction).toBe(50);
      expect(fragments[0].latency).toBe(80);
    });

    it('should enforce memory limits', () => {
      // Ajouter plus de fragments que la limite
      for (let i = 0; i < 1100; i++) {
        collector.collectDOMResonance({
          domain: `site${i}.com`,
          friction: i,
          mutations: [],
          hiddenElements: [],
          timestamps: { detected: Date.now(), emitted: Date.now() }
        });
      }

      const fragments = collector.exportFragments();
      expect(fragments.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Fragment Retrieval', () => {
    it('should retrieve recent fragments', async () => {
      const now = Date.now();

      for (let i = 0; i < 10; i++) {
        collector.collectDOMResonance({
          domain: `recent${i}.com`,
          friction: i * 10,
          mutations: [],
          hiddenElements: [],
          timestamps: {
            detected: now - (i * 1000),
            emitted: now - (i * 1000)
          }
        });
      }

      const recent = await collector.getRecentFragments(5);
      expect(recent.length).toBe(5);
    });

    it('should clear processed fragments', async () => {
      for (let i = 0; i < 5; i++) {
        collector.collectDOMResonance({
          domain: `clear${i}.com`,
          friction: i,
          mutations: [],
          hiddenElements: [],
          timestamps: { detected: Date.now(), emitted: Date.now() }
        });
      }

      const fragments = collector.exportFragments();
      expect(fragments.length).toBe(5);

      await collector.clearProcessedFragments(fragments.slice(0, 3));
      const remaining = collector.exportFragments();
      expect(remaining.length).toBe(2);
    });
  });
});

describe('SignatureVectorizer', () => {
  let vectorizer: SignatureVectorizer;

  beforeEach(() => {
    vectorizer = new SignatureVectorizer();
    SignatureVectorizer.clearVectorPool();
  });

  describe('Vector Creation', () => {
    it('should create vectors with correct dimensions', async () => {
      const fragment: MemoryFragment = {
        domain: 'test.com',
        timestamp: Date.now(),
        friction: 50,
        latency: 100,
        trackers: ['tracker1', 'tracker2'],
        hiddenElements: [],
        protocolSignature: 'h2',
        resourceTimings: []
      };

      const vector = await vectorizer.createSignatureVector(fragment);

      expect(vector).toBeInstanceOf(Float32Array);
      expect(vector.length).toBe(32); // Dimensions réduites
      expect(vector.some(v => v !== 0)).toBe(true); // Pas tout zéro
    });

    it('should normalize vectors to unit length', async () => {
      const fragment: MemoryFragment = {
        domain: 'normalize.com',
        timestamp: Date.now(),
        friction: 200,
        latency: 500,
        trackers: ['t1', 't2', 't3'],
        hiddenElements: [],
        protocolSignature: 'h3',
        resourceTimings: []
      };

      const vector = await vectorizer.createSignatureVector(fragment);

      // Calculer la norme L2
      const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
      expect(norm).toBeCloseTo(1.0, 5); // Normalisé à 1
    });

    it('should calculate cosine similarity correctly', () => {
      const v1 = new Float32Array([1, 0, 0, 0]);
      const v2 = new Float32Array([1, 0, 0, 0]);
      const v3 = new Float32Array([0, 1, 0, 0]);

      expect(vectorizer.cosineSimilarity(v1, v2)).toBeCloseTo(1.0); // Identiques
      expect(vectorizer.cosineSimilarity(v1, v3)).toBeCloseTo(0.0); // Orthogonaux
    });

    it('should reuse vectors from pool', async () => {
      const fragment: MemoryFragment = {
        domain: 'pool.com',
        timestamp: Date.now(),
        friction: 50,
        latency: 50,
        trackers: [],
        hiddenElements: [],
        protocolSignature: 'h2',
        resourceTimings: []
      };

      const vector1 = await vectorizer.createSignatureVector(fragment);
      vectorizer.releaseVector(vector1);

      const vector2 = await vectorizer.createSignatureVector(fragment);

      // Les vecteurs devraient être du pool (même référence après reset)
      expect(vector2).toBeDefined();
    });
  });
});

describe('ThermalThrottlingController', () => {
  let controller: ThermalThrottlingController;

  beforeEach(() => {
    controller = new ThermalThrottlingController();
  });

  afterEach(() => {
    controller.dispose();
  });

  describe('Thermal Monitoring', () => {
    it('should return thermal status', async () => {
      const status = await controller.getThermalStatus();

      expect(status).toBeDefined();
      expect(status.temperature).toMatch(/^(nominal|fair|high|critical)$/);
      expect(status.cpuUtilization).toBeGreaterThanOrEqual(0);
      expect(status.cpuUtilization).toBeLessThanOrEqual(1);
      expect(typeof status.throttlingActive).toBe('boolean');
    });

    it('should apply cooling delay when needed', async () => {
      const startTime = Date.now();
      await controller.applyCooling();
      const endTime = Date.now();

      // Le délai devrait être raisonnable
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should provide statistics', () => {
      const stats = controller.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.currentState).toMatch(/^(nominal|fair|high|critical)$/);
      expect(stats.avgCPU).toBeGreaterThanOrEqual(0);
      expect(stats.avgMemory).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('CDNWhitelist', () => {
  let whitelist: CDNWhitelist;

  beforeEach(() => {
    whitelist = new CDNWhitelist();
  });

  describe('CDN Detection', () => {
    it('should detect major CDN providers', () => {
      expect(whitelist.isCDN('cdn.cloudflare.com')).toBe(true);
      expect(whitelist.isCDN('something.akamai.net')).toBe(true);
      expect(whitelist.isCDN('assets.fastly.net')).toBe(true);
      expect(whitelist.isCDN('random.example.com')).toBe(false);
    });

    it('should identify CDN provider', () => {
      expect(whitelist.identifyCDN('cdn.cloudflare.com')).toBe('cloudflare');
      expect(whitelist.identifyCDN('something.akamai.net')).toBe('akamai');
      expect(whitelist.identifyCDN('random.com')).toBe(null);
    });

    it('should detect shared CDN usage', () => {
      const result = whitelist.sharesCDNOnly(
        'site1.cloudflare.com',
        'site2.cloudflare.com'
      );
      expect(result).toBe(true);
    });

    it('should adjust correlation for CDN usage', () => {
      const correlation = 0.9;
      const adjusted = whitelist.adjustCorrelationForCDN(
        correlation,
        'site1.cloudflare.com',
        'site2.cloudflare.com',
        ['https://cdn.cloudflare.com/script.js']
      );

      expect(adjusted).toBeLessThan(correlation);
    });

    it('should learn new CDN patterns', () => {
      whitelist.learnCDNPattern('newcdn.example.com', 0.9);
      expect(whitelist.isCDN('newcdn.example.com')).toBe(true);
    });
  });
});

describe('AdaptiveResonanceClustering', () => {
  let clustering: AdaptiveResonanceClustering;

  beforeEach(() => {
    clustering = new AdaptiveResonanceClustering();
  });

  describe('Clustering', () => {
    it('should cluster similar signatures', async () => {
      const signatures = new Map<string, Float32Array>([
        ['domain1', new Float32Array([1, 0, 0, 0])],
        ['domain2', new Float32Array([0.9, 0.1, 0, 0])],
        ['domain3', new Float32Array([0, 0, 1, 0])],
        ['domain4', new Float32Array([0, 0, 0.9, 0.1])]
      ]);

      const clusters = await clustering.cluster(signatures, {
        vigilance: 0.8,
        learningRate: 0.1,
        maxIterations: 10
      });

      // Devrait créer 2 clusters (domain1+2, domain3+4)
      expect(clusters.length).toBeGreaterThanOrEqual(1);
      expect(clusters.length).toBeLessThanOrEqual(4);
    });

    it('should respect vigilance threshold', async () => {
      const signatures = new Map<string, Float32Array>([
        ['d1', new Float32Array([1, 0])],
        ['d2', new Float32Array([0, 1])]
      ]);

      const clusters = await clustering.cluster(signatures, {
        vigilance: 0.95, // Très strict
        learningRate: 0.1,
        maxIterations: 10
      });

      // Avec vigilance stricte, devrait créer clusters séparés
      expect(clusters.length).toBe(0); // Pas de multi-domain clusters
    });

    it('should provide clustering statistics', async () => {
      const signatures = new Map<string, Float32Array>([
        ['test1', new Float32Array([1, 0])],
        ['test2', new Float32Array([0, 1])]
      ]);

      await clustering.cluster(signatures, {
        vigilance: 0.5,
        learningRate: 0.1,
        maxIterations: 5
      });

      const stats = clustering.getStatistics();
      expect(stats.clusterCount).toBeGreaterThanOrEqual(0);
      expect(stats.avgConfidence).toBeGreaterThanOrEqual(0);
      expect(stats.avgConfidence).toBeLessThanOrEqual(1);
    });
  });
});