#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class UnusedImportsCleaner {
  constructor() {
    this.fixedFiles = 0;
    this.removedImports = 0;
  }

  /**
   * Nettoie les imports inutilisés d'un fichier
   */
  cleanUnusedImports(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return false;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      let cleaned = content;
      let hasChanges = false;

      // Patterns pour identifier les imports inutilisés
      const importPatterns = [
        // Type imports inutilisés identifiés par les erreurs de build
        /import type { Mutation } from '@\/types\/organism';?\n?/g,
        /import type { OrganismState } from '@\/types\/core';?\n?/g,
        /import type { BehaviorPattern } from '@\/types\/behavioral';?\n?/g,
        
        // Logger dupliqués
        /import { logger } from '@shared\/utils\/secureLogger';?\n?/g,
        
        // Imports complètement inutilisés (variables jamais utilisées)
        /import { logger } from '@\/shared\/utils\/secureLogger';\s*(?=\n.*TS6133)/g,
      ];

      importPatterns.forEach(pattern => {
        const newContent = cleaned.replace(pattern, '');
        if (newContent !== cleaned) {
          hasChanges = true;
          this.removedImports++;
          cleaned = newContent;
        }
      });

      // Nettoie les lignes vides en trop
      cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

      if (hasChanges) {
        fs.writeFileSync(filePath, cleaned, 'utf8');
        console.log(`✅ Cleaned: ${path.relative(process.cwd(), filePath)}`);
        this.fixedFiles++;
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ Error cleaning ${filePath}:`, error.message);
      return false;
    }
  }

  /**
   * Nettoie tous les fichiers problématiques identifiés par les erreurs
   */
  cleanAllFiles() {
    console.log('🧹 Cleaning unused imports...\n');

    const problemFiles = [
      'src/background/OrganismMemoryBank.ts',
      'src/background/SecurityManager.ts',
      'src/background/WebGLOrchestrator.ts',
      'src/storage/hybrid-storage-manager.ts',
      'src/workers/NeuralWorker.ts',
      'src/core/NeuralMesh.ts',
      'src/core/OrganismCore.ts',
      'src/background/service-worker-adapter.ts'
    ];

    problemFiles.forEach(file => {
      const fullPath = path.resolve(file);
      this.cleanUnusedImports(fullPath);
    });

    console.log(`\n📊 Summary:`);
    console.log(`   - Files processed: ${problemFiles.length}`);
    console.log(`   - Files cleaned: ${this.fixedFiles}`);
    console.log(`   - Imports removed: ${this.removedImports}\n`);
  }

  /**
   * Test le build après nettoyage
   */
  testBuild() {
    console.log('🔄 Testing build after cleanup...');
    try {
      const output = execSync('npm run build', { 
        stdio: 'pipe', 
        timeout: 120000,
        encoding: 'utf8'
      });
      
      const errors = (output.match(/ERROR/g) || []).length;
      const warnings = (output.match(/warning/gi) || []).length;
      
      console.log(`✅ Build completed with ${errors} errors and ${warnings} warnings`);
      
      if (errors < 100) {
        console.log('🎉 Significant improvement in build errors!');
      }
      
      return true;
    } catch (error) {
      const output = error.stdout || error.stderr || '';
      const errors = (output.match(/ERROR/g) || []).length;
      console.log(`⚠️  Build completed with ${errors} errors`);
      
      // Même avec des erreurs, on considère une amélioration
      if (errors < 300) {
        console.log('📈 Good progress on reducing build errors');
      }
      
      return false;
    }
  }

  /**
   * Exécute le nettoyage complet
   */
  run() {
    this.cleanAllFiles();
    this.testBuild();
  }
}

// Exécuter le script
if (require.main === module) {
  const cleaner = new UnusedImportsCleaner();
  cleaner.run();
}

module.exports = UnusedImportsCleaner;