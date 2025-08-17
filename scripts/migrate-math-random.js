#!/usr/bin/env node

/**
 * Script de migration automatique Math.random() → SecureRandom
 * Traite les fichiers TypeScript du projet SYMBIONT
 */

const fs = require('fs');
const path = require('path');

// Configuration
const TARGET_FILES = [
  'src/core/utils/WebGLBatcher.ts',
  'src/core/NeuralMeshAsync.ts', 
  'src/core/utils/MutationBatcher.ts',
  'src/social/SocialNetworkManager.ts',
  'src/social/distributed-organism-network.ts',
  'src/social/social-resilience.ts',
  'src/social/collective-intelligence.ts',
  'src/social/mystical-events.ts',
  'src/background/index.ts',
  'src/background/services/InvitationService.ts',
  'src/background/services/MurmureService.ts',
  'src/core/neural/NeuralMesh.ts',
  'src/neural/NeuralCoreEngine.ts',
  'src/neural/GeneticMutator.ts'
];

// Patterns de remplacement
const MIGRATIONS = [
  {
    pattern: /Math\.random\(\)/g,
    replacement: 'SecureRandom.random()',
    description: 'Math.random() → SecureRandom.random()'
  },
  {
    pattern: /Math\.floor\(Math\.random\(\)\s*\*\s*([^)]+)\)/g,
    replacement: 'SecureRandom.randomInt(0, $1)',
    description: 'Math.floor(Math.random() * n) → SecureRandom.randomInt(0, n)'
  },
  {
    pattern: /Math\.random\(\)\.toString\(36\)\.substr\(2,\s*(\d+)\)/g,
    replacement: 'SecureRandom.randomString($1)',
    description: 'Math.random().toString(36).substr() → SecureRandom.randomString()'
  }
];

// Import à ajouter
const SECURE_RANDOM_IMPORT = "import { SecureRandom } from '../shared/utils/secureRandom';";

/**
 * Analyse un fichier et détermine le bon chemin d'import
 */
function getCorrectImportPath(filePath) {
  const relativePath = path.relative(path.dirname(filePath), 'src/shared/utils/secureRandom.ts');
  const cleanPath = relativePath.replace(/\.ts$/, '').replace(/\\/g, '/');
  return `import { SecureRandom } from '${cleanPath.startsWith('.') ? cleanPath : './' + cleanPath}';`;
}

/**
 * Vérifie si un fichier contient déjà l'import SecureRandom
 */
function hasSecureRandomImport(content) {
  return /import.*SecureRandom.*from/.test(content);
}

/**
 * Ajoute l'import SecureRandom en début de fichier
 */
function addSecureRandomImport(content, filePath) {
  if (hasSecureRandomImport(content)) {
    return content;
  }

  const correctImport = getCorrectImportPath(filePath);
  
  // Trouve la position après les imports existants
  const lines = content.split('\n');
  let insertIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('import ') || line.startsWith('//')) {
      insertIndex = i + 1;
    } else if (line === '') {
      continue;
    } else {
      break;
    }
  }
  
  lines.splice(insertIndex, 0, correctImport);
  return lines.join('\n');
}

/**
 * Applique les migrations sur le contenu d'un fichier
 */
function applyMigrations(content) {
  let migratedContent = content;
  const appliedMigrations = [];
  
  for (const migration of MIGRATIONS) {
    const matches = migratedContent.match(migration.pattern);
    if (matches) {
      migratedContent = migratedContent.replace(migration.pattern, migration.replacement);
      appliedMigrations.push({
        ...migration,
        count: matches.length
      });
    }
  }
  
  return { content: migratedContent, migrations: appliedMigrations };
}

/**
 * Traite un fichier spécifique
 */
function processFile(filePath) {
  console.log(`\n🔍 Traitement: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  Fichier non trouvé: ${filePath}`);
    return { processed: false, reason: 'not_found' };
  }
  
  const originalContent = fs.readFileSync(filePath, 'utf8');
  
  // Vérifie si le fichier contient Math.random()
  if (!originalContent.includes('Math.random()')) {
    console.log(`  ℹ️  Aucun Math.random() trouvé`);
    return { processed: false, reason: 'no_math_random' };
  }
  
  // Applique les migrations
  const { content: migratedContent, migrations } = applyMigrations(originalContent);
  
  if (migrations.length === 0) {
    console.log(`  ℹ️  Aucune migration applicable`);
    return { processed: false, reason: 'no_migrations' };
  }
  
  // Ajoute l'import si nécessaire
  const finalContent = addSecureRandomImport(migratedContent, filePath);
  
  // Sauvegarde le fichier modifié
  fs.writeFileSync(filePath, finalContent, 'utf8');
  
  console.log(`  ✅ Migré avec succès:`);
  migrations.forEach(m => {
    console.log(`    - ${m.description} (${m.count} occurrence${m.count > 1 ? 's' : ''})`);
  });
  
  return { processed: true, migrations };
}

/**
 * Fonction principale
 */
function main() {
  console.log('🚀 Migration Math.random() → SecureRandom\n');
  console.log('📋 Fichiers à traiter:');
  TARGET_FILES.forEach(file => console.log(`  - ${file}`));
  
  const results = {
    processed: 0,
    skipped: 0,
    totalMigrations: 0
  };
  
  for (const filePath of TARGET_FILES) {
    const result = processFile(filePath);
    
    if (result.processed) {
      results.processed++;
      results.totalMigrations += result.migrations.reduce((sum, m) => sum + m.count, 0);
    } else {
      results.skipped++;
    }
  }
  
  console.log('\n📊 Résultats de la migration:');
  console.log(`  ✅ Fichiers traités: ${results.processed}`);
  console.log(`  ⏭️  Fichiers ignorés: ${results.skipped}`);
  console.log(`  🔄 Total migrations: ${results.totalMigrations}`);
  
  if (results.processed > 0) {
    console.log('\n✨ Migration terminée avec succès!');
    console.log('💡 N\'oubliez pas de:');
    console.log('  1. Vérifier que le build fonctionne: npm run build');
    console.log('  2. Tester les comportements: npm test');
    console.log('  3. Valider les mutations d\'organismes');
  } else {
    console.log('\n⚠️  Aucun fichier n\'a été modifié');
  }
}

// Exécution du script
if (require.main === module) {
  main();
}