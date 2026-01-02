#!/usr/bin/env node
/**
 * Script de test interactif pour l'extension SYMBIONT avec dev-browser
 *
 * Ce script permet de:
 * - Charger l'extension dans un navigateur
 * - Tester l'interface popup
 * - Vérifier le rendu WebGL des organismes
 * - Interagir avec les fonctionnalités en temps réel
 * - Déboguer visuellement les problèmes
 *
 * Utilisation:
 * 1. Construire l'extension: npm run build
 * 2. Lancer le test: node test-dev-browser.js
 * 3. Utiliser /dev-browser dans Claude pour automatiser les interactions
 */

const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
  extensionPath: path.join(__dirname, 'dist'),
  testUrl: 'https://example.com',
  popupPath: '/popup/index.html',
  timeout: 60000,
  screenshots: {
    enabled: true,
    path: path.join(__dirname, 'test-results', 'dev-browser')
  }
};

// Vérifier que l'extension est construite
function checkExtensionBuild() {
  console.log('🔍 Vérification du build de l\'extension...');

  const requiredFiles = [
    'manifest.json',
    'popup/index.html',
    'popup/index.js',
    'background/index.js',
    'content/index.js'
  ];

  const missingFiles = [];
  for (const file of requiredFiles) {
    const filePath = path.join(CONFIG.extensionPath, file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  }

  if (missingFiles.length > 0) {
    console.error('❌ Fichiers manquants dans dist/:', missingFiles);
    console.log('💡 Lancez "npm run build" avant de tester');
    process.exit(1);
  }

  console.log('✅ Extension prête pour le test');
}

// Instructions pour dev-browser
function printInstructions() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 INSTRUCTIONS POUR DEV-BROWSER');
  console.log('='.repeat(60));

  console.log('\n🚀 ÉTAPES DE TEST:\n');

  console.log('1. CHARGER L\'EXTENSION:');
  console.log('   - Ouvrir chrome://extensions');
  console.log('   - Activer le "Mode développeur"');
  console.log('   - Cliquer "Charger l\'extension décompressée"');
  console.log(`   - Sélectionner: ${CONFIG.extensionPath}`);

  console.log('\n2. TESTER LE POPUP:');
  console.log('   - Cliquer sur l\'icône SYMBIONT dans la barre d\'outils');
  console.log('   - Vérifier le rendu de l\'interface React');
  console.log('   - Observer la visualisation WebGL de l\'organisme');

  console.log('\n3. TESTS INTERACTIFS:');
  console.log('   a) Dashboard:');
  console.log('      - Vérifier les statistiques de l\'organisme');
  console.log('      - Tester les boutons d\'interaction');
  console.log('      - Observer les animations WebGL');

  console.log('   b) Évolution:');
  console.log('      - Déclencher une mutation');
  console.log('      - Observer les changements visuels');
  console.log('      - Vérifier les particules GPU');

  console.log('   c) Social:');
  console.log('      - Tester le partage P2P');
  console.log('      - Vérifier les codes d\'invitation');

  console.log('\n4. TESTS CONTENT SCRIPT:');
  console.log(`   - Naviguer vers ${CONFIG.testUrl}`);
  console.log('   - Ouvrir la console (F12)');
  console.log('   - Vérifier window.SYMBIONT');
  console.log('   - Observer la collecte comportementale');

  console.log('\n5. PERFORMANCE WEBGL:');
  console.log('   - Ouvrir chrome://gpu');
  console.log('   - Vérifier l\'accélération matérielle');
  console.log('   - Dans le popup, observer:');
  console.log('     • FPS counter');
  console.log('     • Memory usage');
  console.log('     • Draw calls');

  console.log('\n6. DÉBOGAGE:');
  console.log('   - Clic droit sur popup → "Inspecter"');
  console.log('   - Console pour voir les logs');
  console.log('   - Network pour les requêtes API');
  console.log('   - Performance pour profiler WebGL');

  console.log('\n' + '='.repeat(60));
}

