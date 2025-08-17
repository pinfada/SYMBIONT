#!/usr/bin/env node

/**
 * Migration finale Math.random() vers SecureRandom
 * Traite les 55 occurrences restantes identifiées
 */

const fs = require('fs');
const path = require('path');

// Configuration des fichiers à migrer
const FILES_TO_MIGRATE = [
  'src/core/SensoryNetwork.ts',
  'src/generative/DNAInterpreter.ts', 
  'src/intelligence/context-aware-organism.ts',
  'src/monitoring/basic-health-monitor.ts',
  'src/monitoring/predictive-health-monitor.ts',
  'src/monitoring/RealTimePerformanceMonitor.ts',
  'src/mystical/SecretRitualSystem.ts',
  'src/popup/components/ContextualInvitationNotification.tsx',
  'src/popup/components/SharedMutationRitual.tsx',
  'src/popup/components/SocialPanel.tsx',
  'src/popup/services/RealDataService.ts',
  'src/ui/OrganismDashboard.tsx',
  'src/workers/NeuralWorker.ts'
];

// Patterns de remplacement avancés
const REPLACEMENT_PATTERNS = [
  // Pattern 1: Math.random() simple
  {
    pattern: /Math\.random\(\)/g,
    replacement: 'SecureRandom.random()',
    description: 'Math.random() simple'
  },
  // Pattern 2: Math.floor(Math.random() * n)
  {
    pattern: /Math\.floor\(Math\.random\(\)\s*\*\s*([^)]+)\)/g,
    replacement: 'SecureRandom.randomInt(0, $1)',
    description: 'Math.floor(Math.random() * n)'
  },
  // Pattern 3: Math.random() * n (float)
  {
    pattern: /Math\.random\(\)\s*\*\s*([0-9.]+)/g,
    replacement: 'SecureRandom.randomFloat(0, $1)',
    description: 'Math.random() * n (float)'
  },
  // Pattern 4: (Math.random() - 0.5) mutations
  {
    pattern: /\(Math\.random\(\)\s*-\s*0\.5\)/g,
    replacement: '(SecureRandom.random() - 0.5)',
    description: '(Math.random() - 0.5)'
  },
  // Pattern 5: Math.random().toString(36) pour IDs
  {
    pattern: /Math\.random\(\)\.toString\(36\)\.substr?\(2,?\s*(\d+)\)/g,
    replacement: 'SecureRandom.randomString($1, "abcdefghijklmnopqrstuvwxyz0123456789")',
    description: 'Math.random().toString(36) pour IDs'
  }
];

// Import SecureRandom à ajouter
const SECURE_RANDOM_IMPORT = "import { SecureRandom } from '@shared/utils/secureRandom';";

/**
 * Vérifie si un fichier contient déjà l'import SecureRandom
 */
function hasSecureRandomImport(content) {
  return content.includes('SecureRandom') && 
         content.includes('from') && 
         content.includes('secureRandom');
}

/**
 * Ajoute l'import SecureRandom si nécessaire
 */
function addSecureRandomImport(content, filePath) {
  if (hasSecureRandomImport(content)) {
    return content;
  }
  
  // Trouve la position d'insertion (après les autres imports)
  const lines = content.split('\n');
  let insertIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ') || lines[i].startsWith('import{')) {
      insertIndex = i + 1;
    } else if (lines[i].trim() === '' && insertIndex > 0) {
      // Ligne vide après imports
      break;
    } else if (!lines[i].startsWith('//') && !lines[i].startsWith('/*') && lines[i].trim() !== '' && insertIndex > 0) {
      // Première ligne non-import/commentaire
      break;
    }
  }
  
  const importToAdd = filePath.endsWith('.tsx') ? 
    "import { SecureRandom } from '../shared/utils/secureRandom';" :
    "import { SecureRandom } from '@shared/utils/secureRandom';";
  
  lines.splice(insertIndex, 0, importToAdd);
  return lines.join('\n');
}

/**
 * Migre un fichier
 */
