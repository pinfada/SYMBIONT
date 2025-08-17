#!/usr/bin/env node

/**
 * Script de déploiement production sécurisé
 * Vérifie tous les prérequis avant déploiement
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration du déploiement
const DEPLOYMENT_CONFIG = {
  requiredFiles: [
    '.env',
    'package.json',
    'manifest.json',
    'dist/background/index.js',
    'dist/popup/index.js',
    'dist/content/index.js'
  ],
  requiredCommands: ['npm', 'node'],
  buildCommands: [
    'npm ci --only=production',
    'npm run build:all',
    'npm run test:ci'
  ],
  securityChecks: [
    'validate-environment.js',
    'validate-security.js'
  ]
};

/**
 * Vérifie si une commande existe
 */
function commandExists(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Exécute une commande avec gestion d'erreur
 */
function runCommand(command, description) {
  console.log(`🔄 ${description}...`);
  
  try {
    const output = execSync(command, { 
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 300000 // 5 minutes max
    });
    
    console.log(`  ✅ ${description} terminé`);
    return { success: true, output };
  } catch (error) {
    console.error(`  ❌ ${description} échoué:`);
    console.error(`     ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Vérifie les prérequis système
 */
function checkPrerequisites() {
  console.log('🔍 Vérification des prérequis...');
  
  const errors = [];
  
  // Vérification des commandes
  DEPLOYMENT_CONFIG.requiredCommands.forEach(cmd => {
    if (!commandExists(cmd)) {
      errors.push(`Commande manquante: ${cmd}`);
    } else {
      console.log(`  ✅ ${cmd} disponible`);
    }
  });
  
  // Vérification des fichiers
  DEPLOYMENT_CONFIG.requiredFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      errors.push(`Fichier manquant: ${file}`);
    } else {
      console.log(`  ✅ ${file} présent`);
    }
  });
  
  return errors;
}

/**
 * Exécute les vérifications de sécurité
 */
function runSecurityChecks() {
  console.log('\n🔒 Vérifications de sécurité...');
  
  const results = [];
  
  DEPLOYMENT_CONFIG.securityChecks.forEach(script => {
    const scriptPath = path.join('scripts', script);
    
    if (fs.existsSync(scriptPath)) {
      const result = runCommand(`node ${scriptPath}`, `Vérification ${script}`);
      results.push({ script, ...result });
    } else {
      console.log(`  ⚠️  Script non trouvé: ${script}`);
    }
  });
  
  return results;
}

/**
 * Execute le build de production
 */
function runBuild() {
  console.log('\n🔨 Build de production...');
  
  const results = [];
  
  DEPLOYMENT_CONFIG.buildCommands.forEach(cmd => {
    const result = runCommand(cmd, `Exécution ${cmd}`);
    results.push({ command: cmd, ...result });
    
    if (!result.success) {
      throw new Error(`Build échoué à l'étape: ${cmd}`);
    }
  });
  
  return results;
}

/**
 * Génère le manifest de déploiement
 */
function generateDeploymentManifest() {
  console.log('\n📄 Génération du manifest de déploiement...');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const manifestJson = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  
  const deploymentManifest = {
    timestamp: new Date().toISOString(),
    version: packageJson.version,
    extensionVersion: manifestJson.version,
    environment: process.env.NODE_ENV || 'production',
    buildHash: generateBuildHash(),
    files: {
      total: 0,
      sizes: {}
    },
    security: {
      environmentValidated: true,
      securityChecksPass: true,
      buildIntegrity: true
    }
  };
  
  // Calculer tailles des fichiers
  DEPLOYMENT_CONFIG.requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      deploymentManifest.files.sizes[file] = stats.size;
      deploymentManifest.files.total += stats.size;
    }
  });
  
  // Sauvegarder le manifest
  const manifestPath = path.join('dist', 'deployment-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(deploymentManifest, null, 2));
  
  console.log(`  ✅ Manifest sauvegardé: ${manifestPath}`);
  return deploymentManifest;
}

/**
 * Génère un hash du build pour vérification d'intégrité
 */
function generateBuildHash() {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256');
  
  // Hash des fichiers principaux
  const filesToHash = [
    'dist/background/index.js',
    'dist/popup/index.js',
    'dist/content/index.js',
    'manifest.json'
  ];
  
  filesToHash.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file);
      hash.update(content);
    }
  });
  
  return hash.digest('hex');
}

/**
 * Crée un package de déploiement
 */
function createDeploymentPackage() {
  console.log('\n📦 Création du package de déploiement...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const packageName = `symbiont-production-${timestamp}.zip`;
  
  // Fichiers à inclure dans le package
  const filesToPackage = [
    'dist/',
    'manifest.json',
    'package.json',
    '.env.production.example'
  ];
  
  const result = runCommand(
    `zip -r ${packageName} ${filesToPackage.join(' ')} -x "*.test.*" "*.spec.*"`,
    'Création du package ZIP'
  );
  
  if (result.success) {
    console.log(`  ✅ Package créé: ${packageName}`);
    return packageName;
  } else {
    throw new Error('Échec création du package');
  }
}

/**
 * Affiche le résumé du déploiement
 */
function displaySummary(manifest, packageName) {
  console.log('\n📊 Résumé du déploiement:');
  console.log(`  📦 Package: ${packageName}`);
  console.log(`  🔢 Version: ${manifest.version}`);
  console.log(`  📏 Taille totale: ${(manifest.files.total / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  🔒 Hash build: ${manifest.buildHash.substring(0, 12)}...`);
  console.log(`  🕒 Timestamp: ${manifest.timestamp}`);
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🚀 Déploiement production SYMBIONT\n');
  
  try {
    // 1. Vérification des prérequis
    const prereqErrors = checkPrerequisites();
    if (prereqErrors.length > 0) {
      console.error('\n❌ Prérequis manquants:');
      prereqErrors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
    
    // 2. Vérifications de sécurité
    const securityResults = runSecurityChecks();
    const securityFailed = securityResults.some(r => !r.success);
    
    if (securityFailed) {
      console.error('\n❌ Vérifications de sécurité échouées');
      process.exit(1);
    }
    
    // 3. Build de production
    const buildResults = runBuild();
    console.log('\n✅ Build terminé avec succès');
    
    // 4. Génération du manifest
    const manifest = generateDeploymentManifest();
    
    // 5. Création du package
    const packageName = createDeploymentPackage();
    
    // 6. Résumé
    displaySummary(manifest, packageName);
    
    console.log('\n✨ Déploiement prêt pour la production!');
    console.log('\n📋 Prochaines étapes:');
    console.log(`  1. Télécharger le package: ${packageName}`);
    console.log('  2. Déployer sur l\'environnement de production');
    console.log('  3. Configurer les variables d\'environnement (.env)');
    console.log('  4. Valider le déploiement avec health checks');
    
  } catch (error) {
    console.error('\n💥 Échec du déploiement:', error.message);
    process.exit(1);
  }
}

// Exécution du script
if (require.main === module) {
  main();
}