#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Verification de l\'extension SYMBIONT...\n');

const requiredFiles = [
  'manifest.json',
  'background/index.js',
  'content/index.js',
  'popup/index.html',
  'popup/index.js',
  'popup/index.css',
  'neural-worker.js',
  'resonance-worker.js',
  'offscreen.html',
  'assets/icons/icon16.png',
  'assets/icons/icon32.png',
  'assets/icons/icon48.png',
  'assets/icons/icon128.png',
  'assets/icons/icon512.png'
];

let allFilesPresent = true;
const errors = [];

// Vérifier chaque fichier requis
requiredFiles.forEach(file => {
  const filePath = path.join('dist', file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`[OK] ${file} (${stats.size} bytes)`);
  } else {
    console.log(`[ERREUR] ${file} - MANQUANT`);
    errors.push(`Fichier manquant: ${file}`);
    allFilesPresent = false;
  }
});

console.log('\nVerification du manifest.json...');

// Vérifier le manifest
try {
  const manifestPath = path.join('dist', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // Vérifications de base
  if (manifest.manifest_version !== 3) {
    errors.push('manifest_version doit être 3');
  }

  if (!manifest.background?.service_worker) {
    errors.push('Service worker manquant dans background');
  }

  if (!manifest.content_scripts || manifest.content_scripts.length === 0) {
    errors.push('Content scripts manquants');
  }

  console.log(`[OK] Manifest version: ${manifest.manifest_version}`);
  console.log(`[OK] Service worker: ${manifest.background?.service_worker}`);
  console.log(`[OK] Content scripts: ${manifest.content_scripts?.length || 0}`);

} catch (error) {
  console.log(`[ERREUR] Erreur de lecture du manifest: ${error.message}`);
  errors.push(`Erreur manifest: ${error.message}`);
}

// Vérifier les permissions spéciales
console.log('\nVerifications supplementaires:');

// Vérifier si le background script utilise ES6 modules
const backgroundPath = path.join('dist', 'background', 'index.js');
if (fs.existsSync(backgroundPath)) {
  const backgroundContent = fs.readFileSync(backgroundPath, 'utf8');
  if (backgroundContent.includes('import ') || backgroundContent.includes('export ')) {
    console.log('[ATTENTION] Le background script contient du code ES6 (import/export)');
    console.log('   Assurez-vous que type:"module" est defini dans manifest.json');
  }
}

// Résumé
console.log('\n' + '='.repeat(50));
if (allFilesPresent && errors.length === 0) {
  console.log('[SUCCES] L\'extension semble prete a etre chargee dans Chrome!');
  console.log('\nPour charger l\'extension:');
  console.log('1. Ouvrir chrome://extensions/');
  console.log('2. Activer le "Mode developpeur"');
  console.log('3. Cliquer sur "Charger l\'extension non empaquetee"');
  console.log(`4. Selectionner le dossier: ${path.resolve('dist')}`);
} else {
  console.log('[ECHEC] Des problemes ont ete detectes:');
  errors.forEach(error => console.log(`   - ${error}`));
  console.log('\nCorrigez ces problemes avant de charger l\'extension.');
}