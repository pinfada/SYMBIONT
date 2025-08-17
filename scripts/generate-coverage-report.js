#!/usr/bin/env node

/**
 * Générateur de rapport de couverture modulaire pour SYMBIONT
 * Analyse la couverture par module (crypto, core, WebGL) avec heatmap visuelle
 */

const fs = require('fs');
const path = require('path');

// Configuration des modules à analyser
const MODULES = {
  crypto: {
    name: 'Sécurité & Cryptographie',
    paths: [
      'src/shared/utils/secureRandom.ts',
      'src/shared/utils/secureLogger.ts',
      'src/shared/utils/uuid.ts',
      'src/background/SecurityManager.ts'
    ],
    target: { lines: 95, functions: 95, branches: 90, statements: 95 }
  },
  core: {
    name: 'Noyau Organism',
    paths: [
      'src/core/OrganismCore.ts',
      'src/core/NeuralMesh.ts',
      'src/core/services/',
      'src/core/storage/'
    ],
    target: { lines: 95, functions: 95, branches: 85, statements: 95 }
  },
  webgl: {
    name: 'Rendu WebGL',
    paths: [
      'src/background/WebGLOrchestrator.ts',
      'src/background/services/WebGLBridge.ts',
      'src/integration/WebGLMessageAdapter.ts'
    ],
    target: { lines: 80, functions: 85, branches: 75, statements: 80 }
  },
  messaging: {
    name: 'Communication',
    paths: [
      'src/shared/messaging/',
      'src/core/messaging/',
      'src/background/SynapticRouter.ts'
    ],
    target: { lines: 85, functions: 90, branches: 80, statements: 85 }
  },
  behavioral: {
    name: 'Intelligence Comportementale',
    paths: [
      'src/behavioral/',
      'src/ml/',
      'src/intelligence/'
    ],
    target: { lines: 80, functions: 85, branches: 75, statements: 80 }
  }
};

