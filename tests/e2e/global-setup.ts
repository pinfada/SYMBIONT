/**
 * Global setup pour les tests E2E Playwright
 *
 * Exécuté UNE FOIS avant tous les tests pour:
 * - Nettoyer les fichiers temporaires Playwright
 * - Supprimer les profils Chrome zombies
 * - Vérifier que l'extension est buildée
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

async function globalSetup() {
  console.log('\n🚀 Global E2E Test Setup\n');

  // 1. Vérifier que l'extension est buildée
  const distPath = path.resolve(__dirname, '../../dist');
  const manifestPath = path.join(distPath, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error('❌ Extension not built! Run "npm run build" first.');
    process.exit(1);
  }

  console.log('✓ Extension build found');

  // 2. Nettoyer les fichiers temporaires Playwright
  console.log('\n🧹 Cleaning Playwright temporary files...');

  const tmpDir = os.tmpdir();
  let cleanedCount = 0;

  try {
    const entries = fs.readdirSync(tmpDir, { withFileTypes: true });

    for (const entry of entries) {
      // Nettoyer les répertoires playwright-*
      if (entry.isDirectory() && entry.name.match(/^playwright-/)) {
        const dirPath = path.join(tmpDir, entry.name);

        try {
          const stat = fs.statSync(dirPath);
          const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);

          // Supprimer les répertoires de plus de 5 minutes
          if (ageHours > 0.083) { // 5 minutes
            fs.rmSync(dirPath, { recursive: true, force: true });
            cleanedCount++;
            console.log(`  ✓ Removed: ${entry.name}`);
          }
        } catch (error) {
          // Ignorer les erreurs d'accès
        }
      }
    }

    console.log(`✓ Cleaned ${cleanedCount} temporary directories`);
  } catch (error) {
    console.warn(`⚠ Warning during cleanup: ${error.message}`);
  }

  // 3. Tuer les processus Chrome zombies
  console.log('\n🔍 Checking for zombie Chrome processes...');

  try {
    const psOutput = execSync('ps aux 2>/dev/null | grep -E "chrome.*playwright" | grep -v grep || true', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });

    if (psOutput.trim()) {
      const processes = psOutput.trim().split('\n');
      console.log(`⚠ Found ${processes.length} zombie Chrome processes, attempting cleanup...`);

      try {
        execSync('pkill -f "chrome.*playwright" 2>/dev/null || true');
        console.log('✓ Zombie processes cleaned');
      } catch (error) {
        console.warn('⚠ Could not kill all zombie processes');
      }
    } else {
      console.log('✓ No zombie processes found');
    }
  } catch (error) {
    console.warn(`⚠ Warning checking processes: ${error.message}`);
  }

  console.log('\n✓ Global setup completed\n');
}

export default globalSetup;
