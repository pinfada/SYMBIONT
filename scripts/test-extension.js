#!/usr/bin/env node
// Script pour tester manuellement l'extension

const fs = require('fs');
const path = require('path');

function validateExtension() {
  console.log('Validation de l\'extension SYMBIONT...\n');
  
  const distPath = path.resolve(__dirname, '../dist');
  const manifestPath = path.join(distPath, 'manifest.json');
  const popupPath = path.join(distPath, 'popup/index.html');
  const backgroundPath = path.join(distPath, 'background/index.js');
  const contentPath = path.join(distPath, 'content/index.js');
  
  // Vérifications des fichiers critiques
  const checks = [
    { name: 'Manifest', path: manifestPath },
    { name: 'Popup HTML', path: popupPath },
    { name: 'Background Script', path: backgroundPath },
    { name: 'Content Script', path: contentPath },
    { name: 'Popup JS', path: path.join(distPath, 'popup/index.js') },
    { name: 'Popup CSS', path: path.join(distPath, 'popup/index.css') }
  ];
  
  let allValid = true;
  
  checks.forEach(check => {
    if (fs.existsSync(check.path)) {
      const stats = fs.statSync(check.path);
      console.log(`OK ${check.name}: ${(stats.size / 1024).toFixed(1)}kb`);
    } else {
      console.log(`ERREUR ${check.name}: Fichier manquant`);
      allValid = false;
    }
  });
  
  // Validation du manifest
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      console.log(`\nManifest v${manifest.manifest_version}`);
      console.log(`   Nom: ${manifest.name}`);
      console.log(`   Version: ${manifest.version}`);
      console.log(`   Permissions: ${manifest.permissions?.length || 0}`);
      
      if (!manifest.background) {
        console.log('ATTENTION: Pas de service worker défini');
      }
      
      if (!manifest.action || !manifest.action.default_popup) {
        console.log('ATTENTION: Pas de popup défini');
      }
      
    } catch (error) {
      console.log('ERREUR Manifest invalide:', error.message);
      allValid = false;
    }
  }
  
  // Validation HTML du popup
  if (fs.existsSync(popupPath)) {
    const html = fs.readFileSync(popupPath, 'utf8');
    const hasRoot = html.includes('id="root"');
    const hasScript = html.includes('index.js');
    const hasCSS = html.includes('index.css');
    
    console.log(`\nPopup HTML:`);
    console.log(`   Root div: ${hasRoot ? 'OK' : 'ERREUR'}`);
    console.log(`   Script inclus: ${hasScript ? 'OK' : 'ERREUR'}`);
    console.log(`   CSS inclus: ${hasCSS ? 'OK' : 'ERREUR'}`);
    
    if (!hasRoot || !hasScript || !hasCSS) {
      allValid = false;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allValid) {
    console.log('SUCCESS: Extension prête pour les tests !');
    console.log('\nInstructions de test manuel:');
    console.log('1. Ouvrir Chrome et aller à chrome://extensions/');
    console.log('2. Activer le mode développeur');
    console.log('3. Cliquer "Charger l\'extension non empaquetée"');
    console.log(`4. Sélectionner le dossier: ${distPath}`);
    console.log('5. Tester le popup et les fonctionnalités');
    console.log('\nDebug:');
    console.log('- Console: F12 > Console');
    console.log('- Background: chrome://extensions/ > Inspecter les vues');
    console.log('- Popup: Clic droit sur popup > Inspecter');
  } else {
    console.log('ERREUR: Extension incomplète - lancer npm run build');
  }
}

validateExtension();