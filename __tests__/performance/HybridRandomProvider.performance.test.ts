/**
 * Tests de performance pour HybridRandomProvider
 * Validation des gains de performance vs SecureRandom original
 */

import { 
  HybridRandomProvider, 
  UsageContext, 
  XorShift128Plus,
  RandomPool 
} from '../../src/shared/utils/HybridRandomProvider';
import { PerformanceOptimizedRandom } from '../../src/shared/utils/PerformanceOptimizedRandom';

// Mock crypto pour tests consistants
const mockCrypto = {
  getRandomValues: jest.fn((array: Uint32Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 0x100000000);
    }
    return array;
  })
};

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true
});

describe('HybridRandomProvider Performance Tests', () => {
  let provider: HybridRandomProvider;

  beforeEach(() => {
    provider = HybridRandomProvider.getInstance();
    jest.clearAllMocks();
  });

  describe('Performance Benchmarks', () => {
    test('should be significantly faster than original SecureRandom', async () => {
      const iterations = 10000;

      // Benchmark SecureRandom original (simulation)
      const startSecure = performance.now();
      for (let i = 0; i < iterations; i++) {
        const array = new Uint32Array(1);
        mockCrypto.getRandomValues(array);
        array[0] / 0x100000000;
      }
      const secureTime = performance.now() - startSecure;

      // Benchmark HybridRandomProvider neural context (performance critique)
      const startHybrid = performance.now();
      for (let i = 0; i < iterations; i++) {
        provider.random(UsageContext.NEURAL_NETWORK);
      }
      const hybridTime = performance.now() - startHybrid;

      const speedup = secureTime / hybridTime;
      
      console.log(`SecureRandom original: ${secureTime.toFixed(2)}ms`);
      console.log(`HybridRandomProvider: ${hybridTime.toFixed(2)}ms`);
      console.log(`Speedup: ${speedup.toFixed(1)}x`);

      // Doit être au minimum 50x plus rapide
      expect(speedup).toBeGreaterThan(50);
      expect(hybridTime).toBeLessThan(secureTime / 50);
    }, 30000);

    test('should show different performance profiles by context', async () => {
      const iterations = 5000;
      const contexts = [
        UsageContext.CRYPTOGRAPHIC_OPS,
        UsageContext.NEURAL_NETWORK,
        UsageContext.WEBGL_RENDERING,
        UsageContext.GENETIC_MUTATIONS
      ];

      const results = new Map<UsageContext, number>();

      for (const context of contexts) {
        const start = performance.now();
        
        for (let i = 0; i < iterations; i++) {
          provider.random(context);
        }
        
        const time = performance.now() - start;
        results.set(context, time);
      }

      // Performance ordering expected: WEBGL/NEURAL < GENETIC < CRYPTO
      const webglTime = results.get(UsageContext.WEBGL_RENDERING)!;
      const neuralTime = results.get(UsageContext.NEURAL_NETWORK)!;
      const geneticTime = results.get(UsageContext.GENETIC_MUTATIONS)!;
      const cryptoTime = results.get(UsageContext.CRYPTOGRAPHIC_OPS)!;

      console.log('Performance by context:');
      console.log(`WebGL: ${webglTime.toFixed(2)}ms`);
      console.log(`Neural: ${neuralTime.toFixed(2)}ms`);
      console.log(`Genetic: ${geneticTime.toFixed(2)}ms`);
      console.log(`Crypto: ${cryptoTime.toFixed(2)}ms`);

      // WebGL/Neural doivent être plus rapides que Crypto
      expect(webglTime).toBeLessThan(cryptoTime);
      expect(neuralTime).toBeLessThan(cryptoTime);
      
      // Genetic entre performance et sécurité
      expect(geneticTime).toBeGreaterThan(Math.min(webglTime, neuralTime));
      expect(geneticTime).toBeLessThan(cryptoTime);
    });

    test('should handle batch generation efficiently', async () => {
      const batchSize = 10000;

      // Test batch vs sequential
      const startSequential = performance.now();
      const sequential = [];
      for (let i = 0; i < batchSize; i++) {
        sequential.push(provider.random(UsageContext.NEURAL_NETWORK));
      }
      const sequentialTime = performance.now() - startSequential;

      const startBatch = performance.now();
      const batch = await provider.generateBatch(batchSize, UsageContext.NEURAL_NETWORK);
      const batchTime = performance.now() - startBatch;

      const batchSpeedup = sequentialTime / batchTime;

      console.log(`Sequential ${batchSize}: ${sequentialTime.toFixed(2)}ms`);
      console.log(`Batch ${batchSize}: ${batchTime.toFixed(2)}ms`);
      console.log(`Batch speedup: ${batchSpeedup.toFixed(1)}x`);

      expect(batch.length).toBe(batchSize);
      expect(batchTime).toBeLessThan(sequentialTime);
      expect(batchSpeedup).toBeGreaterThan(1.5); // Au moins 50% plus rapide
    });
  });

  describe('XorShift128Plus Performance', () => {
    test('should be extremely fast for performance-critical paths', () => {
      const prng = new XorShift128Plus();
      const iterations = 100000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        prng.random();
      }
      const time = performance.now() - start;

      console.log(`XorShift128Plus ${iterations} iterations: ${time.toFixed(2)}ms`);
      console.log(`Rate: ${(iterations / time * 1000).toFixed(0)} ops/second`);

      // Doit être capable de >1M ops/second
      const opsPerSecond = iterations / time * 1000;
      expect(opsPerSecond).toBeGreaterThan(1000000);
    });

    test('should maintain randomness quality', () => {
      const prng = new XorShift128Plus();
      const samples = 10000;
      const numbers = [];

      for (let i = 0; i < samples; i++) {
        numbers.push(prng.random());
      }

      // Test distribution uniformity (Chi-square approximation)
      const buckets = 10;
      const expectedPerBucket = samples / buckets;
      const counts = new Array(buckets).fill(0);

      for (const num of numbers) {
        const bucket = Math.floor(num * buckets);
        counts[Math.min(bucket, buckets - 1)]++;
      }

      // Chi-square test approximatif
      let chiSquare = 0;
      for (let i = 0; i < buckets; i++) {
        const diff = counts[i] - expectedPerBucket;
        chiSquare += (diff * diff) / expectedPerBucket;
      }

      // For 9 degrees of freedom, critical value at 0.05 is ~16.92
      expect(chiSquare).toBeLessThan(20); // Slightly relaxed for PRNG
      
      // Vérifier que tous les nombres sont dans [0,1)
      expect(Math.min(...numbers)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...numbers)).toBeLessThan(1);
    });
  });

  describe('RandomPool Performance', () => {
    test('should provide fast access to pre-generated secure numbers', async () => {
      const pool = new RandomPool(5000, 1000);
      await pool.initialize();

      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        const value = pool.getNext();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }

      const time = performance.now() - start;
      console.log(`RandomPool ${iterations} accesses: ${time.toFixed(2)}ms`);

      // Pool access doit être très rapide
      expect(time).toBeLessThan(10); // <10ms pour 1000 accès
    });

    test('should handle pool refill gracefully', async () => {
      const pool = new RandomPool(100, 80); // Petit pool, refill rapide
      await pool.initialize();

      // Consume most of pool
      for (let i = 0; i < 85; i++) {
        pool.getNext();
      }

      // Should trigger refill but still provide values
      const value = pool.getNext();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);

      const stats = pool.getStats();
      expect(stats.totalConsumed).toBe(86);
    });
  });

  describe('PerformanceOptimizedRandom Integration', () => {
    test('should show massive improvement over original SecureRandom', async () => {
      const benchmark = await PerformanceOptimizedRandom.benchmarkVsSecureRandom(5000);

      console.log('Benchmark Results:');
      console.log(`Original SecureRandom: ${benchmark.secureRandomMs}ms`);
      console.log(`PerformanceOptimized: ${benchmark.optimizedMs}ms`);
      console.log(`Speedup: ${benchmark.speedupRatio}x`);
      console.log(`Recommendation: ${benchmark.recommendation}`);

      expect(benchmark.speedupRatio).toBeGreaterThan(50);
      expect(benchmark.optimizedMs).toBeLessThan(benchmark.secureRandomMs / 50);
      expect(benchmark.recommendation).toContain('Migration recommandée');
    });

    test('should handle warmup correctly', async () => {
      const start = performance.now();
      await PerformanceOptimizedRandom.warmup();
      const warmupTime = performance.now() - start;

      console.log(`Warmup completed in: ${warmupTime.toFixed(2)}ms`);

      // Warmup ne doit pas être trop long
      expect(warmupTime).toBeLessThan(1000); // <1 seconde

      // Après warmup, performance doit être optimale
      const testStart = performance.now();
      for (let i = 0; i < 1000; i++) {
        PerformanceOptimizedRandom.neuralRandom();
      }
      const testTime = performance.now() - testStart;

      expect(testTime).toBeLessThan(10); // <10ms pour 1000 calls après warmup
    });

    test('should provide detailed performance metrics', () => {
      // Générer quelques appels
      for (let i = 0; i < 100; i++) {
        PerformanceOptimizedRandom.neuralRandom();
        PerformanceOptimizedRandom.renderingRandom();
        PerformanceOptimizedRandom.cryptoRandom();
      }

      const metrics = PerformanceOptimizedRandom.getPerformanceMetrics();

      console.log('Performance Metrics:');
      console.log(`Total calls: ${metrics.totalCalls}`);
      console.log(`Distribution: ${JSON.stringify(metrics.distribution, null, 2)}`);
      console.log(`Avg latency: ${metrics.avgLatencyMs.toFixed(3)}ms`);

      expect(metrics.totalCalls).toBeGreaterThan(0);
      expect(metrics.fastCalls).toBeGreaterThan(0);
      expect(metrics.avgLatencyMs).toBeLessThan(1); // Latence moyenne <1ms
    });
  });

  describe('FPS Target Validation', () => {
    test('should achieve target 30+ FPS in WebGL rendering scenario', async () => {
      // Simulate WebGL rendering loop with random operations
      const targetFPS = 30;
      const frameTargetMs = 1000 / targetFPS; // 33.33ms per frame
      const randomCallsPerFrame = 100; // Typical for particle system

      const frames = 60; // Test 60 frames
      let totalFrameTime = 0;

      for (let frame = 0; frame < frames; frame++) {
        const frameStart = performance.now();

        // Simulate frame with many random calls
        for (let i = 0; i < randomCallsPerFrame; i++) {
          PerformanceOptimizedRandom.renderingRandom();
        }

        const frameTime = performance.now() - frameStart;
        totalFrameTime += frameTime;
      }

      const avgFrameTime = totalFrameTime / frames;
      const achievedFPS = 1000 / avgFrameTime;

      console.log(`Average frame time: ${avgFrameTime.toFixed(2)}ms`);
      console.log(`Achieved FPS: ${achievedFPS.toFixed(1)}`);
      console.log(`Target FPS: ${targetFPS}`);

      expect(avgFrameTime).toBeLessThan(frameTargetMs);
      expect(achievedFPS).toBeGreaterThanOrEqual(targetFPS);
    });

    test('should handle neural network mutations without performance degradation', async () => {
      // Simulate intensive neural network mutations
      const mutationsPerSecond = 1000;
      const randomCallsPerMutation = 10;
      const testDurationMs = 1000;

      const expectedCalls = mutationsPerSecond * randomCallsPerMutation;

      const start = performance.now();
      for (let i = 0; i < expectedCalls; i++) {
        PerformanceOptimizedRandom.neuralRandom();
      }
      const actualTime = performance.now() - start;

      const actualCallsPerSecond = expectedCalls / (actualTime / 1000);

      console.log(`Expected: ${expectedCalls} calls in ~1000ms`);
      console.log(`Actual: ${expectedCalls} calls in ${actualTime.toFixed(2)}ms`);
      console.log(`Rate: ${actualCallsPerSecond.toFixed(0)} calls/second`);

      expect(actualTime).toBeLessThan(testDurationMs); // Doit finir en moins d'1 seconde
      expect(actualCallsPerSecond).toBeGreaterThan(expectedCalls); // Doit dépasser le target
    });
  });

  describe('Memory Usage', () => {
    test('should have reasonable memory footprint', () => {
      const initialMemory = process.memoryUsage();
      
      // Generate many random numbers
      const numbers = [];
      for (let i = 0; i < 10000; i++) {
        numbers.push(PerformanceOptimizedRandom.random());
      }

      const afterGeneration = process.memoryUsage();
      const memoryIncrease = afterGeneration.heapUsed - initialMemory.heapUsed;

      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // <50MB
      expect(numbers.length).toBe(10000);
    });
  });
});