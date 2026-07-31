#!/usr/bin/env node
/**
 * Ajoute (ou remplace) une entrée de version dans updates.json — le
 * manifest d'auto-update Firefox auto-hébergé, pointé par update_url.
 *
 * Usage : node scripts/update-updates-json.js <version>
 *   ex.  node scripts/update-updates-json.js 1.1.0
 *
 * L'update_link suit la convention des GitHub Releases :
 *   https://github.com/pinfada/SYMBIONT/releases/download/v<version>/symbiont-<version>.xpi
 */

const fs = require('fs');
const path = require('path');

const GECKO_ID = 'symbiont@pinfada.github.io';
const RELEASE_BASE = 'https://github.com/pinfada/SYMBIONT/releases/download';

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Usage: node scripts/update-updates-json.js <version>  (ex: 1.1.0)');
  process.exit(1);
}

const filePath = path.join(__dirname, '..', 'updates.json');
const doc = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const addon = doc.addons[GECKO_ID] || (doc.addons[GECKO_ID] = { updates: [] });
addon.updates = addon.updates.filter((u) => u.version !== version);
addon.updates.push({
  version,
  update_link: `${RELEASE_BASE}/v${version}/symbiont-${version}.xpi`,
});
// Tri par version croissante (Firefox prend la plus haute compatible)
addon.updates.sort((a, b) =>
  a.version.localeCompare(b.version, undefined, { numeric: true })
);

fs.writeFileSync(filePath, JSON.stringify(doc, null, 2) + '\n');
console.log(`✅ updates.json : entrée ${version} ajoutée`);
