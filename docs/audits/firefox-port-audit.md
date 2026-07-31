# Audit de portabilité Firefox

**Date** : 2026-07-31
**Périmètre** : extension SYMBIONT (`src/`, `manifest.json`, chaîne de build webpack)
**Objectif** : évaluer l'effort de portage vers Firefox (WebExtensions) en vue d'une
distribution de masse auto-hébergée sur GitHub (signature AMO « unlisted » + auto-update),
sans passer par le Chrome Web Store.

---

## Verdict

**Le port est faisable, sans blocage architectural, pour un effort estimé à 1,5–2 semaines.**

Point clé inattendu : Firefox n'est pas seulement un canal de distribution alternatif —
il est **techniquement mieux adapté** à SYMBIONT que Chrome sur trois fonctions centrales
(voir « Avantages Firefox » ci-dessous). Notamment, la maille P2P WebRTC est
structurellement bridée dans le service worker Chrome MV3, alors qu'elle fonctionnerait
nativement dans la page d'événements Firefox.

État des lieux chiffré :
- ~250 sites d'appel `chrome.*` répartis sur l'ensemble de `src/`
- Aucune couche d'abstraction navigateur, aucun polyfill (`webextension-polyfill` absent)
- 53 appels en style promesse (`await chrome.*`), ~38 en style callback (`chrome.runtime.lastError`)
- Firefox expose le namespace `chrome.*` (callbacks et promesses sur les versions récentes),
  donc la majorité des appels passent tels quels — la migration n'est **pas** une réécriture

---

## Constats bloquants (obligatoires pour que l'extension se charge)

### B1 — `background.service_worker` non supporté par Firefox
`manifest.json` déclare `"background": { "service_worker": "background/index.js" }`.
Firefox MV3 utilise des **pages d'événements** (`background.scripts`), pas des service workers.

**Solution standard (documentée par MDN)** : déclarer les deux clés —
```json
"background": {
  "service_worker": "background/index.js",
  "scripts": ["background/index.js"],
  "type": "module"
}
```
Chrome utilise `service_worker`, Firefox utilise `scripts`. Le bundle est le même.

### B2 — `browser_specific_settings.gecko` requis pour la signature et l'auto-update
Indispensable pour la distribution auto-hébergée :
```json
"browser_specific_settings": {
  "gecko": {
    "id": "symbiont@pinfada.github.io",
    "strict_min_version": "121.0",
    "update_url": "https://raw.githubusercontent.com/pinfada/SYMBIONT/main/updates.json"
  }
}
```
Sans `id`, pas de signature AMO ; sans `update_url`, pas de mise à jour automatique
hors store — ce qui serait rédhibitoire pour un outil de sécurité distribué en masse.

### B3 — Permission `offscreen` inconnue de Firefox
Firefox ignore les permissions inconnues avec un avertissement, mais le linter AMO la
signalera. À retirer du manifest Firefox (voir M1 pour le code appelant).

**Recommandation build** : générer deux manifests (`manifest.chrome.json` /
`manifest.firefox.json`) via une étape webpack, plutôt qu'un manifest unique bricolé.

---

## Constats moyens (le code se charge mais des fonctions dégradent)

### M1 — `chrome.offscreen` (WebGL en arrière-plan)
`src/background/OffscreenWebGL.ts` et `src/background/WebGLOrchestrator.ts` utilisent
`chrome.offscreen.createDocument` pour le rendu WebGL hors popup. Le code fait déjà de la
détection de capacité (`if (chrome.offscreen && ...)`) donc il ne plantera pas — mais la
cible de rendu « offscreen » sera indisponible.

**Sur Firefox, l'API offscreen est inutile** : la page d'événements possède un vrai DOM.
Il suffit d'ajouter une cible de rendu « background-page » (canvas créé directement dans
la page d'événements) dans `WebGLOrchestrator`. Effort : adaptateur simple, le pattern
multi-cibles existe déjà.

### M2 — Cycle de vie : keepalive service worker vs page d'événements
`src/background/persistent-service-worker.ts` maintient le service worker Chrome en vie
via des `setInterval` (heartbeat). Les pages d'événements Firefox ont un cycle de vie
différent (déchargement sur inactivité, réveil par événements) et un `setInterval` ne les
maintient pas éveillées de façon fiable.

**Solution** : basculer les réveils périodiques sur `chrome.alarms` (la permission
`alarms` est déjà déclarée). Bénéfice collatéral : c'est aussi la bonne pratique MV3 côté
Chrome — le heartbeat actuel est un contournement fragile.

### M3 — Style d'appel des APIs : à verrouiller par des tests
Firefox supporte le namespace `chrome.*` en callbacks, et les promesses sur les versions
récentes. Le code mélange les deux styles (53 `await chrome.*`, ~38 callbacks avec
`chrome.runtime.lastError`). La compatibilité devrait être bonne, mais elle doit être
**prouvée, pas supposée**.

**Recommandation** : introduire soit `webextension-polyfill`, soit un module
`src/shared/browser.ts` (wrapper fin, 30 lignes) par lequel passent tous les nouveaux
appels — et une passe de tests d'intégration sur Firefox pour l'existant. Ne pas
réécrire les ~250 sites d'appel préventivement.

### M4 — Signalisation P2P via `storage.sync`
`src/services/p2p/PeerNetwork.ts` utilise `chrome.storage.sync` comme canal de
signalisation. Firefox supporte `storage.sync` avec les mêmes quotas (100KB total,
8KB/clé), mais la synchronisation inter-machines exige un compte **Firefox Sync**
(comme Chrome exige un compte Google). Conséquences :
- Un utilisateur Firefox sans compte Sync = découverte locale uniquement (BroadcastChannel).
- Les pairs Chrome et Firefox ne peuvent **jamais** se découvrir entre eux
  (les deux nuages de sync sont étanches).

