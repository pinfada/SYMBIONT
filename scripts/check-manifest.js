const fs = require('fs');
const path = require('path');

const distManifest = path.join(__dirname, '..', 'dist', 'manifest.json');
const srcManifest = path.join(__dirname, '..', 'manifest.json');

if (!fs.existsSync(distManifest)) {
  console.error('❌ Le manifest.json n\'existe pas dans dist/');
  process.exit(1);
}

const distContent = fs.readFileSync(distManifest, 'utf-8').trim();
const srcContent = fs.readFileSync(srcManifest, 'utf-8').trim();

if (!distContent) {
  console.error('❌ Le manifest.json dans dist/ est vide !');
  process.exit(1);
}

try {
  const distJson = JSON.parse(distContent);
  const srcJson = JSON.parse(srcContent);

  if (JSON.stringify(distJson) !== JSON.stringify(srcJson)) {
    console.warn('⚠️ Le manifest.json dans dist/ est différent de celui à la racine.');
  } else {
    console.log('✅ Le manifest.json dans dist/ est correct et conforme à l\'original.');
  }
} catch (e) {
  console.error('❌ Le manifest.json dans dist/ n\'est pas un JSON valide !');
  process.exit(1);
} 