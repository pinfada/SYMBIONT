#!/usr/bin/env node

/**
 * Script de validation d'environnement production
 * Vérifie que toutes les variables critiques sont configurées
 */

const fs = require('fs');
const path = require('path');

// Configuration des variables requises
const REQUIRED_VARS = {
  // Sécurité critique
  JWT_SECRET: { minLength: 64, description: 'JWT secret principal' },
  JWT_REFRESH_SECRET: { minLength: 64, description: 'JWT refresh secret' },
  SYMBIONT_API_KEY: { minLength: 32, description: 'Clé API Symbiont' },
  ADMIN_API_KEY: { minLength: 32, description: 'Clé API admin' },
  ENCRYPTION_KEY: { minLength: 32, description: 'Clé de chiffrement' },
  
  // Configuration application
  NODE_ENV: { 
    values: ['development', 'staging', 'production'], 
    description: 'Environnement application' 
  },
  SYMBIONT_API_URL: { pattern: /^https?:\/\//, description: 'URL API Symbiont' },
  DATABASE_URL: { pattern: /^postgresql:\/\//, description: 'URL base de données' },
  
  // Configuration serveur
  PORT: { type: 'number', min: 1000, max: 65535, description: 'Port serveur' },
  CORS_ORIGIN: { pattern: /^https?:\/\//, description: 'Origine CORS' }
};

// Variables optionnelles recommandées
const RECOMMENDED_VARS = {
  LOG_LEVEL: { values: ['error', 'warn', 'info', 'debug'], description: 'Niveau de log' },
  RATE_LIMIT_MAX_REQUESTS: { type: 'number', min: 10, description: 'Limite requêtes' },
  ENABLE_METRICS: { values: ['true', 'false'], description: 'Activation métriques' }
};

// Variables dangereuses à éviter en production
const DANGEROUS_VARS = [
  'DEBUG',
  'ENABLE_DEBUG_LOGGING',
  'DISABLE_SSL_VERIFICATION',
  'SKIP_AUTH'
];

/**
 * Charge les variables d'environnement depuis .env
 */
function loadEnvironment() {
  const envPath = path.join(process.cwd(), '.env');
  const env = { ...process.env };
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#][^=]*?)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        env[key.trim()] = value.trim();
      }
    });
  }
  
  return env;
}

/**
 * Valide une variable d'environnement
 */
