#!/usr/bin/env node
// Valide le manifest source et ses dérivés par navigateur.
//
// Historique : l'ancienne version exigeait dist/manifest.json, or le job CI
// « Lint & Style Check » tourne sans build — le check échouait sur tout
// checkout vierge. Elle comparait aussi dist/ à la racine à l'identique,
// logique antérieure à la dérivation par navigateur (le manifest Firefox
// est CENSÉ différer du manifest Chrome source).
//
// La source de vérité est manifest.json à la racine. dist/manifest.json
// n'est vérifié que s'il existe (build local) et doit alors correspondre
// exactement à l'une des deux cibles dérivées.

const fs = require('fs');
const path = require('path');
const { forTarget, TARGETS } = require('./build-manifest');

const rootDir = path.join(__dirname, '..');
const srcPath = path.join(rootDir, 'manifest.json');
const distPath = path.join(rootDir, 'dist', 'manifest.json');

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

// 1. Manifest source : présent et JSON valide
if (!fs.existsSync(srcPath)) {
  fail('manifest.json absent à la racine.');
}
let src;
try {
  src = JSON.parse(fs.readFileSync(srcPath, 'utf-8'));
} catch (e) {
  fail(`manifest.json racine invalide : ${e.message}`);
}

// 2. Invariants de base de la cible Chrome (format source)
if (src.manifest_version !== 3) {
  fail('manifest_version doit être 3.');
}
if (!src.name || !src.version) {
  fail('name et version sont requis.');
}
if (!/^\d+(\.\d+){1,3}$/.test(src.version)) {
  fail(`version invalide : ${src.version}`);
}
if (!src.background || !src.background.service_worker) {
  fail('background.service_worker manquant (cible Chrome).');
}

// 3. Les dérivations par navigateur doivent réussir et tenir leurs invariants
const derived = {};
for (const target of TARGETS) {
  try {
    derived[target] = forTarget(src, target);
  } catch (e) {
    fail(`dérivation ${target} impossible : ${e.message}`);
  }
}

const firefox = derived.firefox;
if (!firefox.browser_specific_settings || !firefox.browser_specific_settings.gecko ||
    !firefox.browser_specific_settings.gecko.id) {
  fail('manifest Firefox sans browser_specific_settings.gecko.id (signature AMO impossible).');
}
if (!Array.isArray(firefox.background.scripts) || firefox.background.scripts.length === 0) {
  fail('manifest Firefox sans background.scripts (les pages d’événements Gecko l’exigent).');
}
if ((firefox.permissions || []).includes('offscreen')) {
  fail('manifest Firefox ne doit pas déclarer la permission offscreen (API absente sur Gecko).');
}

// 4. dist/manifest.json : vérifié seulement s'il existe (après un build local)
if (fs.existsSync(distPath)) {
  let dist;
  try {
    dist = JSON.parse(fs.readFileSync(distPath, 'utf-8'));
  } catch (e) {
    fail(`dist/manifest.json n'est pas un JSON valide : ${e.message}`);
  }
  const distStr = JSON.stringify(dist);
  const match = TARGETS.find((t) => JSON.stringify(derived[t]) === distStr);
  if (!match) {
    fail(
      'dist/manifest.json ne correspond à aucune cible dérivée (chrome/firefox) — ' +
      'build périmé ; relancer npm run build ou npm run build:firefox.'
    );
  }
  console.log(`✅ dist/manifest.json conforme à la cible « ${match} ».`);
} else {
  console.log('ℹ️ dist/manifest.json absent (pas de build) — validation du manifest source uniquement.');
}

console.log(`✅ Manifest valide pour : ${TARGETS.join(', ')}.`);
