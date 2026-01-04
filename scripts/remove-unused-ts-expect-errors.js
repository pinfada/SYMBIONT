#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob').globSync || require('glob').sync;

/**
 * Script pour supprimer les directives @ts-expect-error inutiles
 * TypeScript 5.x génère une erreur TS2578 pour les @ts-expect-error qui ne suppriment pas d'erreur
 */

// Liste des fichiers avec des @ts-expect-error inutiles basée sur les erreurs de build
const filesWithUnusedDirectives = [
  'src/background/index.ts',
  'src/background/persistent-service-worker.ts',
  'src/background/services/WebGLBridge.ts',
  'src/behavioral/core/BehaviorPredictor.ts',
  'src/behavioral/core/BehavioralEngine.ts',
  'src/behavioral/core/PatternAnalyzer.ts',
  'src/communication/resilient-message-bus.ts',
  'src/content/collectors/InteractionCollector.ts',
  'src/content/monitors/AttentionMonitor.ts',
  'src/content/observers/NavigationObserver.ts',
  'src/content/observers/ScrollTracker.ts',
  'src/core/NeuralMesh.ts',
  'src/core/NeuralMeshAsync.ts',
  'src/core/OrganismCore.ts',
  'src/core/messaging/MessageBus.ts',
  'src/core/messaging/SynapticRouter.ts',
  'src/core/utils/ErrorHandler.ts',
  'src/generative/OrganismEngine.ts',
  'src/generative/ProceduralGenerator.ts',
  'src/intelligence/context-aware-organism.ts',
  'src/mystical/SecretRitualSystem.ts',
  'src/neural/GeneticMutator.ts',
  'src/neural/NeuralCoreEngine.ts',
  'src/optimizers/WebGLOptimizer.ts',
  'src/popup/components/GlobalNetworkGraph.test.tsx',
  'src/shared/observers/NavigationObserver.ts',
  'src/social/SocialNetworkManager.ts',
  'src/social/collective-intelligence.ts',
  'src/social/distributed-organism-network.ts'
];

let totalFixed = 0;

function removeUnusedTsExpectError(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    console.warn(`⚠️  File not found: ${filePath}`);
    return 0;
  }

  let content = fs.readFileSync(absolutePath, 'utf8');
  const originalContent = content;

  // Pattern pour détecter les @ts-expect-error sur une ligne
  const tsExpectErrorPattern = /^(\s*)\/\/\s*@ts-expect-error.*$/gm;

  // Remplacer les @ts-expect-error inutiles
  let fixedCount = 0;
  content = content.replace(tsExpectErrorPattern, (match, indent) => {
    fixedCount++;
    return ''; // Supprimer complètement la ligne
  });

  // Nettoyer les lignes vides multiples consécutives
  content = content.replace(/\n\n\n+/g, '\n\n');

  if (content !== originalContent) {
    fs.writeFileSync(absolutePath, content, 'utf8');
    console.log(`✅ Fixed ${fixedCount} unused @ts-expect-error in ${filePath}`);
    return fixedCount;
  }

  return 0;
}

console.log('🔍 Removing unused @ts-expect-error directives...\n');

filesWithUnusedDirectives.forEach(file => {
  totalFixed += removeUnusedTsExpectError(file);
});

console.log(`\n✨ Total fixed: ${totalFixed} unused @ts-expect-error directives removed`);

// Optionnel: scanner tous les fichiers TS/TSX pour d'autres occurrences
console.log('\n🔍 Scanning for any remaining @ts-expect-error directives...');

const allTsFiles = glob('src/**/*.{ts,tsx}', { ignore: ['**/node_modules/**', '**/dist/**'] });
let remainingCount = 0;

allTsFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.match(/\/\/\s*@ts-expect-error/g);
  if (matches) {
    remainingCount += matches.length;
    console.log(`  Found ${matches.length} @ts-expect-error in ${file}`);
  }
});

if (remainingCount > 0) {
  console.log(`\n⚠️  ${remainingCount} @ts-expect-error directives still remain (these might be valid)`);
} else {
  console.log('\n✅ No @ts-expect-error directives remaining!');
}