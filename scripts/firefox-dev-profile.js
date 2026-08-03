#!/usr/bin/env node
/**
 * Garantit l'existence du profil Firefox de développement.
 *
 * Pourquoi un profil dédié et *nommé* :
 *  - `web-ext run --keep-profile-changes` exige un profil **enregistré dans
 *    profiles.ini** : il passe `-P <nom>`, pas `-profile <chemin>`. Un simple
 *    dossier échoue avec ECONNREFUSED (le serveur de débogage ne démarre pas).
 *  - Sans `--keep-profile-changes`, web-ext repart d'un profil neuf à chaque
 *    lancement : les poids du modèle LLM (plusieurs Go, en Cache API/IndexedDB)
 *    seraient retéléchargés à chaque test.
 *  - Un profil séparé isole les tests de la session Firefox personnelle.
 *
 * Idempotent : ne fait rien si le profil existe déjà. La création est déléguée
 * à Firefox lui-même (`-CreateProfile`) — ce script n'écrit jamais dans
 * profiles.ini, pour ne pas risquer de corrompre la config de l'utilisateur.
 *
 * Usage : node scripts/firefox-dev-profile.js [nom=symbiont-dev]
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const PROFILE_NAME = process.argv[2] || 'symbiont-dev';

/** Emplacement de profiles.ini selon la plateforme. */
function profilesIniPath() {
  const home = os.homedir();
  switch (process.platform) {
    case 'win32':
      return path.join(
        process.env.APPDATA || path.join(home, 'AppData', 'Roaming'),
        'Mozilla',
        'Firefox',
        'profiles.ini'
      );
    case 'darwin':
      return path.join(home, 'Library', 'Application Support', 'Firefox', 'profiles.ini');
    default:
      return path.join(home, '.mozilla', 'firefox', 'profiles.ini');
  }
}

/** Candidats pour le binaire Firefox ; $FIREFOX_BIN a priorité. */
function firefoxCandidates() {
  const fromEnv = process.env.FIREFOX_BIN;
  if (fromEnv) return [fromEnv];

  switch (process.platform) {
    case 'win32':
      return [
        'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
        'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe'
      ];
    case 'darwin':
      return ['/Applications/Firefox.app/Contents/MacOS/firefox'];
    default:
      return ['/usr/bin/firefox', '/usr/local/bin/firefox', '/snap/bin/firefox'];
  }
}

function findFirefox() {
  const found = firefoxCandidates().find((candidate) => fs.existsSync(candidate));
  if (found) return found;
  throw new Error(
    `Firefox introuvable (essayé : ${firefoxCandidates().join(', ')}).\n` +
      'Définis FIREFOX_BIN sur le chemin du binaire Firefox.'
  );
}

/** Le profil est-il déjà déclaré dans profiles.ini ? */
function profileExists(name) {
  const iniPath = profilesIniPath();
  if (!fs.existsSync(iniPath)) return false;
  return fs
    .readFileSync(iniPath, 'utf8')
    .split(/\r?\n/)
    .some((line) => line.trim() === `Name=${name}`);
}

if (profileExists(PROFILE_NAME)) {
  console.log(`✅ Profil Firefox "${PROFILE_NAME}" déjà présent.`);
  process.exit(0);
}

// `-CreateProfile <nom>` (sans chemin) → profil relatif sous Profiles/, seul
// format que web-ext sait résoudre. Un chemin absolu produit IsRelative=0, que
// web-ext concatène au dossier Firefox et qui échoue en ENOENT.
execFileSync(findFirefox(), ['-CreateProfile', PROFILE_NAME], { stdio: 'inherit' });

if (!profileExists(PROFILE_NAME)) {
  console.error(`❌ Création du profil "${PROFILE_NAME}" échouée.`);
  process.exit(1);
}
console.log(`✅ Profil Firefox "${PROFILE_NAME}" créé.`);