// Générer un rapport de test
function generateTestChecklist() {
  const checklist = `
# SYMBIONT Extension Test Checklist

## 📦 Build & Installation
- [ ] Extension builds successfully
- [ ] All required files present in dist/
- [ ] Extension loads in Chrome without errors
- [ ] Icon appears in toolbar

## 🎨 Popup Interface
- [ ] Popup opens when clicking icon
- [ ] React app renders correctly
- [ ] No console errors
- [ ] Responsive layout works

## 🌐 WebGL Visualization
- [ ] Canvas element renders
- [ ] WebGL context initializes
- [ ] Organism renders with correct shader
- [ ] Animations run smoothly (>30 FPS)
- [ ] No WebGL errors in console

## 🧬 Organism Features
- [ ] Energy display updates
- [ ] Traits visualization works
- [ ] Mutations trigger visual changes
- [ ] Generation counter increments
- [ ] Neural network activity visible

## ⚡ Particle System
- [ ] Particles spawn correctly
- [ ] Physics simulation works
- [ ] GPU acceleration active
- [ ] No performance degradation

## 🔄 Background Service Worker
- [ ] Service worker registers
- [ ] Message passing works
- [ ] Storage operations succeed
- [ ] No memory leaks detected

## 📝 Content Script
- [ ] Injects on all pages
- [ ] DOM observation active
- [ ] Behavioral data collected
- [ ] No page interference

## 🚀 Performance Metrics
- [ ] FPS: ___ (target: >30)
- [ ] Memory: ___ MB (target: <100MB)
- [ ] Draw calls: ___ (target: <100)
- [ ] Load time: ___ ms (target: <2000ms)

## 🐛 Issues Found
1.
2.
3.

## 📸 Screenshots Taken
- [ ] Popup default state
- [ ] WebGL organism view
- [ ] Mutation animation
- [ ] Error states (if any)

Date: ${new Date().toISOString()}
Tester: dev-browser
`;

  const checklistPath = path.join(__dirname, 'test-results', 'test-checklist.md');
  fs.mkdirSync(path.dirname(checklistPath), { recursive: true });
  fs.writeFileSync(checklistPath, checklist);

  console.log(`\n📝 Checklist sauvegardée: ${checklistPath}`);
}

// Script principal
async function main() {
  console.log('🧬 SYMBIONT Extension - Test avec dev-browser');
  console.log('='.repeat(60));

  // Vérifications
  checkExtensionBuild();

  // Créer le dossier de screenshots
  if (CONFIG.screenshots.enabled) {
    fs.mkdirSync(CONFIG.screenshots.path, { recursive: true });
    console.log(`📸 Screenshots seront sauvegardés dans: ${CONFIG.screenshots.path}`);
  }

  // Afficher les instructions
  printInstructions();

  // Générer la checklist
  generateTestChecklist();

  console.log('\n💡 COMMANDES UTILES POUR DEV-BROWSER:\n');
  console.log('// Charger une page spécifique');
  console.log(`navigate("chrome-extension://<EXTENSION_ID>${CONFIG.popupPath}")`);
  console.log('');
  console.log('// Prendre un screenshot');
  console.log('screenshot("symbiont-popup.png")');
  console.log('');
  console.log('// Exécuter du JavaScript dans la page');
  console.log('evaluate(() => window.SYMBIONT)');
  console.log('');
  console.log('// Cliquer sur un élément');
  console.log('click("#mutate-button")');
  console.log('');
  console.log('// Attendre un élément');
  console.log('waitForSelector("canvas")');
  console.log('');
  console.log('// Vérifier les performances WebGL');
  console.log('evaluate(() => {');
  console.log('  const canvas = document.querySelector("canvas");');
  console.log('  const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");');
  console.log('  return {');
  console.log('    renderer: gl.getParameter(gl.RENDERER),');
  console.log('    vendor: gl.getParameter(gl.VENDOR),');
  console.log('    version: gl.getParameter(gl.VERSION)');
  console.log('  };');
  console.log('})');

  console.log('\n🎯 Utilisez /dev-browser dans Claude pour lancer le test interactif!');
  console.log('='.repeat(60));
}

// Gestion des erreurs
process.on('unhandledRejection', (error) => {
  console.error('❌ Erreur non gérée:', error);
  process.exit(1);
});

// Lancer le script
main().catch(error => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});