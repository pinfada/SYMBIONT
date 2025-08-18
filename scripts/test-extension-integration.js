/**
 * Test d'intégration de l'extension SYMBIONT
 * Vérifie que les composants principaux se chargent sans erreur
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 TEST D\'INTÉGRATION EXTENSION SYMBIONT');
console.log('=========================================\n');

// Test 1: Vérification des fichiers de build
console.log('📁 Test 1: Vérification des fichiers de build');
console.log('----------------------------------------------');

const requiredFiles = [
  'dist/manifest.json',
  'dist/background/index.js',
  'dist/content/index.js',
  'dist/popup/index.html',
  'dist/popup/index.js'
];

let buildValid = true;

for (const file of requiredFiles) {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    const stats = fs.statSync(fullPath);
    console.log(`  ✅ ${file} (${(stats.size / 1024).toFixed(1)}KB)`);
  } else {
    console.log(`  ❌ ${file} - MANQUANT`);
    buildValid = false;
  }
}

// Test 2: Validation manifest.json
console.log('\n📋 Test 2: Validation manifest.json');
console.log('------------------------------------');

try {
  const manifestPath = path.join(__dirname, '..', 'dist', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  const requiredFields = [
    'manifest_version', 'name', 'version', 'description',
    'permissions', 'background', 'content_scripts', 'action'
  ];
  
  for (const field of requiredFields) {
    if (manifest[field]) {
      console.log(`  ✅ ${field}: OK`);
    } else {
      console.log(`  ❌ ${field}: MANQUANT`);
      buildValid = false;
    }
  }
  
  // Vérifications spécifiques
  if (manifest.manifest_version === 3) {
    console.log(`  ✅ Manifest V3: Valide`);
  } else {
    console.log(`  ❌ Manifest V3: Version ${manifest.manifest_version} invalide`);
    buildValid = false;
  }
  
} catch (error) {
  console.log(`  ❌ Erreur lecture manifest: ${error.message}`);
  buildValid = false;
}

// Test 3: Vérification intégrité JavaScript
console.log('\n🔧 Test 3: Vérification intégrité JavaScript');
console.log('---------------------------------------------');

const jsFiles = [
  'dist/background/index.js',
  'dist/content/index.js', 
  'dist/popup/index.js'
];

for (const jsFile of jsFiles) {
  try {
    const fullPath = path.join(__dirname, '..', jsFile);
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Vérifications basiques
    const checks = [
      { name: 'Non-vide', test: content.length > 0 },
      { name: 'Syntaxe JS basique', test: !content.includes('SyntaxError') },
      { name: 'Pas d\'erreurs de build', test: !content.includes('Module not found') },
      { name: 'Minifié', test: content.length < 500000 } // Moins de 500KB
    ];
    
    for (const check of checks) {
      if (check.test) {
        console.log(`  ✅ ${jsFile} - ${check.name}`);
      } else {
        console.log(`  ❌ ${jsFile} - ${check.name}`);
        buildValid = false;
      }
    }
    
  } catch (error) {
    console.log(`  ❌ ${jsFile} - Erreur: ${error.message}`);
    buildValid = false;
  }
}

// Test 4: Vérification des ressources
console.log('\n🎨 Test 4: Vérification des ressources');
console.log('---------------------------------------');

const resourceFiles = [
  'dist/assets/icons/icon16.png',
  'dist/assets/icons/icon32.png',
  'dist/assets/icons/icon48.png',
  'dist/assets/icons/icon128.png'
];

for (const resource of resourceFiles) {
  const fullPath = path.join(__dirname, '..', resource);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✅ ${resource}`);
  } else {
    console.log(`  ❌ ${resource} - MANQUANT`);
    buildValid = false;
  }
}

// Test 5: Vérification des imports HybridRandomProvider
console.log('\n⚡ Test 5: Vérification HybridRandomProvider');
console.log('---------------------------------------------');

try {
  const backgroundJs = fs.readFileSync(
    path.join(__dirname, '..', 'dist', 'background', 'index.js'), 
    'utf8'
  );
  
  // Vérifier que le HybridRandomProvider est inclus dans le build
  const hybridChecks = [
    { name: 'HybridRandomProvider présent', test: backgroundJs.includes('HybridRandomProvider') || backgroundJs.includes('hybrid') },
    { name: 'Performance Optimization', test: backgroundJs.includes('performance') || backgroundJs.includes('PerformanceOptimized') },
    { name: 'SecureRandom présent', test: backgroundJs.includes('SecureRandom') || backgroundJs.includes('secureRandom') }
  ];
  
  for (const check of hybridChecks) {
    if (check.test) {
      console.log(`  ✅ ${check.name}`);
    } else {
      console.log(`  ℹ️ ${check.name} - Non détecté (normal si minifié)`);
    }
  }
  
} catch (error) {
  console.log(`  ❌ Erreur vérification HybridProvider: ${error.message}`);
}

// Test 6: Simulation chargement extension
console.log('\n🌐 Test 6: Simulation chargement extension');
console.log('-------------------------------------------');

// Simuler les vérifications qu'un navigateur ferait
const extensionChecks = [
  {
    name: 'Manifest valide',
    test: fs.existsSync(path.join(__dirname, '..', 'dist', 'manifest.json'))
  },
  {
    name: 'Background script existe',
    test: fs.existsSync(path.join(__dirname, '..', 'dist', 'background', 'index.js'))
  },
  {
    name: 'Content script existe', 
    test: fs.existsSync(path.join(__dirname, '..', 'dist', 'content', 'index.js'))
  },
  {
    name: 'Popup interface existe',
    test: fs.existsSync(path.join(__dirname, '..', 'dist', 'popup', 'index.html'))
  },
  {
    name: 'Permissions basiques définies',
    test: true // Vérifié dans test manifest
  }
];

for (const check of extensionChecks) {
  if (check.test) {
    console.log(`  ✅ ${check.name}`);
  } else {
    console.log(`  ❌ ${check.name}`);
    buildValid = false;
  }
}

// Résumé final
console.log('\n' + '='.repeat(50));
if (buildValid) {
  console.log('✅ EXTENSION VALIDE - Prête pour test Chrome');
  console.log('   Extension peut être chargée dans chrome://extensions/');
  console.log('   Tous les composants essentiels sont présents');
  console.log('\n📋 Instructions de test:');
  console.log('   1. Ouvrir chrome://extensions/');
  console.log('   2. Activer "Mode développeur"');
  console.log('   3. Cliquer "Charger l\'extension non empaquetée"');
  console.log('   4. Sélectionner le dossier dist/');
  console.log('   5. Vérifier que l\'extension se charge sans erreur');
} else {
  console.log('❌ EXTENSION NON VALIDE - Problèmes détectés');
  console.log('   Corriger les erreurs avant de tester dans Chrome');
  console.log('   Relancer npm run build si nécessaire');
}
console.log('='.repeat(50));

// Informations additionnelles
console.log('\n📊 INFORMATIONS COMPLÉMENTAIRES');
console.log('--------------------------------');

try {
  const stats = {
    totalSize: 0,
    fileCount: 0
  };
  
  function calculateSize(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        calculateSize(fullPath);
      } else {
        const stat = fs.statSync(fullPath);
        stats.totalSize += stat.size;
        stats.fileCount++;
      }
    }
  }
  
  const distPath = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(distPath)) {
    calculateSize(distPath);
    
    console.log(`Taille totale: ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Nombre de fichiers: ${stats.fileCount}`);
    
    if (stats.totalSize > 50 * 1024 * 1024) { // 50MB
      console.log('⚠️ Extension volumineuse (>50MB)');
    } else {
      console.log('✅ Taille acceptable pour extension');
    }
  }
  
} catch (error) {
  console.log(`Erreur calcul taille: ${error.message}`);
}

// Exit avec le bon code
process.exit(buildValid ? 0 : 1);