function readCoverageData() {
  const coveragePath = path.join(__dirname, '..', 'coverage', 'coverage-final.json');
  
  if (!fs.existsSync(coveragePath)) {
    console.error('❌ Fichier de couverture introuvable. Exécutez d\\'abord: npm run test:ci');
    console.log('   Chemin attendu:', coveragePath);
    return null;
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    return data;
  } catch (error) {
    console.error('❌ Erreur lecture couverture:', error.message);
    return null;
  }
}

function calculateModuleCoverage(coverageData, module) {
  const files = Object.keys(coverageData);
  const moduleFiles = files.filter(file => {
    return module.paths.some(pathPattern => {
      if (pathPattern.endsWith('/')) {
        return file.includes(pathPattern);
      }
      return file.includes(pathPattern);
    });
  });
  
  if (moduleFiles.length === 0) {
    return {
      files: [],
      coverage: { lines: 0, functions: 0, branches: 0, statements: 0 },
      details: []
    };
  }
  
  let totalLines = 0, totalLinesCovered = 0;
  let totalFunctions = 0, totalFunctionsCovered = 0;
  let totalBranches = 0, totalBranchesCovered = 0;
  let totalStatements = 0, totalStatementsCovered = 0;
  
  const details = [];
  
  moduleFiles.forEach(file => {
    const data = coverageData[file];
    const relativePath = file.replace(process.cwd(), '').replace(/\\\\/g, '/');
    
    // Calculs pour ce fichier
    const linesCovered = Object.values(data.s).filter(x => x > 0).length;
    const linesTotal = Object.keys(data.s).length;
    const functionsCovered = Object.values(data.f).filter(x => x > 0).length;
    const functionsTotal = Object.keys(data.f).length;
    const branchesCovered = Object.values(data.b).flat().filter(x => x > 0).length;
    const branchesTotal = Object.values(data.b).flat().length;
    
    totalLines += linesTotal;
    totalLinesCovered += linesCovered;
    totalFunctions += functionsTotal;
    totalFunctionsCovered += functionsCovered;
    totalBranches += branchesTotal;
    totalBranchesCovered += branchesCovered;
    totalStatements += linesTotal; // Approximation
    totalStatementsCovered += linesCovered;
    
    details.push({
      file: relativePath,
      lines: { covered: linesCovered, total: linesTotal, percent: (linesCovered / linesTotal * 100) || 0 },
      functions: { covered: functionsCovered, total: functionsTotal, percent: (functionsCovered / functionsTotal * 100) || 0 },
      branches: { covered: branchesCovered, total: branchesTotal, percent: (branchesCovered / branchesTotal * 100) || 0 }
    });
  });
  
  return {
    files: moduleFiles,
    coverage: {
      lines: (totalLinesCovered / totalLines * 100) || 0,
      functions: (totalFunctionsCovered / totalFunctions * 100) || 0,
      branches: (totalBranchesCovered / totalBranches * 100) || 0,
      statements: (totalStatementsCovered / totalStatements * 100) || 0
    },
    details
  };
}

function getHeatmapColor(percent, target) {
  if (percent >= target) return '🟢'; // Vert - Objectif atteint
  if (percent >= target * 0.8) return '🟡'; // Jaune - Proche
  if (percent >= target * 0.6) return '🟠'; // Orange - Moyen
  return '🔴'; // Rouge - Faible
}

function generateModuleReport(moduleName, moduleConfig, coverageData) {
  const result = calculateModuleCoverage(coverageData, moduleConfig);
  
  console.log(`\\n📦 ${moduleConfig.name} (${moduleName})`);
  console.log('═'.repeat(60));
  
  if (result.files.length === 0) {
    console.log('⚠️  Aucun fichier trouvé pour ce module');
    return { module: moduleName, ...moduleConfig, coverage: result.coverage, status: 'empty' };
  }
  
  console.log(`📁 Fichiers analysés: ${result.files.length}`);
  
  // Affichage de la couverture globale du module
  const metrics = ['lines', 'functions', 'branches', 'statements'];
  metrics.forEach(metric => {
    const percent = result.coverage[metric];
    const target = moduleConfig.target[metric];
    const status = percent >= target ? '✅' : '❌';
    const color = getHeatmapColor(percent, target);
    
    console.log(`${color} ${metric.padEnd(12)}: ${percent.toFixed(1)}% / ${target}% ${status}`);
  });
  
  // Détails par fichier (top 5 problématiques)
  const problematicFiles = result.details
    .filter(d => d.lines.percent < moduleConfig.target.lines)
    .sort((a, b) => a.lines.percent - b.lines.percent)
    .slice(0, 5);
    
  if (problematicFiles.length > 0) {
    console.log('\\n🔍 Fichiers nécessitant attention:');
    problematicFiles.forEach(file => {
      console.log(`   ${file.file}: ${file.lines.percent.toFixed(1)}% lines`);
    });
  }
  
  const overallStatus = Object.keys(moduleConfig.target).every(
    metric => result.coverage[metric] >= moduleConfig.target[metric]
  ) ? 'success' : 'needs_improvement';
  
  return {
    module: moduleName,
    name: moduleConfig.name,
    target: moduleConfig.target,
    coverage: result.coverage,
    files: result.files.length,
    details: result.details,
    status: overallStatus
  };
}

function generateGlobalSummary(moduleResults) {
  console.log('\\n🌍 RÉSUMÉ GLOBAL');
  console.log('═'.repeat(60));
  
  const totalFiles = moduleResults.reduce((sum, r) => sum + r.files, 0);
  const successfulModules = moduleResults.filter(r => r.status === 'success').length;
  
  console.log(`📊 Modules analysés: ${moduleResults.length}`);
  console.log(`📁 Fichiers couverts: ${totalFiles}`);
  console.log(`✅ Modules conformes: ${successfulModules}/${moduleResults.length}`);
  
  // Matrice des performances
  console.log('\\n📈 Matrice de Performance par Module:');
  console.log('Module'.padEnd(20) + 'Lines'.padEnd(8) + 'Funcs'.padEnd(8) + 'Branch'.padEnd(8) + 'Status');
  console.log('-'.repeat(50));
  
  moduleResults.forEach(result => {
    if (result.status === 'empty') return;
    
    const statusIcon = result.status === 'success' ? '✅' : '❌';
    const line = result.module.padEnd(20) + 
                 `${result.coverage.lines.toFixed(0)}%`.padEnd(8) +
                 `${result.coverage.functions.toFixed(0)}%`.padEnd(8) +
                 `${result.coverage.branches.toFixed(0)}%`.padEnd(8) +
                 statusIcon;
    console.log(line);
  });
  
  // Recommandations
  console.log('\\n💡 RECOMMANDATIONS:');
  const needsWork = moduleResults.filter(r => r.status === 'needs_improvement');
  if (needsWork.length === 0) {
    console.log('🎉 Excellente couverture ! Tous les modules atteignent leurs objectifs.');
  } else {
    console.log(`⚠️  ${needsWork.length} module(s) nécessitent des améliorations:`);
    needsWork.forEach(module => {
      console.log(`   • ${module.name}: Focus sur les tests ${
        Object.entries(module.target)
          .filter(([metric, target]) => module.coverage[metric] < target)
          .map(([metric]) => metric)
          .join(', ')
      }`);
    });
  }
  
  return {
    totalModules: moduleResults.length,
    successfulModules,
    totalFiles,
    overallSuccess: successfulModules === moduleResults.length,
    modules: moduleResults
  };
}

function generateHTMLReport(summary) {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Rapport de Couverture SYMBIONT</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #2d3748; color: white; padding: 20px; border-radius: 8px; }
        .module { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
        .success { border-left: 5px solid #48bb78; }
        .needs-improvement { border-left: 5px solid #f56565; }
        .metric { display: inline-block; margin: 5px 10px; padding: 5px 10px; border-radius: 4px; }
        .high { background: #c6f6d5; }
        .medium { background: #fed7d7; }
        .low { background: #fc8181; color: white; }
        .summary { background: #edf2f7; padding: 15px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Rapport de Couverture SYMBIONT</h1>
        <p>Généré le ${new Date().toLocaleString('fr-FR')}</p>
    </div>
    
    <div class="summary">
        <h2>Résumé Global</h2>
        <p><strong>Modules:</strong> ${summary.successfulModules}/${summary.totalModules} conformes</p>
        <p><strong>Fichiers:</strong> ${summary.totalFiles} analysés</p>
        <p><strong>Status:</strong> ${summary.overallSuccess ? '✅ Objectifs atteints' : '⚠️ Améliorations nécessaires'}</p>
    </div>
    
    ${summary.modules.map(module => `
        <div class="module ${module.status}">
            <h3>${module.name} (${module.module})</h3>
            <div>
                <span class="metric ${module.coverage.lines >= module.target.lines ? 'high' : 'low'}">
                    Lines: ${module.coverage.lines.toFixed(1)}%
                </span>
                <span class="metric ${module.coverage.functions >= module.target.functions ? 'high' : 'low'}">
                    Functions: ${module.coverage.functions.toFixed(1)}%
                </span>
                <span class="metric ${module.coverage.branches >= module.target.branches ? 'high' : 'low'}">
                    Branches: ${module.coverage.branches.toFixed(1)}%
                </span>
            </div>
            <p><small>${module.files} fichier(s) analysé(s)</small></p>
        </div>
    `).join('')}
    
</body>
</html>`;
  
  const reportPath = path.join(__dirname, '..', 'coverage', 'module-coverage-report.html');
  fs.writeFileSync(reportPath, html);
  console.log(`\\n📄 Rapport HTML généré: ${reportPath}`);
}

function main() {
  console.log('🔍 Génération du rapport de couverture modulaire SYMBIONT\\n');
  
  const coverageData = readCoverageData();
  if (!coverageData) {
    process.exit(1);
  }
  
  const moduleResults = [];
  
  // Analyse de chaque module
  Object.entries(MODULES).forEach(([moduleName, moduleConfig]) => {
    const result = generateModuleReport(moduleName, moduleConfig, coverageData);
    moduleResults.push(result);
  });
  
  // Résumé global
  const summary = generateGlobalSummary(moduleResults);
  
  // Génération du rapport HTML
  generateHTMLReport(summary);
  
  // Sauvegarde JSON
  const jsonPath = path.join(__dirname, '..', 'coverage', 'module-coverage-summary.json');
  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));
  console.log(`📊 Données JSON sauvegardées: ${jsonPath}`);
  
  // Code de sortie
  process.exit(summary.overallSuccess ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { MODULES, calculateModuleCoverage, generateModuleReport };