Ceci confirme le besoin d'une couche de signalisation neutre (hors sync navigateur)
pour l'objectif réseau de masse — chantier déjà identifié, indépendant du port.

### M5 — CSP : ressources distantes Google Fonts
La CSP autorise `https://fonts.googleapis.com` / `fonts.gstatic.com`. Le linter AMO
signale les ressources distantes (et `'unsafe-inline'` en style-src). Pour une
signature sans friction et par cohérence avec la promesse « tout est local » :
**auto-héberger les polices** dans `assets/`. Effort : trivial.

---

## Constats mineurs (bugs préexistants, révélés par l'audit)

Ces problèmes existent déjà sur Chrome — le port est l'occasion de les nettoyer.

### m1 — APIs utilisées sans permission déclarée
- `chrome.history.search` (`src/popup/services/RealDataService.ts`) : permission
  `history` absente du manifest (ni requise, ni optionnelle). Le code est protégé par
  une détection de capacité, donc la branche est **morte** sur les deux navigateurs.
- `chrome.notifications.create` (`src/shared/security/SecurityMonitor.ts`) : permission
  `notifications` absente. Même situation.
- `chrome.webRequest` (`src/background/TrackerInterceptor.ts`) : le code demande la
  permission à l'exécution via `chrome.permissions.request({ permissions: ['webRequest'] })`,
  mais `webRequest` n'est **pas dans `optional_permissions`** → la demande échoue
  toujours. L'interception de trackers est donc inopérante en l'état.

**Action** : déclarer ces permissions en `optional_permissions` (elles sont toutes
supportées par Firefox) ou supprimer le code mort.

### m2 — Permission `management` (ExtensionBioDetector)
Supportée par Firefox. En revanche, lister les extensions installées est sensible :
prévoir une justification claire lors de la soumission AMO (même « unlisted », une
revue manuelle peut survenir).

### m3 — Divers compatibles
`alarms`, `idle`, `activeTab`, `scripting`, `storage` : OK Firefox.
`wasm-unsafe-eval` : OK (Firefox 105+). `web_accessible_resources` format MV3 : OK (101+).

---

## Avantages Firefox (le port débloque des fonctions aujourd'hui bridées)

### A1 — La maille P2P WebRTC ne peut pas fonctionner dans le service worker Chrome
`PeerNetwork` (RTCPeerConnection) est démarré depuis le background via
`RitualBootstrap` (`src/background/index.ts:26`). Or **`RTCPeerConnection` n'existe pas
dans un service worker** — c'est une API de contexte fenêtre. Sur Chrome MV3, les
DataChannels ne peuvent donc pas s'établir depuis le background (il faudrait les déporter
dans un document offscreen). Sur une page d'événements Firefox, `RTCPeerConnection` est
**nativement disponible**. Le port Firefox est le chemin le plus court vers une maille
P2P réellement fonctionnelle.

### A2 — `new Worker()` dans le background
`src/cortex/models/OracleModel.ts:174` et `src/core/NeuralMeshAsync.ts:74` créent des
Web Workers depuis le background. Les service workers Chrome ne peuvent pas engendrer de
dedicated workers (c'est la raison d'être de l'API offscreen). Une page d'événements
Firefox le fait sans restriction : l'Oracle du Cortex et le NeuralMesh asynchrone
tournent tels quels.

### A3 — Plus besoin d'offscreen, DOM disponible en arrière-plan
Rendu WebGL, canvas, AudioContext : tout est accessible directement (cf. M1).

### A4 — Firefox pour Android
Firefox Android supporte les extensions : le port ouvre un canal mobile sans travail
supplémentaire significatif (à valider en QA, non chiffré ici).

---

## Plan de portage recommandé

| Phase | Contenu | Effort |
|---|---|---|
| **1. Manifest & build** — ✅ **fait** (2026-07-31, voir [`firefox-build.md`](../developer/firefox-build.md)) | Double manifest (Chrome/Firefox), `browser_specific_settings.gecko`, `background.scripts`, retrait `offscreen` côté Firefox, auto-hébergement des polices, correction des permissions (m1) | 1–2 j |
| **2. Runtime** | Cycle de vie sur `alarms` (M2), cible de rendu background-page (M1), wrapper `browser.ts` ou polyfill (M3), vérification P2P sur page d'événements (A1) | 3–5 j |
| **3. QA & distribution** | Tests Playwright sur Firefox, signature AMO unlisted (`web-ext sign --channel unlisted`), `.xpi` en GitHub Release, `updates.json` versionné dans le repo, test du cycle d'auto-update complet | 2–3 j |

**Total estimé : 6–10 jours de développement.**

### Mécanique de distribution auto-hébergée (rappel)

1. Build Firefox → signature automatique via AMO en canal « unlisted »
   (pas de publication sur addons.mozilla.org, juste une signature).
2. Le `.xpi` signé est attaché à une **GitHub Release**.
3. `updates.json` (hébergé dans le repo, pointé par `update_url`) référence la
   dernière version → **les instances installées se mettent à jour automatiquement**.
4. L'utilisateur final installe en un clic depuis la page GitHub (Firefox propose
   l'installation directe d'un `.xpi` signé).

C'est le seul schéma qui combine : distribution GitHub sans store, installation
accessible aux non-techniciens, et mises à jour automatiques — les trois exigences
du projet.

---

## Ce que cet audit ne couvre pas

- L'implémentation elle-même (aucun code modifié).
- La couche de signalisation P2P neutre inter-navigateurs (chantier séparé, cf. M4).
- La validation Firefox Android (A4).
- Les performances comparées WebGL/Workers entre les deux navigateurs.
