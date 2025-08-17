#!/usr/bin/env node

/**
 * Migration automatique console.log vers SecureLogger
 * Remplace toutes les expositions console.log par un logging sécurisé
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SECURE_LOGGER_IMPORT = "import { SecureLogger } from '@shared/utils/secureLogger';";

// Patterns de migration console.log
const CONSOLE_PATTERNS = [
  // Pattern 1: console.log simple
  {
    pattern: /console\.log\(([^)]+)\)/g,
    replacement: 'SecureLogger.info($1)',
    description: 'console.log() simple'
  },
  // Pattern 2: console.warn
  {
    pattern: /console\.warn\(([^)]+)\)/g,
    replacement: 'SecureLogger.warn($1)',
    description: 'console.warn()'
  },
  // Pattern 3: console.error
  {
    pattern: /console\.error\(([^)]+)\)/g,
    replacement: 'SecureLogger.error($1)',
    description: 'console.error()'
  },
  // Pattern 4: console.debug
  {
    pattern: /console\.debug\(([^)]+)\)/g,
    replacement: 'SecureLogger.debug($1)',
    description: 'console.debug()'
  }
];

/**
 * Obtient tous les fichiers TypeScript/TSX
 */
function getAllTsFiles() {
  try {
    const result = execSync('find src/ -name "*.ts" -o -name "*.tsx"', { encoding: 'utf8' });
    return result.trim().split('\n').filter(f => f.length > 0);
  } catch (error) {
    console.error('Erreur lors de la recherche des fichiers:', error.message);
    return [];
  }
}

/**
 * Vérifie si un fichier contient des console.log
 */
function hasConsoleLogs(content) {
  return /console\.(log|warn|error|debug)/g.test(content);
}

/**
 * Vérifie si un fichier a déjà l'import SecureLogger
 */
function hasSecureLoggerImport(content) {
  return content.includes('SecureLogger') && 
         content.includes('secureLogger');
}

/**
 * Ajoute l'import SecureLogger
 */
function addSecureLoggerImport(content, filePath) {
  if (hasSecureLoggerImport(content)) {
    return content;
  }
  
  const lines = content.split('\n');
  let insertIndex = 0;
  
  // Trouve la position d'insertion après les imports existants
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ') || lines[i].startsWith('import{')) {
      insertIndex = i + 1;
    } else if (lines[i].trim() === '' && insertIndex > 0) {
      break;
    } else if (!lines[i].startsWith('//') && !lines[i].startsWith('/*') && 
               lines[i].trim() !== '' && insertIndex > 0) {
      break;
    }
  }
  
  // Adaptation du chemin selon le type de fichier
  const importPath = filePath.includes('popup/') ? 
    "import { SecureLogger } from '../shared/utils/secureLogger';" :
    "import { SecureLogger } from '@shared/utils/secureLogger';";
  
  lines.splice(insertIndex, 0, importPath);
  return lines.join('\n');
}

/**
 * Migre les console.log d'un fichier
 */
function migrateConsoleLogsInFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { migrated: false, changes: 0 };
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!hasConsoleLogs(content)) {
    return { migrated: false, changes: 0 };
  }
  
  console.log(`\n🔄 Migration ${filePath}...`);
  
  let totalChanges = 0;
  
  // Applique toutes les migrations console
  CONSOLE_PATTERNS.forEach(({ pattern, replacement, description }) => {
    const matches = content.match(pattern);
    if (matches) {
      console.log(`  📝 ${description}: ${matches.length} occurrences`);
      content = content.replace(pattern, replacement);
      totalChanges += matches.length;
    }
  });
  
  if (totalChanges > 0) {
    // Ajoute l'import SecureLogger
    content = addSecureLoggerImport(content, filePath);
    
    // Sauvegarde
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ ${totalChanges} migrations console.log effectuées`);
    
    return { migrated: true, changes: totalChanges };
  }
  
  return { migrated: false, changes: 0 };
}

/**
 * Gère les cas spéciaux nécessitant une migration manuelle
 */
function handleSpecialCases() {
  console.log('\n🔧 Traitement des cas spéciaux console.log...');
  
  const specialCases = [
    {
      file: 'src/shared/utils/secureLogger.ts',
      description: 'SecureLogger lui-même - pas de migration'
    },
    {
      file: 'src/shared/utils/secureRandom.ts',
      description: 'Fallback console.warn - conservation nécessaire'
    }
  ];
  
  specialCases.forEach(({ file, description }) => {
    if (fs.existsSync(file)) {
      console.log(`  ⚠️  ${file}: ${description}`);
    }
  });
}

/**
 * Compte les console.log restants après migration
 */
function countRemainingConsoleLogs() {
  console.log('\n🔍 Validation migration console.log...');
  
  const allFiles = getAllTsFiles();
  let totalRemaining = 0;
  
  allFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const matches = content.match(/console\.(log|warn|error|debug)/g);
      
      if (matches) {
        // Exclut SecureLogger et les cas légitimes
        const legitimate = content.includes('SecureLogger') || 
                          content.includes('secureLogger.ts') ||
                          content.includes('secureRandom.ts');
        
        if (!legitimate) {
          const remaining = matches.length;
          totalRemaining += remaining;
          console.log(`  ⚠️  ${filePath}: ${remaining} console.* restants`);
          
          // Affiche quelques exemples
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            if (/console\.(log|warn|error|debug)/.test(line) && 
                !line.includes('//') && !line.includes('*')) {
              console.log(`      Ligne ${index + 1}: ${line.trim()}`);
            }
          });
        } else {
          console.log(`  ✅ ${filePath}: Migration complète ou cas légitime`);
        }
      } else {
        console.log(`  ✅ ${filePath}: Aucun console.log`);
      }
    }
  });
  
  return totalRemaining;
}

/**
 * Génère le rapport de migration
 */
function generateReport(results) {
  const totalFiles = getAllTsFiles().length;
  const migratedFiles = results.filter(r => r.migrated).length;
  const totalChanges = results.reduce((sum, r) => sum + r.changes, 0);
  const remaining = countRemainingConsoleLogs();
  
  console.log('\n📊 Rapport migration console.log:');
  console.log(`  📁 Fichiers analysés: ${totalFiles}`);
  console.log(`  ✅ Fichiers migrés: ${migratedFiles}`);
  console.log(`  🔄 Total migrations: ${totalChanges}`);
  console.log(`  🎯 Console.log restants: ${remaining}`);
  
  if (remaining === 0) {
    console.log('\n🎉 Migration console.log COMPLÈTE !');
    console.log('   Tous les logs utilisent maintenant SecureLogger');
  } else {
    console.log(`\n⚠️  Migration partielle: ${remaining} console.log à traiter manuellement`);
  }
  
  // Sauvegarde rapport
  const reportData = {
    timestamp: new Date().toISOString(),
    totalFiles,
    migratedFiles,
    totalChanges,
    remainingConsoleLogs: remaining,
    migrationComplete: remaining === 0
  };
  
  fs.writeFileSync('console-log-migration-report.json', JSON.stringify(reportData, null, 2));
  console.log('\n📄 Rapport sauvegardé: console-log-migration-report.json');
  
  return reportData;
}

/**
 * Fonction principale
 */
function main() {
  console.log('🚀 Migration console.log vers SecureLogger\n');
  
  const allFiles = getAllTsFiles();
  const results = [];
  
  if (allFiles.length === 0) {
    console.error('❌ Aucun fichier TypeScript trouvé');
    return;
  }
  
  console.log(`📁 ${allFiles.length} fichiers TypeScript détectés`);
  
  // Migre tous les fichiers
  allFiles.forEach(filePath => {
    const result = migrateConsoleLogsInFile(filePath);
    results.push(result);
  });
  
  // Traite les cas spéciaux
  handleSpecialCases();
  
  // Génère le rapport
  const report = generateReport(results);
  
  // Code de sortie
  process.exit(report.migrationComplete ? 0 : 1);
}

// Exécution du script
if (require.main === module) {
  main();
}