function validateVariable(name, value, config) {
  const errors = [];
  
  if (!value) {
    errors.push(`Variable ${name} manquante`);
    return { valid: false, errors };
  }
  
  // Vérification longueur minimale
  if (config.minLength && value.length < config.minLength) {
    errors.push(`${name} trop court (${value.length} < ${config.minLength})`);
  }
  
  // Vérification valeurs autorisées
  if (config.values && !config.values.includes(value)) {
    errors.push(`${name} valeur invalide. Autorisées: ${config.values.join(', ')}`);
  }
  
  // Vérification pattern regex
  if (config.pattern && !config.pattern.test(value)) {
    errors.push(`${name} format invalide`);
  }
  
  // Vérification type numérique
  if (config.type === 'number') {
    const num = parseInt(value);
    if (isNaN(num)) {
      errors.push(`${name} doit être un nombre`);
    } else {
      if (config.min && num < config.min) {
        errors.push(`${name} trop petit (${num} < ${config.min})`);
      }
      if (config.max && num > config.max) {
        errors.push(`${name} trop grand (${num} > ${config.max})`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Vérifie la sécurité d'une variable
 */
function checkSecurity(name, value) {
  const warnings = [];
  
  // Détection de valeurs par défaut dangereuses
  const dangerousDefaults = [
    'changeme',
    'password',
    'secret',
    'key',
    '123456',
    'admin',
    'test'
  ];
  
  if (dangerousDefaults.some(def => value.toLowerCase().includes(def))) {
    warnings.push(`${name} contient une valeur par défaut dangereuse`);
  }
  
  // Vérification entropie (simple)
  const uniqueChars = new Set(value.toLowerCase()).size;
  if (value.length > 20 && uniqueChars < 6) {
    warnings.push(`${name} manque d'entropie (${uniqueChars} caractères uniques)`);
  }
  
  return warnings;
}

/**
 * Génère un rapport de validation
 */
function generateReport(env) {
  const report = {
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV || 'unknown',
    status: 'unknown',
    errors: [],
    warnings: [],
    recommendations: [],
    summary: {
      required: { passed: 0, failed: 0 },
      recommended: { passed: 0, missing: 0 },
      dangerous: { found: 0 }
    }
  };
  
  // Validation des variables requises
  console.log('🔍 Validation des variables requises...');
  Object.entries(REQUIRED_VARS).forEach(([name, config]) => {
    const value = env[name];
    const validation = validateVariable(name, value, config);
    
    if (validation.valid) {
      console.log(`  ✅ ${name}: OK`);
      report.summary.required.passed++;
      
      // Vérifications sécurité supplémentaires
      const securityWarnings = checkSecurity(name, value);
      report.warnings.push(...securityWarnings);
      
    } else {
      console.log(`  ❌ ${name}: ${validation.errors.join(', ')}`);
      report.errors.push(...validation.errors);
      report.summary.required.failed++;
    }
  });
  
  // Validation des variables recommandées
  console.log('\n🔍 Validation des variables recommandées...');
  Object.entries(RECOMMENDED_VARS).forEach(([name, config]) => {
    const value = env[name];
    
    if (value) {
      const validation = validateVariable(name, value, config);
      if (validation.valid) {
        console.log(`  ✅ ${name}: OK`);
        report.summary.recommended.passed++;
      } else {
        console.log(`  ⚠️  ${name}: ${validation.errors.join(', ')}`);
        report.warnings.push(...validation.errors);
      }
    } else {
      console.log(`  ⚠️  ${name}: Non définie (recommandée)`);
      report.summary.recommended.missing++;
      report.recommendations.push(`Définir ${name}: ${config.description}`);
    }
  });
  
  // Détection de variables dangereuses
  console.log('\n🔍 Détection de variables dangereuses...');
  DANGEROUS_VARS.forEach(name => {
    if (env[name] && env[name].toLowerCase() === 'true') {
      console.log(`  ⚠️  ${name}: ACTIVÉ (dangereux en production)`);
      report.warnings.push(`Variable dangereuse ${name} activée`);
      report.summary.dangerous.found++;
    }
  });
  
  // Détermination du statut global
  if (report.summary.required.failed > 0) {
    report.status = 'CRITICAL';
  } else if (report.warnings.length > 0 || report.summary.dangerous.found > 0) {
    report.status = 'WARNING';
  } else {
    report.status = 'PASS';
  }
  
  return report;
}

/**
 * Affiche le résumé du rapport
 */
function displaySummary(report) {
  console.log('\n📊 Résumé de validation:');
  console.log(`  Statut global: ${getStatusIcon(report.status)} ${report.status}`);
  console.log(`  Variables requises: ${report.summary.required.passed}/${report.summary.required.passed + report.summary.required.failed}`);
  console.log(`  Variables recommandées: ${report.summary.recommended.passed} définies, ${report.summary.recommended.missing} manquantes`);
  console.log(`  Variables dangereuses: ${report.summary.dangerous.found} trouvées`);
  
  if (report.errors.length > 0) {
    console.log('\n❌ Erreurs critiques:');
    report.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  if (report.warnings.length > 0) {
    console.log('\n⚠️  Avertissements:');
    report.warnings.forEach(warning => console.log(`  - ${warning}`));
  }
  
  if (report.recommendations.length > 0) {
    console.log('\n💡 Recommandations:');
    report.recommendations.forEach(rec => console.log(`  - ${rec}`));
  }
}

/**
 * Icône selon le statut
 */
function getStatusIcon(status) {
  switch (status) {
    case 'PASS': return '✅';
    case 'WARNING': return '⚠️';
    case 'CRITICAL': return '❌';
    default: return '❓';
  }
}

/**
 * Sauvegarde le rapport
 */
function saveReport(report) {
  const reportPath = path.join(process.cwd(), 'environment-validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Rapport sauvegardé: ${reportPath}`);
}

/**
 * Fonction principale
 */
function main() {
  console.log('🚀 Validation environnement production SYMBIONT\n');
  
  try {
    // Charger l'environnement
    const env = loadEnvironment();
    console.log(`📍 Environnement: ${env.NODE_ENV || 'non défini'}\n`);
    
    // Générer le rapport
    const report = generateReport(env);
    
    // Afficher le résumé
    displaySummary(report);
    
    // Sauvegarder le rapport
    saveReport(report);
    
    // Code de sortie selon le statut
    if (report.status === 'CRITICAL') {
      console.log('\n💥 Configuration non prête pour la production!');
      process.exit(1);
    } else if (report.status === 'WARNING') {
      console.log('\n⚠️  Configuration avec avertissements - révision recommandée');
      process.exit(0);
    } else {
      console.log('\n✨ Configuration validée pour la production!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n❌ Erreur lors de la validation:', error.message);
    process.exit(1);
  }
}

// Exécution du script
if (require.main === module) {
  main();
}