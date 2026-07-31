#!/usr/bin/env node
/**
 * Génère le manifest.json final pour un navigateur cible.
 *
 * Source de vérité : manifest.json à la racine (format Chrome MV3).
 * Le manifest Firefox est dérivé automatiquement — ne jamais maintenir
 * deux manifests à la main.
 *
 * Usage :
 *   node scripts/build-manifest.js chrome   [outDir=dist]
 *   node scripts/build-manifest.js firefox  [outDir=dist]
 */

const fs = require('fs');
const path = require('path');

const GECKO_ID = 'symbiont@pinfada.github.io';
// 140 = ESR 2025 : requis pour optional_host_permissions et
// data_collection_permissions (validés par le linter AMO)
const GECKO_MIN_VERSION = '140.0';
const UPDATE_URL = 'https://raw.githubusercontent.com/pinfada/SYMBIONT/main/updates.json';

const target = process.argv[2];
const outDir = process.argv[3] || 'dist';

if (!['chrome', 'firefox'].includes(target)) {
  console.error('Usage: node scripts/build-manifest.js <chrome|firefox> [outDir]');
  process.exit(1);
}

const rootDir = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf8'));

if (target === 'firefox') {
  // Firefox MV3 : page d'événements, pas de service worker.
  manifest.background = {
    scripts: [manifest.background.service_worker],
    type: 'module'
  };

  // L'API offscreen n'existe pas sur Firefox (la page d'événements a un DOM).
  manifest.permissions = manifest.permissions.filter(p => p !== 'offscreen');

  // "windows" n'est pas une permission sur Firefox (API accessible sans elle).
  if (manifest.optional_permissions) {
    manifest.optional_permissions = manifest.optional_permissions.filter(p => p !== 'windows');
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
  manifest.web_accessible_resources = manifest.web_accessible_resources.map(entry => ({
    ...entry,
    resources: entry.resources.filter(r => r !== 'offscreen.html')
  }));
}

const outPath = path.resolve(rootDir, outDir, 'manifest.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`✅ Manifest ${target} écrit dans ${path.relative(rootDir, outPath)}`);
