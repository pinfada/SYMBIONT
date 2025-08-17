#!/usr/bin/env node

/**
 * Audit final de sécurité SYMBIONT
 * Évaluation complète pour production
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration de l'audit
const AUDIT_CONFIG = {
  securityChecks: [
    'Math.random() usage',
    'console.log exposure', 
    'Hardcoded secrets',
    'Environment validation',
    'Crypto compliance',
    'Test coverage',
    'Build integrity'
  ],
  criticalFiles: [
    'src/shared/utils/secureRandom.ts',
    'src/shared/utils/secureLogger.ts',
    'src/background/SecurityManager.ts',
    'src/shared/config/EnvironmentConfig.ts'
  ],
  testDirectories: [
    '__tests__/security/',
    '__tests__/core/',
    '__tests__/performance/'
  ]
};

/**
 * Exécute une commande et retourne le résultat
 */
function runCommand(command, silent = true) {
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return { success: true, output: output.trim() };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout || '' };
  }
}

/**
 * Audit Math.random() usage
 */
function auditMathRandom() {
  console.log('🔍 Audit Math.random() usage...');
  
  const result = runCommand("grep -r 'Math\\.random' src/ --include='*.ts' --include='*.tsx' | wc -l");
  const count = parseInt(result.output) || 0;
  
  const status = count === 0 ? 'PASS' : count < 20 ? 'WARNING' : 'CRITICAL';
  
  console.log(`  📊 ${count} occurrences trouvées - Status: ${status}`);
  
  if (count > 0) {
    const details = runCommand("grep -r 'Math\\.random' src/ --include='*.ts' --include='*.tsx'");
    console.log('  📄 Détails:', details.output.split('\n').slice(0, 5).join('\n    '));
  }
  
  return {
    name: 'Math.random Usage',
    status,
    score: count === 0 ? 10 : Math.max(0, 10 - count),
    details: `${count} occurrences trouvées`,
    recommendations: count > 0 ? ['Migrer vers SecureRandom.random()'] : []
  };
}

/**
 * Audit console.log exposure
 */
function auditConsoleLog() {
  console.log('🔍 Audit console.log exposure...');
  
  const result = runCommand("grep -r 'console\\.log' src/ --include='*.ts' --include='*.tsx' | wc -l");
  const count = parseInt(result.output) || 0;
  
  const status = count === 0 ? 'PASS' : count < 10 ? 'WARNING' : 'CRITICAL';
  
  console.log(`  📊 ${count} occurrences trouvées - Status: ${status}`);
  
  return {
    name: 'Console.log Exposure',
    status,
    score: count === 0 ? 10 : Math.max(0, 10 - count),
    details: `${count} occurrences console.log`,
    recommendations: count > 0 ? ['Remplacer par logger sécurisé'] : []
  };
}

/**
 * Audit secrets hardcodés
 */
function auditHardcodedSecrets() {
  console.log('🔍 Audit secrets hardcodés...');
  
  const patterns = [
    'password.*=.*["\'].*["\']',
    'secret.*=.*["\'].*["\']',
    'key.*=.*["\'][A-Za-z0-9]{20,}["\']',
    'token.*=.*["\'].*["\']'
  ];
  
  let totalCount = 0;
  
  patterns.forEach(pattern => {
    const result = runCommand(`grep -r -E '${pattern}' src/ --include='*.ts' --include='*.tsx' | wc -l`);
    totalCount += parseInt(result.output) || 0;
  });
  
  const status = totalCount === 0 ? 'PASS' : totalCount < 5 ? 'WARNING' : 'CRITICAL';
  
  console.log(`  📊 ${totalCount} secrets potentiels trouvés - Status: ${status}`);
  
  return {
    name: 'Hardcoded Secrets',
    status,
    score: totalCount === 0 ? 10 : Math.max(0, 10 - totalCount * 2),
    details: `${totalCount} secrets potentiels détectés`,
    recommendations: totalCount > 0 ? ['Déplacer vers variables d\'environnement'] : []
  };
}

/**
 * Audit conformité cryptographique
 */
