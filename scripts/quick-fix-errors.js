#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Corrections rapides pour les erreurs critiques
function quickFix() {
  const files = [
    'src/background/index.ts',
    'src/background/OrganismMemoryBank.ts',
    'src/background/SecurityManager.ts',
    'src/background/WebGLOrchestrator.ts',
    'src/storage/hybrid-storage-manager.ts'
  ];

  files.forEach(file => {
    if (!fs.existsSync(file)) return;
    
    let content = fs.readFileSync(file, 'utf8');
    
    // Correction 1: Supprimer les "return undefined;" mal placés
    content = content.replace(/\breturn undefined;\}/g, '}');
    content = content.replace(/\breturn undefined;\s*\}/g, '}');
    content = content.replace(/(\w+)\s+return undefined;\}/g, '$1}');
    
    // Correction 2: Supprimer les imports dupliqués
    const lines = content.split('\n');
    const seenImports = new Set();
    const filteredLines = lines.filter(line => {
      if (line.startsWith('import ')) {
        if (seenImports.has(line.trim())) {
          return false; // Skip duplicate
        }
        seenImports.add(line.trim());
      }
      return true;
    });
    
    content = filteredLines.join('\n');
    
    // Correction 3: Réparer les destructuring cassés
    content = content.replace(/const\s*{\s*(\w+),\s*(\w+)\s*return undefined;\}\s*=/g, 'const { $1, $2 } =');
    
    // Correction 4: Remplacer _error par error dans les catch blocks
    content = content.replace(/logger\.error\([^,]+,\s*_error\)/g, (match) => {
      return match.replace('_error', 'error');
    });
    content = content.replace(/logger\.warn\([^,]+,\s*_error\)/g, (match) => {
      return match.replace('_error', 'error');
    });
    
    // Correction 5: Réparer les catch (_error) { ... error ... }
    content = content.replace(/catch\s*\(\s*_error\s*\)\s*{([^}]+)}/g, (match, body) => {
      const fixedBody = body.replace(/\b_error\b/g, 'error');
      return `catch (error) {${fixedBody}}`;
    });
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed: ${file}`);
  });
}

quickFix();