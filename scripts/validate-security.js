#!/usr/bin/env node
/**
 * Script de validation de sécurité SYMBIONT
 * Vérifie qu'aucun secret n'est hardcodé dans le code
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SECURITY_ISSUES = {
  HARDCODED_SECRETS: 'hardcoded_secrets',
  WEAK_KEYS: 'weak_keys',
  INSECURE_PATTERNS: 'insecure_patterns'
};

const WEAK_SECRETS = [
  'symbiont-dev-secret-key-change-in-production',
  'symbiont-refresh-secret-key',
  'demo-key',
  'symbiont-admin',
  'password',
  'secret',
  '123456',
  'admin',
  'test'
];

const INSECURE_PATTERNS = [
  /process\.env\.\w+\s*\|\|\s*['"]/g, // process.env.VAR || 'fallback'
  /['"](password|secret|key|token)['"]:\s*['"]\w+['"]/gi, // "password": "value"
  /Math\.random\(\)/g, // Math.random() pour métriques
  /console\.log\(/g // console.log en production
];

const INCLUDE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const EXCLUDE_DIRS = ['node_modules', 'dist', 'build', '.git', 'coverage', '__tests__'];

class SecurityValidator {
  constructor() {
    this.issues = [];
    this.filesScanned = 0;
    this.startTime = Date.now();
  }

  validateFile(filePath) {
    if (!this.shouldScanFile(filePath)) return;

    const content = fs.readFileSync(filePath, 'utf8');
    this.filesScanned++;

    // 1. Recherche de secrets hardcodés
    this.checkHardcodedSecrets(filePath, content);

    // 2. Recherche de patterns insécurisés
    this.checkInsecurePatterns(filePath, content);

    // 3. Vérification spécifique pour les fichiers de configuration
    if (filePath.includes('.env') || filePath.includes('config')) {
      this.checkConfigurationSecurity(filePath, content);
    }
  }

  checkHardcodedSecrets(filePath, content) {
    WEAK_SECRETS.forEach(secret => {
      if (content.includes(secret)) {
        this.issues.push({
          type: SECURITY_ISSUES.HARDCODED_SECRETS,
          level: 'CRITICAL',
          file: filePath,
          issue: `Secret hardcodé détecté: "${secret}"`,
          line: this.findLineNumber(content, secret)
        });
      }
    });

    // Recherche de patterns de secrets
    const secretPatterns = [
      /['"][A-Za-z0-9+/]{20,}['"]/, // Base64 potentiel
      /['"][a-f0-9]{32,}['"]/, // Hash hexadécimal
      /sk_[a-zA-Z0-9]{24,}/, // Clés API Stripe-like
      /ghp_[a-zA-Z0-9]{36}/, // GitHub Personal Access Token
      /xoxb-[a-zA-Z0-9-]/, // Slack Bot Token
    ];

    secretPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          this.issues.push({
            type: SECURITY_ISSUES.HARDCODED_SECRETS,
            level: 'HIGH',
            file: filePath,
            issue: `Pattern de secret potentiel détecté: "${match.slice(0, 20)}..."`,
            line: this.findLineNumber(content, match)
          });
        });
      }
    });
  }

  checkInsecurePatterns(filePath, content) {
    INSECURE_PATTERNS.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          let level = 'MEDIUM';
          let description = `Pattern insécurisé: ${match}`;

          if (match.includes('Math.random()')) {
            level = 'HIGH';
            description = 'Utilisation de Math.random() pour métriques (non cryptographiquement sécurisé)';
          }

          if (match.includes('process.env') && match.includes('||')) {
            level = 'CRITICAL';
            description = 'Variable d\'environnement avec fallback hardcodé';
          }

          this.issues.push({
            type: SECURITY_ISSUES.INSECURE_PATTERNS,
            level,
            file: filePath,
            issue: description,
            line: this.findLineNumber(content, match)
          });
        });
      }
    });
  }

  checkConfigurationSecurity(filePath, content) {
    // Vérifier les fichiers .env pour les valeurs par défaut faibles
    if (filePath.includes('.env') && !filePath.includes('.example')) {
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.includes('=') && !line.startsWith('#')) {
          const [key, value] = line.split('=');
          if (value && WEAK_SECRETS.some(weak => value.includes(weak))) {
            this.issues.push({
              type: SECURITY_ISSUES.WEAK_KEYS,
              level: 'CRITICAL',
              file: filePath,
              issue: `Clé faible dans fichier .env: ${key}`,
              line: index + 1
            });
          }
        }
      });
    }
  }

  findLineNumber(content, searchString) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(searchString)) {
        return i + 1;
      }
    }
    return 1;
  }

  shouldScanFile(filePath) {
    // Vérifier l'extension
    const ext = path.extname(filePath);
    if (!INCLUDE_EXTENSIONS.includes(ext)) return false;

    // Exclure certains répertoires
    const relativePath = path.relative(process.cwd(), filePath);
    for (const excludeDir of EXCLUDE_DIRS) {
      if (relativePath.includes(excludeDir)) return false;
    }

    return true;
  }

  scanDirectory(dirPath) {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!EXCLUDE_DIRS.includes(item)) {
          this.scanDirectory(fullPath);
        }
      } else if (stat.isFile()) {
        this.validateFile(fullPath);
      }
    }
  }

  generateReport() {
    const duration = Date.now() - this.startTime;
    const issuesByLevel = this.groupIssuesByLevel();

    console.log('\n🔍 RAPPORT DE VALIDATION SÉCURITÉ SYMBIONT\n');
    console.log(`📊 Fichiers scannés: ${this.filesScanned}`);
    console.log(`⏱️  Durée: ${duration}ms`);
    console.log(`🔍 Issues détectées: ${this.issues.length}\n`);

    if (this.issues.length === 0) {
      console.log('✅ AUCUN PROBLÈME DE SÉCURITÉ DÉTECTÉ');
      console.log('🎉 Le code respecte les standards de sécurité!\n');
      return true;
    }

    // Rapport détaillé par niveau
    Object.keys(issuesByLevel).forEach(level => {
      const issues = issuesByLevel[level];
      const emoji = level === 'CRITICAL' ? '🔴' : level === 'HIGH' ? '🟡' : '🟠';
      
      console.log(`${emoji} ${level} (${issues.length} issues):`);
      issues.forEach(issue => {
        console.log(`  📁 ${issue.file}:${issue.line}`);
        console.log(`     ${issue.issue}\n`);
      });
    });

    // Recommandations
    this.generateRecommendations(issuesByLevel);

    return Object.keys(issuesByLevel).includes('CRITICAL') ? false : true;
  }

  groupIssuesByLevel() {
    return this.issues.reduce((groups, issue) => {
      if (!groups[issue.level]) groups[issue.level] = [];
      groups[issue.level].push(issue);
      return groups;
    }, {});
  }

  generateRecommendations(issuesByLevel) {
    console.log('💡 RECOMMANDATIONS:\n');

    if (issuesByLevel.CRITICAL) {
      console.log('🔴 ACTIONS IMMÉDIATES (BLOQUANT):');
      console.log('   1. Supprimer tous les secrets hardcodés');
      console.log('   2. Utiliser des variables d\'environnement sécurisées');
      console.log('   3. Générer de nouvelles clés cryptographiquement sécurisées');
      console.log('   4. Auditer tous les accès avec ces clés compromises\n');
    }

    if (issuesByLevel.HIGH) {
      console.log('🟡 ACTIONS PRIORITAIRES:');
      console.log('   1. Remplacer Math.random() par crypto.getRandomValues()');
      console.log('   2. Implémenter des métriques de performance réelles');
      console.log('   3. Revoir les patterns de sécurité dans le code\n');
    }

    if (issuesByLevel.MEDIUM) {
      console.log('🟠 AMÉLIORATIONS RECOMMANDÉES:');
      console.log('   1. Nettoyer les console.log en production');
      console.log('   2. Améliorer la validation des entrées');
      console.log('   3. Documenter les choix de sécurité\n');
    }

    console.log('📚 RESSOURCES:');
    console.log('   • Guide sécurité: docs/securite-rgpd.md');
    console.log('   • Exemple .env: .env.production.example');
    console.log('   • Plan production: docs/production-deployment-plan-v2.md\n');
  }

  checkEnvironmentVariables() {
    console.log('🔧 VALIDATION VARIABLES D\'ENVIRONNEMENT:\n');

    const requiredVars = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'SYMBIONT_API_KEY',
      'ADMIN_API_KEY'
    ];

    const missingVars = [];
    const weakVars = [];

    requiredVars.forEach(varName => {
      const value = process.env[varName];
      
      if (!value) {
        missingVars.push(varName);
      } else {
        // Vérifier la force de la variable
        if (value.length < 32) {
          weakVars.push(`${varName} (longueur: ${value.length})`);
        }
        
        if (WEAK_SECRETS.some(weak => value.includes(weak))) {
          weakVars.push(`${varName} (valeur faible détectée)`);
        }
      }
    });

    if (missingVars.length > 0) {
      console.log('❌ Variables manquantes:');
      missingVars.forEach(v => console.log(`   • ${v}`));
      console.log('');
    }

    if (weakVars.length > 0) {
      console.log('⚠️  Variables faibles:');
      weakVars.forEach(v => console.log(`   • ${v}`));
      console.log('');
    }

    if (missingVars.length === 0 && weakVars.length === 0) {
      console.log('✅ Toutes les variables d\'environnement sont configurées et sécurisées\n');
      return true;
    }

    return false;
  }
}

// Exécution du script
function main() {
  console.log('🛡️  DÉMARRAGE VALIDATION SÉCURITÉ SYMBIONT...\n');

  const validator = new SecurityValidator();
  
  // Scanner le code source
  validator.scanDirectory(process.cwd());
  
  // Générer le rapport
  const codeSecure = validator.generateReport();
  
  // Vérifier les variables d'environnement
  const envSecure = validator.checkEnvironmentVariables();
  
  // Résultat final
  const overallSecure = codeSecure && envSecure;
  
  if (overallSecure) {
    console.log('🎉 VALIDATION SÉCURITÉ RÉUSSIE');
    console.log('✅ Le projet est prêt pour la production\n');
    process.exit(0);
  } else {
    console.log('🚨 VALIDATION SÉCURITÉ ÉCHOUÉE');
    console.log('❌ Des problèmes critiques doivent être résolus avant la production\n');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { SecurityValidator, SECURITY_ISSUES };