function auditCryptoCompliance() {
  console.log('🔍 Audit conformité cryptographique...');
  
  const checks = [
    { file: 'src/shared/utils/secureRandom.ts', description: 'SecureRandom implémenté' },
    { file: 'src/shared/utils/secureLogger.ts', description: 'SecureLogger implémenté' },
    { file: 'src/background/SecurityManager.ts', description: 'SecurityManager présent' }
  ];
  
  let passedChecks = 0;
  const results = [];
  
  checks.forEach(check => {
    const exists = fs.existsSync(check.file);
    if (exists) {
      passedChecks++;
      console.log(`  ✅ ${check.description}`);
    } else {
      console.log(`  ❌ ${check.description}`);
    }
    results.push({ ...check, passed: exists });
  });
  
  const status = passedChecks === checks.length ? 'PASS' : passedChecks >= 2 ? 'WARNING' : 'CRITICAL';
  
  return {
    name: 'Crypto Compliance',
    status,
    score: (passedChecks / checks.length) * 10,
    details: `${passedChecks}/${checks.length} vérifications crypto passées`,
    recommendations: results.filter(r => !r.passed).map(r => `Implémenter ${r.description}`)
  };
}

/**
 * Audit configuration environnement
 */
function auditEnvironmentConfig() {
  console.log('🔍 Audit configuration environnement...');
  
  const requiredFiles = [
    '.env.production.example',
    '.env.example', 
    'src/shared/config/EnvironmentConfig.ts'
  ];
  
  let foundFiles = 0;
  
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      foundFiles++;
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ❌ ${file}`);
    }
  });
  
  // Test du script de validation
  const validationResult = runCommand('node scripts/validate-environment.js');
  const validationWorks = validationResult.success || validationResult.output.includes('CRITICAL');
  
  if (validationWorks) {
    console.log('  ✅ Script validation fonctionne');
    foundFiles += 0.5;
  } else {
    console.log('  ❌ Script validation échoue');
  }
  
  const status = foundFiles >= 3.5 ? 'PASS' : foundFiles >= 2 ? 'WARNING' : 'CRITICAL';
  
  return {
    name: 'Environment Config',
    status,
    score: (foundFiles / 3.5) * 10,
    details: `Configuration environnement ${Math.round(foundFiles/3.5*100)}% complète`,
    recommendations: foundFiles < 3.5 ? ['Compléter configuration environnement'] : []
  };
}

/**
 * Audit coverage des tests
 */
function auditTestCoverage() {
  console.log('🔍 Audit coverage des tests...');
  
  // Test des modules de sécurité spécifiquement
  const securityTestResult = runCommand('npm test -- __tests__/security/ --passWithNoTests --coverage=false');
  const securityTestsPassing = securityTestResult.success;
  
  console.log(`  🧪 Tests sécurité: ${securityTestsPassing ? 'PASS' : 'FAIL'}`);
  
  // Vérification existence des tests
  const testFiles = [
    '__tests__/security/secureRandom.test.ts',
    '__tests__/security/secureLogger.test.ts'
  ];
  
  let existingTests = 0;
  testFiles.forEach(file => {
    if (fs.existsSync(file)) {
      existingTests++;
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ❌ ${file}`);
    }
  });
  
  const score = (existingTests / testFiles.length) * 5 + (securityTestsPassing ? 5 : 0);
  const status = score >= 9 ? 'PASS' : score >= 6 ? 'WARNING' : 'CRITICAL';
  
  return {
    name: 'Test Coverage',
    status,
    score,
    details: `${existingTests}/${testFiles.length} tests sécurité, execution ${securityTestsPassing ? 'OK' : 'KO'}`,
    recommendations: score < 9 ? ['Améliorer coverage tests sécurité'] : []
  };
}

/**
 * Audit intégrité du build
 */
