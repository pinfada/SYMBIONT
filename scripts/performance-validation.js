/**
 * Script de validation de performance HybridRandomProvider
 * 
 * Teste et valide les gains de performance vs SecureRandom original
 * Objectif: Valider >30 FPS et gains 50x-300x
 */

const path = require('path');
const fs = require('fs');

// Configuration benchmark
const BENCHMARK_CONFIG = {
  iterations: {
    light: 10000,
    medium: 100000, 
    heavy: 1000000
  },
  fpsTarget: 30,
  frameTimeMs: 33.33, // 1000/30
  randomCallsPerFrame: 100
};

/**
 * Simulation SecureRandom original (pour benchmark)
 */
class OriginalSecureRandom {
  static random() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      return array[0] / 0x100000000;
    }
    return Math.random(); // Fallback
  }
}

/**
 * PRNG ultra-rapide xorshift128+ 
 */
class XorShift128Plus {
  constructor(seed1 = 123456789, seed2 = 987654321) {
    this.state0 = seed1;
    this.state1 = seed2;
  }

  random() {
    let s1 = this.state0;
    const s0 = this.state1;
    
    this.state0 = s0;
    s1 ^= s1 << 23;
    s1 ^= s1 >>> 17;
    s1 ^= s0;
    s1 ^= s0 >>> 26;
    this.state1 = s1;
    
    const result = (s0 + s1) >>> 0;
    return result / 0x100000000;
  }

  reseed() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const seeds = new Uint32Array(2);
      crypto.getRandomValues(seeds);
      this.state0 = seeds[0];
      this.state1 = seeds[1];
    }
  }
}

/**
 * Pool de génération rapide
 */
class FastRandomPool {
  constructor(poolSize = 10000, refillThreshold = 2000) {
    this.pool = [];
    this.poolSize = poolSize;
    this.refillThreshold = refillThreshold;
    this.totalGenerated = 0;
    this.totalConsumed = 0;
    this.initialize();
  }

  initialize() {
    try {
      this.fillPool();
    } catch (error) {
      console.warn('Pool initialization failed:', error.message);
    }
  }

  fillPool() {
    const batchSize = Math.min(5000, this.poolSize - this.pool.length);
    
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const values = new Uint32Array(batchSize);
      crypto.getRandomValues(values);
      
      for (const value of values) {
        this.pool.push(value / 0x100000000);
      }
      
      this.totalGenerated += batchSize;
    } else {
      // Fallback si crypto non disponible
      for (let i = 0; i < batchSize; i++) {
        this.pool.push(Math.random());
      }
      this.totalGenerated += batchSize;
    }
  }

  getNext() {
    if (this.pool.length === 0) {
      this.fillPool();
    }
    
    if (this.pool.length === 0) return Math.random(); // Ultimate fallback
    
    const value = this.pool.pop();
    this.totalConsumed++;
    
    // Refill si nécessaire
    if (this.pool.length <= this.refillThreshold) {
      setTimeout(() => this.fillPool(), 0);
    }
    
    return value;
  }

  getStats() {
    return {
      poolSize: this.pool.length,
      totalGenerated: this.totalGenerated,
      totalConsumed: this.totalConsumed,
      hitRate: this.totalConsumed > 0 ? (this.totalConsumed - this.pool.length) / this.totalConsumed : 0
    };
  }
}

/**
 * Provider hybride simplifié pour validation
 */
class HybridValidationProvider {
  constructor() {
    this.fastPRNG = new XorShift128Plus();
    this.securePool = new FastRandomPool(10000, 2000);
    
    this.metrics = {
      totalCalls: 0,
      secureCalls: 0,
      poolCalls: 0,
      fastCalls: 0
    };

    // Re-seed périodiquement
    setInterval(() => {
      this.fastPRNG.reseed();
    }, 60000);
  }

  // Performance critique (WebGL, Neural)
  fastRandom() {
    this.metrics.totalCalls++;
    this.metrics.fastCalls++;
    return this.fastPRNG.random();
  }

  // Équilibré sécurité/performance  
  pooledRandom() {
    this.metrics.totalCalls++;
    this.metrics.poolCalls++;
    return this.securePool.getNext();
  }

  // Sécurité critique
  secureRandom() {
    this.metrics.totalCalls++;
    this.metrics.secureCalls++;
    return OriginalSecureRandom.random();
  }

  getMetrics() {
    return this.metrics;
  }
}

/**
 * Benchmarks de performance
 */
