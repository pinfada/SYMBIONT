#!/usr/bin/env node

/**
 * Script de validation rapide des tests avant production
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Validation des tests SYMBIONT');
console.log('================================');

const tests = [
  {
    name: 'Tests unitaires (core)',
    command: 'npm test -- --testPathPattern="__tests__/(core|shared/utils)" --testTimeout=10000',
    critical: true
  },
  {
    name: 'Tests de sécurité',
    command: 'npm test -- --testPathPattern="__tests__/security" --testTimeout=10000',
    critical: true
  },
  {
    name: 'Tests de performance',
    command: 'npm test -- --testPathPattern="__tests__/performance" --testTimeout=10000',
    critical: false
  },
  {
    name: 'Build production',
    command: 'npm run build',
    critical: true
  },
  {
    name: 'Lint',
    command: 'npm run lint',
    critical: true
  }
];

let passed = 0;
let failed = 0;
let criticalFailed = 0;

for (const test of tests) {
  console.log(`\\n📋 ${test.name}...`);
  
  try {
    const start = Date.now();
    execSync(test.command, { 
      stdio: ['inherit', 'pipe', 'pipe'],
      timeout: 60000 // 1 minute max par test
    });
    const duration = Date.now() - start;
    console.log(`✅ ${test.name} - ${duration}ms`);
    passed++;
  } catch (error) {
    console.log(`❌ ${test.name} - ÉCHEC`);
    console.log(error.stdout?.toString() || '');
    console.log(error.stderr?.toString() || '');
    failed++;
    
    if (test.critical) {
      criticalFailed++;
    }
  }
}

console.log('\\n📊 Résultats de validation:');
console.log(`✅ Tests réussis: ${passed}`);
console.log(`❌ Tests échoués: ${failed}`);

if (criticalFailed > 0) {
  console.log(`🚨 Tests critiques échoués: ${criticalFailed}`);
  console.log('\\n❌ VALIDATION ÉCHOUÉE - Correction requise avant production');
  process.exit(1);
} else if (failed === 0) {
  console.log('\\n✅ VALIDATION RÉUSSIE - Prêt pour production');
  process.exit(0);
} else {
  console.log('\\n⚠️  VALIDATION PARTIELLE - Tests non critiques échoués');
  process.exit(0);
}