function auditBuildIntegrity() {
  console.log('🔍 Audit intégrité du build...');
  
  const buildResult = runCommand('npm run build');
  const buildSuccess = buildResult.success;
  
  console.log(`  🔨 Build: ${buildSuccess ? 'SUCCESS' : 'FAIL'}`);
  
  // Vérification des fichiers de sortie
  const requiredOutputs = [
    'dist/background/index.js',
    'dist/popup/index.js', 
    'dist/content/index.js'
  ];
  
  let outputFiles = 0;
  requiredOutputs.forEach(file => {
    if (fs.existsSync(file)) {
      outputFiles++;
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ❌ ${file}`);
    }
  });
  
  const score = (buildSuccess ? 5 : 0) + (outputFiles / requiredOutputs.length) * 5;
  const status = score >= 9 ? 'PASS' : score >= 6 ? 'WARNING' : 'CRITICAL';
  
  return {
    name: 'Build Integrity',
    status,
    score,
    details: `Build ${buildSuccess ? 'OK' : 'KO'}, ${outputFiles}/${requiredOutputs.length} fichiers`,
    recommendations: score < 9 ? ['Corriger erreurs de build'] : []
  };
}

/**
 * Calcule le score global
 */
function calculateGlobalScore(results) {
  const totalScore = results.reduce((sum, result) => sum + result.score, 0);
  const maxScore = results.length * 10;
  const percentage = (totalScore / maxScore) * 100;
  
  let grade = 'F';
  if (percentage >= 95) grade = 'A+';
  else if (percentage >= 90) grade = 'A';
  else if (percentage >= 85) grade = 'B+';
  else if (percentage >= 80) grade = 'B';
  else if (percentage >= 75) grade = 'C+';
  else if (percentage >= 70) grade = 'C';
  else if (percentage >= 65) grade = 'D';
  
  return { score: totalScore, maxScore, percentage, grade };
}

/**
 * Génère les recommandations finales
 */
function generateRecommendations(results, globalScore) {
  const recommendations = [];
  
  // Recommandations critiques
  const criticalIssues = results.filter(r => r.status === 'CRITICAL');
  if (criticalIssues.length > 0) {
    recommendations.push({
      priority: 'CRITICAL',
      title: 'Problèmes critiques à résoudre avant production',
      actions: criticalIssues.flatMap(issue => issue.recommendations)
    });
  }
  
  // Recommandations warning
  const warningIssues = results.filter(r => r.status === 'WARNING');
  if (warningIssues.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      title: 'Améliorations recommandées',
      actions: warningIssues.flatMap(issue => issue.recommendations)
    });
  }
  
  // Recommandations basées sur le score global
  if (globalScore.percentage < 80) {
    recommendations.push({
      priority: 'MEDIUM',
      title: 'Améliorations générales',
      actions: [
        'Finaliser migration Math.random vers SecureRandom',
        'Compléter les tests de sécurité',
        'Valider configuration production'
      ]
    });
  }
  
  return recommendations;
}

/**
 * Affiche le rapport final
 */
function displayFinalReport(results, globalScore, recommendations) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 RAPPORT FINAL - AUDIT SÉCURITÉ SYMBIONT');
  console.log('='.repeat(60));
  
  console.log(`\n🎯 SCORE GLOBAL: ${globalScore.score}/${globalScore.maxScore} (${globalScore.percentage.toFixed(1)}%) - Grade ${globalScore.grade}`);
  
  console.log('\n📋 DÉTAIL PAR COMPOSANT:');
  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
    console.log(`  ${icon} ${result.name}: ${result.score.toFixed(1)}/10 (${result.status})`);
    console.log(`     ${result.details}`);
  });
  
  if (recommendations.length > 0) {
    console.log('\n💡 RECOMMANDATIONS:');
    recommendations.forEach(rec => {
      const priorityIcon = rec.priority === 'CRITICAL' ? '🚨' : rec.priority === 'HIGH' ? '⚠️' : '💡';
      console.log(`\n  ${priorityIcon} ${rec.title.toUpperCase()}`);
      rec.actions.forEach(action => console.log(`     - ${action}`));
    });
  }
  
  // Évaluation production-ready
  console.log('\n🚀 ÉVALUATION PRODUCTION:');
  if (globalScore.percentage >= 90) {
    console.log('  ✅ PRÊT POUR PRODUCTION');
    console.log('     Le projet répond aux standards de sécurité');
  } else if (globalScore.percentage >= 80) {
    console.log('  ⚠️  PRÊT AVEC RÉSERVES');
    console.log('     Quelques améliorations recommandées avant production');
  } else {
    console.log('  ❌ NON PRÊT POUR PRODUCTION');
    console.log('     Problèmes critiques à résoudre obligatoirement');
  }
}

/**
 * Sauvegarde le rapport
 */
function saveReport(results, globalScore, recommendations) {
  const report = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    globalScore,
    results,
    recommendations,
    productionReady: globalScore.percentage >= 80
  };
  
  const reportPath = path.join(process.cwd(), 'final-security-audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Rapport complet sauvegardé: ${reportPath}`);
}

/**
 * Fonction principale
 */
function main() {
  console.log('🚀 AUDIT FINAL DE SÉCURITÉ - SYMBIONT\n');
  
  const results = [
    auditMathRandom(),
    auditConsoleLog(),
    auditHardcodedSecrets(),
    auditCryptoCompliance(),
    auditEnvironmentConfig(),
    auditTestCoverage(),
    auditBuildIntegrity()
  ];
  
  const globalScore = calculateGlobalScore(results);
  const recommendations = generateRecommendations(results, globalScore);
  
  displayFinalReport(results, globalScore, recommendations);
  saveReport(results, globalScore, recommendations);
  
  // Code de sortie basé sur le score
  process.exit(globalScore.percentage >= 80 ? 0 : 1);
}

// Exécution du script
if (require.main === module) {
  main();
}