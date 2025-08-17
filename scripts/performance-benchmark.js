#!/usr/bin/env node

/**
 * Benchmark de performance - SecureRandom vs Math.random()
 * Mesure CPU, mémoire et FPS pour valider l'absence de régression
 */

const { performance } = require('perf_hooks');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Mock WebCrypto pour Node.js
if (typeof global.crypto === 'undefined') {
  global.crypto = {
    getRandomValues: (arr) => {
      const buffer = crypto.randomBytes(arr.length);
      for (let i = 0; i < arr.length; i++) {
        arr[i] = buffer[i];
      }
      return arr;
    }
  };
}

// Implémentation SecureRandom simplifiée pour test
class SecureRandom {
  static random() {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] / (0xffffffff + 1);
  }

  static randomInt(min, max) {
    const range = max - min;
    const randomValue = this.random();
    return Math.floor(randomValue * range) + min;
  }
}

// Benchmarks
const ITERATIONS = {
  light: 10000,
  medium: 100000,
  heavy: 1000000
};

function measureMemory() {
  const usage = process.memoryUsage();
  return {
    rss: usage.rss / 1024 / 1024, // MB
    heapUsed: usage.heapUsed / 1024 / 1024, // MB
    heapTotal: usage.heapTotal / 1024 / 1024, // MB
    external: usage.external / 1024 / 1024 // MB
  };
}

function benchmarkMathRandom(iterations) {
  const startMemory = measureMemory();
  const startTime = performance.now();
  
  let sum = 0;
  for (let i = 0; i < iterations; i++) {
    sum += Math.random();
  }
  
  const endTime = performance.now();
  const endMemory = measureMemory();
  
  return {
    name: 'Math.random()',
    iterations,
    duration: endTime - startTime,
    throughput: iterations / ((endTime - startTime) / 1000),
    memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
    finalMemory: endMemory,
    checksum: sum // Pour éviter l'optimisation du compilateur
  };
}

function benchmarkSecureRandom(iterations) {
  const startMemory = measureMemory();
  const startTime = performance.now();
  
  let sum = 0;
  for (let i = 0; i < iterations; i++) {
    sum += SecureRandom.random();
  }
  
  const endTime = performance.now();
  const endMemory = measureMemory();
  
  return {
    name: 'SecureRandom.random()',
    iterations,
    duration: endTime - startTime,
    throughput: iterations / ((endTime - startTime) / 1000),
    memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
    finalMemory: endMemory,
    checksum: sum
  };
}

function simulateFPSBenchmark(frameCount = 1000) {
  console.log(`\\n=== Simulation FPS (${frameCount} frames) ===`);
  
  // Simulation WebGL avec Math.random
  const startTime = performance.now();
  for (let frame = 0; frame < frameCount; frame++) {
    // Simulation de calculs par frame
    for (let i = 0; i < 100; i++) {
      Math.random() * 255; // Couleurs aléatoires
      Math.random() * 360; // Rotations
      Math.random() * 2 - 1; // Positions normalisées
    }
  }
  const mathRandomTime = performance.now() - startTime;
  
  // Simulation WebGL avec SecureRandom
  const startTime2 = performance.now();
  for (let frame = 0; frame < frameCount; frame++) {
    for (let i = 0; i < 100; i++) {
      SecureRandom.random() * 255;
      SecureRandom.random() * 360;
      SecureRandom.random() * 2 - 1;
    }
  }
  const secureRandomTime = performance.now() - startTime2;
  
  const mathFPS = frameCount / (mathRandomTime / 1000);
  const secureFPS = frameCount / (secureRandomTime / 1000);
  const fpsRatio = secureFPS / mathFPS;
  
  return {
    mathRandom: { fps: mathFPS, time: mathRandomTime },
    secureRandom: { fps: secureFPS, time: secureRandomTime },
    performanceRatio: fpsRatio,
    acceptable: fpsRatio > 0.9 // 90% des performances minimum
  };
}

async function runBenchmarks() {
  console.log('🔬 Benchmark Performance SYMBIONT - SecureRandom vs Math.random()\\n');
  console.log('================================================================\\n');
  
  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpus: require('os').cpus().length
    },
    benchmarks: {},
    fps: null,
    summary: {}
  };
  
  // Tests de charge progressive
  for (const [load, iterations] of Object.entries(ITERATIONS)) {
    console.log(`\\n=== Test ${load.toUpperCase()} (${iterations.toLocaleString()} itérations) ===`);
    
    // Force garbage collection si disponible
    if (global.gc) global.gc();
    
    const mathResult = benchmarkMathRandom(iterations);
    
    // Pause entre les tests
    await new Promise(resolve => setTimeout(resolve, 100));
    if (global.gc) global.gc();
    
    const secureResult = benchmarkSecureRandom(iterations);
    
    console.log(`Math.random():     ${mathResult.duration.toFixed(2)}ms (${(mathResult.throughput / 1000).toFixed(0)}k op/s)`);
    console.log(`SecureRandom():    ${secureResult.duration.toFixed(2)}ms (${(secureResult.throughput / 1000).toFixed(0)}k op/s)`);
    
    const ratio = secureResult.duration / mathResult.duration;
    const status = ratio < 2.0 ? '✅' : ratio < 5.0 ? '⚠️' : '❌';
    console.log(`Ratio performance: ${ratio.toFixed(2)}x ${status}`);
    console.log(`Mémoire delta:     Math(${mathResult.memoryDelta.toFixed(2)}MB) vs Secure(${secureResult.memoryDelta.toFixed(2)}MB)`);
    
    results.benchmarks[load] = {
      mathRandom: mathResult,
      secureRandom: secureResult,
      performanceRatio: ratio,
      acceptable: ratio < 3.0 // 3x maximum acceptable
    };
  }
  
  // Test FPS
  results.fps = simulateFPSBenchmark();
  console.log(`Math.random FPS:   ${results.fps.mathRandom.fps.toFixed(1)} fps`);
  console.log(`SecureRandom FPS:  ${results.fps.secureRandom.fps.toFixed(1)} fps`);
  console.log(`Ratio FPS:         ${results.fps.performanceRatio.toFixed(3)}x ${results.fps.acceptable ? '✅' : '❌'}`);
  
  // Résumé global
  const allAcceptable = Object.values(results.benchmarks).every(b => b.acceptable) && results.fps.acceptable;
  results.summary = {
    overallAcceptable: allAcceptable,
    maxPerformanceRatio: Math.max(...Object.values(results.benchmarks).map(b => b.performanceRatio)),
    fpsPerformanceRatio: results.fps.performanceRatio,
    recommendation: allAcceptable ? 
      "✅ Migration SecureRandom validée - Aucune régression significative" :
      "⚠️ Régression détectée - Optimisation recommandée"
  };
  
  console.log(`\\n=== RÉSUMÉ GLOBAL ===`);
  console.log(`Performance ratio max: ${results.summary.maxPerformanceRatio.toFixed(2)}x`);
  console.log(`Performance FPS:       ${results.summary.fpsPerformanceRatio.toFixed(3)}x`);
  console.log(`Verdict:               ${results.summary.recommendation}`);
  
  // Sauvegarde du rapport
  const reportPath = path.join(__dirname, '..', 'performance-benchmark-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\\n📊 Rapport sauvegardé: ${reportPath}`);
  
  return results;
}

// Execution
if (require.main === module) {
  runBenchmarks().catch(console.error);
}

module.exports = { runBenchmarks, SecureRandom };