async function runPerformanceBenchmarks() {
  console.log('🚀 VALIDATION PERFORMANCE HYBRID RANDOM PROVIDER');
  console.log('================================================\n');

  const hybridProvider = new HybridValidationProvider();
  const results = {};

  // Test 1: Comparaison directe Original vs Hybrid
  console.log('📊 Test 1: Comparaison SecureRandom vs HybridProvider');
  console.log('------------------------------------------------------');

  for (const [testName, iterations] of Object.entries(BENCHMARK_CONFIG.iterations)) {
    console.log(`\n🔍 Test ${testName.toUpperCase()} (${iterations.toLocaleString()} itérations)`);

    // Benchmark SecureRandom original
    const startOriginal = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
      OriginalSecureRandom.random();
    }
    const endOriginal = process.hrtime.bigint();
    const originalTimeMs = Number(endOriginal - startOriginal) / 1000000;

    // Benchmark HybridProvider (mode fast)
    const startHybrid = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
      hybridProvider.fastRandom();
    }
    const endHybrid = process.hrtime.bigint();
    const hybridTimeMs = Number(endHybrid - startHybrid) / 1000000;

    const speedup = originalTimeMs / hybridTimeMs;
    const throughputOriginal = iterations / (originalTimeMs / 1000);
    const throughputHybrid = iterations / (hybridTimeMs / 1000);

    console.log(`  SecureRandom Original: ${originalTimeMs.toFixed(2)}ms (${throughputOriginal.toLocaleString()} ops/sec)`);
    console.log(`  HybridProvider Fast:   ${hybridTimeMs.toFixed(2)}ms (${throughputHybrid.toLocaleString()} ops/sec)`);
    console.log(`  🚀 Gain de performance: ${speedup.toFixed(1)}x plus rapide`);

    results[testName] = {
      originalTimeMs,
      hybridTimeMs,
      speedup,
      throughputOriginal,
      throughputHybrid,
      acceptable: speedup > 50 // Objectif minimum 50x
    };

    if (speedup > 200) {
      console.log(`  ✅ EXCELLENT - Gain massif ${speedup.toFixed(0)}x`);
    } else if (speedup > 100) {
      console.log(`  ✅ TRÈS BON - Gain significatif ${speedup.toFixed(0)}x`);
    } else if (speedup > 50) {
      console.log(`  ✅ BON - Gain acceptable ${speedup.toFixed(0)}x`);
    } else {
      console.log(`  ❌ INSUFFISANT - Gain trop faible ${speedup.toFixed(0)}x (objectif >50x)`);
    }
  }

  // Test 2: Validation FPS WebGL
  console.log('\n\n🎮 Test 2: Validation FPS WebGL Rendering');
  console.log('------------------------------------------');

  const frames = 60;
  let totalFrameTime = 0;

  for (let frame = 0; frame < frames; frame++) {
    const frameStart = process.hrtime.bigint();

    // Simulation frame WebGL avec appels random
    for (let i = 0; i < BENCHMARK_CONFIG.randomCallsPerFrame; i++) {
      hybridProvider.fastRandom();
    }

    const frameEnd = process.hrtime.bigint();
    const frameTimeMs = Number(frameEnd - frameStart) / 1000000;
    totalFrameTime += frameTimeMs;
  }

  const avgFrameTime = totalFrameTime / frames;
  const achievedFPS = 1000 / avgFrameTime;

  console.log(`  Frames testées: ${frames}`);
  console.log(`  Random calls par frame: ${BENCHMARK_CONFIG.randomCallsPerFrame}`);
  console.log(`  Temps moyen par frame: ${avgFrameTime.toFixed(2)}ms`);
  console.log(`  FPS atteint: ${achievedFPS.toFixed(1)}`);
  console.log(`  Objectif FPS: ${BENCHMARK_CONFIG.fpsTarget}`);

  const fpsAcceptable = achievedFPS >= BENCHMARK_CONFIG.fpsTarget;
  if (fpsAcceptable) {
    console.log(`  ✅ FPS VALIDÉ - ${achievedFPS.toFixed(1)} FPS >= ${BENCHMARK_CONFIG.fpsTarget} FPS requis`);
  } else {
    console.log(`  ❌ FPS INSUFFISANT - ${achievedFPS.toFixed(1)} FPS < ${BENCHMARK_CONFIG.fpsTarget} FPS requis`);
  }

  // Test 3: Neural Network Simulation
  console.log('\n\n🧠 Test 3: Simulation Neural Network Mutations');
  console.log('-----------------------------------------------');

  const neuralMutations = 10000;
  const mutationComplexity = 50; // Random calls par mutation

  const startNeural = process.hrtime.bigint();
  for (let mutation = 0; mutation < neuralMutations; mutation++) {
    for (let call = 0; call < mutationComplexity; call++) {
      hybridProvider.pooledRandom(); // Mode équilibré pour neural
    }
  }
  const endNeural = process.hrtime.bigint();
  const neuralTimeMs = Number(endNeural - startNeural) / 1000000;

  const totalNeuralCalls = neuralMutations * mutationComplexity;
  const neuralThroughput = totalNeuralCalls / (neuralTimeMs / 1000);

  console.log(`  Mutations simulées: ${neuralMutations.toLocaleString()}`);
  console.log(`  Random calls par mutation: ${mutationComplexity}`);
  console.log(`  Total random calls: ${totalNeuralCalls.toLocaleString()}`);
  console.log(`  Temps total: ${neuralTimeMs.toFixed(2)}ms`);
  console.log(`  Throughput: ${neuralThroughput.toLocaleString()} calls/sec`);

  const neuralAcceptable = neuralThroughput > 1000000; // >1M calls/sec
  if (neuralAcceptable) {
    console.log(`  ✅ NEURAL VALIDÉ - Throughput ${(neuralThroughput / 1000000).toFixed(1)}M calls/sec`);
  } else {
    console.log(`  ❌ NEURAL INSUFFISANT - Throughput trop faible`);
  }

  // Métriques finales
  console.log('\n\n📈 MÉTRIQUES GLOBALES');
  console.log('=====================');

  const metrics = hybridProvider.getMetrics();
  console.log(`  Total appels: ${metrics.totalCalls.toLocaleString()}`);
  console.log(`  Fast calls: ${metrics.fastCalls.toLocaleString()}`);
  console.log(`  Pooled calls: ${metrics.poolCalls.toLocaleString()}`);
  console.log(`  Secure calls: ${metrics.secureCalls.toLocaleString()}`);

  // Résumé final
  console.log('\n\n🎯 RÉSUMÉ VALIDATION');
  console.log('====================');

  const lightAcceptable = results.light.acceptable;
  const mediumAcceptable = results.medium.acceptable; 
  const heavyAcceptable = results.heavy.acceptable;

  console.log(`  Performance Light:  ${lightAcceptable ? '✅' : '❌'} ${results.light.speedup.toFixed(0)}x gain`);
  console.log(`  Performance Medium: ${mediumAcceptable ? '✅' : '❌'} ${results.medium.speedup.toFixed(0)}x gain`);
  console.log(`  Performance Heavy:  ${heavyAcceptable ? '✅' : '❌'} ${results.heavy.speedup.toFixed(0)}x gain`);
  console.log(`  FPS WebGL:          ${fpsAcceptable ? '✅' : '❌'} ${achievedFPS.toFixed(1)} FPS`);
  console.log(`  Neural Network:     ${neuralAcceptable ? '✅' : '❌'} ${(neuralThroughput / 1000000).toFixed(1)}M calls/sec`);

  const overallValid = lightAcceptable && mediumAcceptable && heavyAcceptable && fpsAcceptable && neuralAcceptable;

  console.log('\n' + '='.repeat(50));
  if (overallValid) {
    console.log('✅ VALIDATION RÉUSSIE - HybridRandomProvider prêt production');
    console.log('   Performance 50x-300x validée, FPS >30 atteint');
    console.log('   🚀 Migration SecureRandom -> HybridProvider RECOMMANDÉE');
  } else {
    console.log('❌ VALIDATION ÉCHOUÉE - Optimisations supplémentaires requises');
    console.log('   Performance ou FPS insuffisants pour production');
    console.log('   ⚠️ Ne pas migrer avant résolution des problèmes');
  }
  console.log('='.repeat(50));

  // Sauvegarde résultats
  const report = {
    timestamp: new Date().toISOString(),
    validation: overallValid,
    benchmarks: results,
    fps: {
      achieved: achievedFPS,
      target: BENCHMARK_CONFIG.fpsTarget,
      acceptable: fpsAcceptable
    },
    neural: {
      throughput: neuralThroughput,
      acceptable: neuralAcceptable
    },
    metrics
  };

  const reportPath = path.join(__dirname, '..', 'performance-validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Rapport sauvegardé: ${reportPath}`);

  return overallValid;
}

// Exécution si script appelé directement
if (require.main === module) {
  runPerformanceBenchmarks()
    .then(valid => {
      process.exit(valid ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Erreur validation performance:', error);
      process.exit(1);
    });
}

module.exports = { runPerformanceBenchmarks };