function migrateFile(filePath) {
  console.log(`\n🔄 Migration ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  Fichier non trouvé: ${filePath}`);
    return { migrated: false, changes: 0 };
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let totalChanges = 0;
  
  // Applique tous les patterns de remplacement
  REPLACEMENT_PATTERNS.forEach(({ pattern, replacement, description }) => {
    const matches = content.match(pattern);
    if (matches) {
      console.log(`  📝 ${description}: ${matches.length} occurrences`);
      content = content.replace(pattern, replacement);
      totalChanges += matches.length;
    }
  });
  
  if (totalChanges > 0) {
    // Ajoute l'import SecureRandom si nécessaire
    content = addSecureRandomImport(content, filePath);
    
    // Sauvegarde le fichier modifié
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ ${totalChanges} migrations effectuées`);
    
    return { migrated: true, changes: totalChanges };
  } else {
    console.log(`  ⏭️  Aucune migration nécessaire`);
    return { migrated: false, changes: 0 };
  }
}

/**
 * Traite les cas spéciaux qui nécessitent une migration manuelle
 */
function handleSpecialCases() {
  console.log('\n🔧 Traitement des cas spéciaux...');
  
  // Cas spécial 1: SensoryNetwork.ts - Box-Muller transform
  const sensoryPath = 'src/core/SensoryNetwork.ts';
  if (fs.existsSync(sensoryPath)) {
    let content = fs.readFileSync(sensoryPath, 'utf8');
    
    // Box-Muller nécessite une approche spéciale
    const boxMullerPattern = /while \(u === 0\) u = Math\.random\(\);[\s\S]*?while \(v === 0\) v = Math\.random\(\);/;
    if (boxMullerPattern.test(content)) {
      content = content.replace(
        /while \(u === 0\) u = Math\.random\(\);/g,
        'while (u === 0) u = SecureRandom.random();'
      );
      content = content.replace(
        /while \(v === 0\) v = Math\.random\(\);/g,
        'while (v === 0) v = SecureRandom.random();'
      );
      
      content = addSecureRandomImport(content, sensoryPath);
      fs.writeFileSync(sensoryPath, content, 'utf8');
      console.log('  ✅ Box-Muller transform migré dans SensoryNetwork.ts');
    }
  }
  
  // Cas spécial 2: UUID v4 pattern dans SecretRitualSystem.ts
  const mysticalPath = 'src/mystical/SecretRitualSystem.ts';
  if (fs.existsSync(mysticalPath)) {
    let content = fs.readFileSync(mysticalPath, 'utf8');
    
    // Remplace le pattern UUID v4 spécifique
    const uuidPattern = /var r = Math\.random\(\) \* 16 \| 0, v = c == 'x' \? r : \(r & 0x3 \| 0x8\);/;
    if (uuidPattern.test(content)) {
      content = content.replace(uuidPattern, 
        'var r = SecureRandom.randomInt(0, 16), v = c == \'x\' ? r : (r & 0x3 | 0x8);'
      );
      
      content = addSecureRandomImport(content, mysticalPath);
      fs.writeFileSync(mysticalPath, content, 'utf8');
      console.log('  ✅ UUID v4 pattern migré dans SecretRitualSystem.ts');
    }
  }
}

/**
 * Valide que la migration s'est bien passée
 */
function validateMigration() {
  console.log('\n🔍 Validation de la migration...');
  
  let totalRemaining = 0;
  
  FILES_TO_MIGRATE.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const matches = content.match(/Math\.random/g);
      
      if (matches) {
        const remaining = matches.length;
        totalRemaining += remaining;
        console.log(`  ⚠️  ${filePath}: ${remaining} Math.random restants`);
        
        // Affiche les lignes problématiques
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes('Math.random') && !line.includes('//') && !line.includes('*')) {
            console.log(`      Ligne ${index + 1}: ${line.trim()}`);
          }
        });
      } else {
        console.log(`  ✅ ${filePath}: Migration complète`);
      }
    }
  });
  
  return totalRemaining;
}

/**
 * Génère un rapport de migration
 */
function generateReport(results) {
  const totalFiles = results.filter(r => r.migrated).length;
  const totalChanges = results.reduce((sum, r) => sum + r.changes, 0);
  
  console.log('\n📊 Rapport de migration finale:');
  console.log(`  📁 Fichiers traités: ${FILES_TO_MIGRATE.length}`);
  console.log(`  ✅ Fichiers migrés: ${totalFiles}`);
  console.log(`  🔄 Total changements: ${totalChanges}`);
  
  const remaining = validateMigration();
  console.log(`  🎯 Math.random() restants: ${remaining}`);
  
  if (remaining === 0) {
    console.log('\n🎉 Migration Math.random() COMPLÈTE !');
    console.log('   Tous les fichiers sources utilisent maintenant SecureRandom');
  } else {
    console.log(`\n⚠️  Migration incomplète: ${remaining} occurrences à traiter manuellement`);
  }
  
  return { totalFiles, totalChanges, remaining };
}

/**
 * Fonction principale
 */
function main() {
  console.log('🚀 Migration finale Math.random() vers SecureRandom\n');
  
  const results = [];
  
  // Migre tous les fichiers
  FILES_TO_MIGRATE.forEach(filePath => {
    const result = migrateFile(filePath);
    results.push(result);
  });
  
  // Traite les cas spéciaux
  handleSpecialCases();
  
  // Génère le rapport final
  const report = generateReport(results);
  
  // Sauvegarde le rapport
  const reportData = {
    timestamp: new Date().toISOString(),
    filesProcessed: FILES_TO_MIGRATE.length,
    filesMigrated: report.totalFiles,
    totalChanges: report.totalChanges,
    remainingMathRandom: report.remaining,
    migrationComplete: report.remaining === 0
  };
  
  fs.writeFileSync('math-random-migration-final-report.json', JSON.stringify(reportData, null, 2));
  console.log('\n📄 Rapport sauvegardé: math-random-migration-final-report.json');
}

// Exécution du script
if (require.main === module) {
  main();
}