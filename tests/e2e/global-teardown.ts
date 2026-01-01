/**
 * Global teardown pour les tests E2E Playwright
 *
 * Exécuté UNE FOIS après tous les tests pour:
 * - Nettoyer les connexions IndexedDB
 * - Supprimer les profils Chrome temporaires
 * - Tuer les processus Chrome restants
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

async function globalTeardown() {
  console.log('\n🧹 Global E2E Test Teardown\n');

  // 1. Nettoyer les profils Playwright
  console.log('🗑️  Cleaning Playwright profiles...');

  const tmpDir = os.tmpdir();
  let cleanedCount = 0;

  try {
    const entries = fs.readdirSync(tmpDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.match(/^playwright-/)) {
        const dirPath = path.join(tmpDir, entry.name);

        try {
          fs.rmSync(dirPath, { recursive: true, force: true });
          cleanedCount++;
        } catch (error) {
          // Ignorer les erreurs
        }
      }
    }

    console.log(`✓ Cleaned ${cleanedCount} Playwright profiles`);
  } catch (error) {
    console.warn(`⚠ Warning during cleanup: ${error.message}`);
  }

  // 2. Tuer tous les processus Chrome liés à Playwright
  console.log('\n🔪 Killing remaining Chrome processes...');

  try {
    const psOutput = execSync('ps aux 2>/dev/null | grep -E "chrome.*playwright" | grep -v grep || true', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });

    if (psOutput.trim()) {
      const processes = psOutput.trim().split('\n');
      console.log(`Found ${processes.length} Chrome processes, killing...`);

      // Kill gracefully first
      execSync('pkill -f "chrome.*playwright" 2>/dev/null || true');

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Force kill remaining
      execSync('pkill -9 -f "chrome.*playwright" 2>/dev/null || true');

      console.log('✓ Chrome processes killed');
    } else {
      console.log('✓ No Chrome processes to kill');
    }
  } catch (error) {
    console.warn(`⚠ Warning killing processes: ${error.message}`);
  }

  // 3. Exécuter le script de nettoyage complet si disponible
  console.log('\n🧹 Running full cleanup script...');

  try {
    const cleanupScript = path.resolve(__dirname, '../../scripts/clean-playwright-temps.js');

    if (fs.existsSync(cleanupScript)) {
      execSync(`node "${cleanupScript}" --force`, {
        stdio: 'inherit',
        timeout: 10000
      });
    }
  } catch (error) {
    console.warn(`⚠ Cleanup script warning: ${error.message}`);
  }

  console.log('\n✓ Global teardown completed\n');
}

export default globalTeardown;
