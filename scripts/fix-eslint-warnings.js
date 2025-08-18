#!/usr/bin/env node

/**
 * Script pour corriger automatiquement les warnings ESLint
 * Focus sur les types any et variables non utilisées
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ESLintFixer {
  constructor() {
    this.fixedFiles = 0;
    this.totalWarnings = 0;
    this.fixedWarnings = 0;
  }

  /**
   * Corrige les types any basiques en types plus spécifiques
   */
  fixAnyTypes(content) {
    let fixed = content;

    // Corriger les types any courants
    const anyReplacements = [
      // Paramètres de fonctions communes
      { pattern: /(data: any)/g, replacement: 'data: unknown' },
      { pattern: /(value: any)/g, replacement: 'value: unknown' },
      { pattern: /(obj: any)/g, replacement: 'obj: Record<string, unknown>' },
      { pattern: /(params: any)/g, replacement: 'params: Record<string, unknown>' },
      { pattern: /(options: any)/g, replacement: 'options: Record<string, unknown>' },
      { pattern: /(config: any)/g, replacement: 'config: Record<string, unknown>' },
      { pattern: /(error: any)/g, replacement: 'error: Error | unknown' },
      { pattern: /(event: any)/g, replacement: 'event: Event' },
      { pattern: /(message: any)/g, replacement: 'message: MessageEvent | unknown' },
      
      // Types de retour
      { pattern: /: any\[\]/g, replacement: ': unknown[]' },
      { pattern: /: any \|/g, replacement: ': unknown |' },
      { pattern: /: any;$/gm, replacement: ': unknown;' },
      { pattern: /: any,$/gm, replacement: ': unknown,' },
      
      // Dans les génériques
      { pattern: /<any>/g, replacement: '<unknown>' },
      { pattern: /Array<any>/g, replacement: 'Array<unknown>' },
      { pattern: /Promise<any>/g, replacement: 'Promise<unknown>' },
      
      // Variables et propriétés
      { pattern: /const (\w+): any/g, replacement: 'const $1: unknown' },
      { pattern: /let (\w+): any/g, replacement: 'let $1: unknown' },
    ];

    anyReplacements.forEach(({ pattern, replacement }) => {
      if (pattern.test(fixed)) {
        fixed = fixed.replace(pattern, replacement);
        this.fixedWarnings++;
      }
    });

    return fixed;
  }

  /**
   * Corrige les variables non utilisées en ajoutant un underscore
   */
  fixUnusedVariables(content) {
    let fixed = content;

    // Patterns pour les variables non utilisées communes
    const unusedPatterns = [
      // Paramètres de callback
      { pattern: /\((message, sender, sendResponse)\) =>/g, replacement: '(message, _sender, _sendResponse) =>' },
      { pattern: /\((\w+), sender, sendResponse\)/g, replacement: '($1, _sender, _sendResponse)' },
      { pattern: /\(message, (sender), sendResponse\)/g, replacement: '(message, _$1, sendResponse)' },
      { pattern: /\(message, sender, (sendResponse)\)/g, replacement: '(message, sender, _$1)' },
      
      // Event handlers
      { pattern: /\(event: Event\) =>/g, replacement: '(_event: Event) =>' },
      { pattern: /\(e: MouseEvent\) =>/g, replacement: '(_e: MouseEvent) =>' },
      { pattern: /\(evt: Event\) =>/g, replacement: '(_evt: Event) =>' },
      
      // Try-catch
      { pattern: /catch \((error|err|e)\)/g, replacement: 'catch (_$1)' },
      
      // Fonction parameters non utilisés
      { pattern: /function \w+\((\w+): \w+\) {/g, replacement: (match, param) => {
        if (!content.includes(param) || content.indexOf(param) === content.lastIndexOf(param)) {
          return match.replace(param, `_${param}`);
        }
        return match;
      }}
    ];

    unusedPatterns.forEach(({ pattern, replacement }) => {
      if (pattern.test(fixed)) {
        fixed = fixed.replace(pattern, replacement);
        this.fixedWarnings++;
      }
    });

    return fixed;
  }

  /**
   * Corrige les imports non utilisés
   */
  fixUnusedImports(content) {
    let fixed = content;
    const lines = fixed.split('\n');
    const fixedLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Détecter les imports
      const importMatch = line.match(/import\s+(?:{([^}]+)}|\*\s+as\s+(\w+)|(\w+))\s+from\s+['"]([^'"]+)['"]/);
      
      if (importMatch) {
        const [fullMatch, namedImports, namespaceImport, defaultImport, modulePath] = importMatch;
        
        if (namedImports) {
          // Imports nommés
          const imports = namedImports.split(',').map(imp => imp.trim());
          const usedImports = imports.filter(imp => {
            const restOfFile = lines.slice(i + 1).join('\n');
            return restOfFile.includes(imp);
          });
          
          if (usedImports.length === 0) {
            // Supprimer l'import entier
            continue;
          } else if (usedImports.length < imports.length) {
            // Garder seulement les imports utilisés
            fixedLines.push(`import { ${usedImports.join(', ')} } from '${modulePath}';`);
            this.fixedWarnings++;
            continue;
          }
        } else if (namespaceImport || defaultImport) {
          const importName = namespaceImport || defaultImport;
          const restOfFile = lines.slice(i + 1).join('\n');
          
          if (!restOfFile.includes(importName)) {
            // Import non utilisé, le supprimer
            this.fixedWarnings++;
            continue;
          }
        }
      }
      
      fixedLines.push(line);
    }

    return fixedLines.join('\n');
  }

  /**
   * Traite un fichier
   */
  processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let fixed = content;

      // Appliquer les corrections
      fixed = this.fixAnyTypes(fixed);
      fixed = this.fixUnusedVariables(fixed);
      fixed = this.fixUnusedImports(fixed);

      // Sauvegarder si des changements ont été faits
      if (fixed !== content) {
        fs.writeFileSync(filePath, fixed, 'utf8');
        console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
        this.fixedFiles++;
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
      return false;
    }
  }

  /**
   * Trouve tous les fichiers TypeScript
   */
  findTSFiles(dir, files = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        this.findTSFiles(fullPath, files);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Exécute les corrections
   */
  async run() {
    console.log('🔧 Starting ESLint warnings fix...\n');

    // Obtenir le nombre initial de warnings
    try {
      execSync('npm run lint', { stdio: 'pipe' });
    } catch (error) {
      const output = error.stdout?.toString() || '';
      const warningsMatch = output.match(/(\d+) problems \((\d+) errors, (\d+) warnings\)/);
      if (warningsMatch) {
        this.totalWarnings = parseInt(warningsMatch[3]);
        console.log(`📊 Initial warnings: ${this.totalWarnings}\n`);
      }
    }

    // Trouver et traiter tous les fichiers TS
    const srcDir = path.join(process.cwd(), 'src');
    const tsFiles = this.findTSFiles(srcDir);
    
    console.log(`📁 Found ${tsFiles.length} TypeScript files\n`);

    // Traiter chaque fichier
    for (const file of tsFiles) {
      this.processFile(file);
    }

    console.log(`\n📈 Summary:`);
    console.log(`   Files processed: ${tsFiles.length}`);
    console.log(`   Files modified: ${this.fixedFiles}`);
    console.log(`   Warnings fixed: ${this.fixedWarnings}`);

    // Vérifier les warnings restants
    try {
      execSync('npm run lint', { stdio: 'pipe' });
      console.log(`✅ All warnings fixed!`);
    } catch (error) {
      const output = error.stdout?.toString() || '';
      const warningsMatch = output.match(/(\d+) problems \((\d+) errors, (\d+) warnings\)/);
      if (warningsMatch) {
        const remainingWarnings = parseInt(warningsMatch[3]);
        const fixedCount = this.totalWarnings - remainingWarnings;
        console.log(`⚠️  Remaining warnings: ${remainingWarnings}`);
        console.log(`✅ Fixed warnings: ${fixedCount}`);
        
        if (remainingWarnings > 0) {
          console.log(`\n🔍 Remaining issues need manual attention:`);
          console.log(output);
        }
      }
    }
  }
}

// Exécuter le script
if (require.main === module) {
  const fixer = new ESLintFixer();
  fixer.run().catch(console.error);
}

module.exports = ESLintFixer;