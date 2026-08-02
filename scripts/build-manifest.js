#!/usr/bin/env node
/**
 * Dérive le manifest.json d'un navigateur cible.
 *
 * Source de vérité : manifest.json à la racine (format Chrome MV3).
 * Le manifest Firefox est dérivé automatiquement — ne jamais maintenir
 * deux manifests à la main.
 *
 * Deux usages :
 *   - CLI  : node scripts/build-manifest.js <chrome|firefox> [outDir=dist]
 *   - Node : const { manifestCopyPattern } = require('./scripts/build-manifest')
 *            → branché dans le CopyPlugin des configs webpack, pour que le
 *              manifest émis soit correct à *chaque* build, y compris en mode
 *              --watch. Sans ça, un rebuild réécrit le manifest Chrome
 *              par-dessus le manifest Firefox et casse le rechargement à chaud.
 */

const fs = require('fs');
const path = require('path');

const TARGETS = ['chrome', 'firefox'];
const DEFAULT_TARGET = 'chrome';

const GECKO_ID = 'symbiont@pinfada.github.io';
// 140 = ESR 2025 : requis pour optional_host_permissions et
// data_collection_permissions (validés par le linter AMO)
const GECKO_MIN_VERSION = '140.0';
const UPDATE_URL = 'https://raw.githubusercontent.com/pinfada/SYMBIONT/main/updates.json';

const rootDir = path.join(__dirname, '..');

/**
 * Applique les adaptations Firefox à un manifest Chrome MV3.
 * Pure : ne mute jamais l'entrée (webpack peut réutiliser le même objet).
 *
 * @param {object} chromeManifest manifest MV3 au format Chrome
 * @returns {object} nouveau manifest adapté à Gecko
 */
function toFirefox(chromeManifest) {
  const manifest = structuredClone(chromeManifest);

  // Firefox MV3 : page d'événements, pas de service worker.
  manifest.background = {
    scripts: [chromeManifest.background.service_worker],
    type: 'module'
  };

  // L'API offscreen n'existe pas sur Firefox (la page d'événements a un DOM).
  // Le moteur LLM retombe alors sur le repli in-popup — cf. createCognitiveEngine.
  manifest.permissions = chromeManifest.permissions.filter((p) => p !== 'offscreen');

  // "windows" n'est pas une permission sur Firefox (API accessible sans elle).
  if (chromeManifest.optional_permissions) {
    manifest.optional_permissions = chromeManifest.optional_permissions.filter(
      (p) => p !== 'windows'
    );
  }

  // Requis pour la signature AMO et l'auto-update auto-hébergé.
  // data_collection_permissions: exigence AMO — SYMBIONT ne collecte rien.
  manifest.browser_specific_settings = {
    gecko: {
      id: GECKO_ID,
      strict_min_version: GECKO_MIN_VERSION,
      update_url: UPDATE_URL,
      data_collection_permissions: {
        required: ['none']
      }
    }
  };

  // offscreen.html n'est pas utilisé sur Firefox.
  manifest.web_accessible_resources = chromeManifest.web_accessible_resources.map((entry) => ({
    ...entry,
    resources: entry.resources.filter((r) => r !== 'offscreen.html')
  }));

  return manifest;
}

/**
 * @param {object} chromeManifest manifest MV3 au format Chrome
 * @param {'chrome'|'firefox'} target navigateur cible
 * @returns {object} manifest adapté (copie ; l'entrée n'est pas mutée)
 */
function forTarget(chromeManifest, target) {
  if (!TARGETS.includes(target)) {
    throw new Error(`Cible inconnue "${target}" (attendu : ${TARGETS.join(' | ')}).`);
  }
  return target === 'firefox' ? toFirefox(chromeManifest) : structuredClone(chromeManifest);
}

/** Sérialisation unique, pour que CLI et webpack produisent un résultat identique. */
function serialize(manifest) {
  return JSON.stringify(manifest, null, 2) + '\n';
}

/**
 * Résout la cible depuis l'objet `env` de webpack (`--env browser=firefox`).
 *
 * @param {{ browser?: string }} [env] argument `env` de webpack
 * @returns {'chrome'|'firefox'}
 */
function targetFromEnv(env) {
  const browser = env && env.browser;
  if (!browser) return DEFAULT_TARGET;
  if (!TARGETS.includes(browser)) {
    throw new Error(`--env browser=${browser} invalide (attendu : ${TARGETS.join(' | ')}).`);
  }
  return browser;
}

/**
 * Pattern CopyPlugin qui émet le manifest de la cible demandée.
 * À utiliser dans toutes les configs webpack qui copient le manifest, pour
 * qu'aucune ne puisse en réécrire une version d'un autre navigateur.
 *
 * @param {{ browser?: string }} [env] argument `env` de webpack
 */
function manifestCopyPattern(env) {
  const target = targetFromEnv(env);
  return {
    from: 'manifest.json',
    to: 'manifest.json',
    noErrorOnMissing: true,
    transform(content) {
      return serialize(forTarget(JSON.parse(content.toString('utf8')), target));
    }
  };
}

module.exports = { TARGETS, forTarget, manifestCopyPattern, targetFromEnv };

if (require.main === module) {
  const target = process.argv[2];
  const outDir = process.argv[3] || 'dist';

  if (!TARGETS.includes(target)) {
    console.error(`Usage: node scripts/build-manifest.js <${TARGETS.join('|')}> [outDir]`);
    process.exit(1);
  }

  const source = JSON.parse(fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf8'));
  const outPath = path.resolve(rootDir, outDir, 'manifest.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, serialize(forTarget(source, target)));
  console.log(`✅ Manifest ${target} écrit dans ${path.relative(rootDir, outPath)}`);
}
