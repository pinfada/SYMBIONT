# Build & distribution Firefox

Ce document décrit le build Firefox de l'extension et le flux de distribution
auto-hébergée sur GitHub (sans store), avec mises à jour automatiques.

Contexte et justification : [`docs/audits/firefox-port-audit.md`](../audits/firefox-port-audit.md).

## Build

```bash
# Build Chrome (inchangé)
npm run build

# Build Firefox : build normal puis manifest dérivé
npm run build:firefox
```

Le manifest Firefox est **dérivé automatiquement** du `manifest.json` racine par
[`scripts/build-manifest.js`](../../scripts/build-manifest.js). Ne jamais maintenir
deux manifests à la main. Transformations appliquées :

| Champ | Chrome (source) | Firefox (dérivé) |
|---|---|---|
| `background` | `service_worker` | `scripts` (page d'événements) |
| `permissions` | inclut `offscreen` | `offscreen` retiré (API inexistante, la page d'événements a un DOM) |
| `browser_specific_settings.gecko` | absent | `id`, `strict_min_version`, `update_url` |
| `web_accessible_resources` | inclut `offscreen.html` | `offscreen.html` retiré |

Constantes (ID gecko, version minimale, URL d'update) : en tête de
`scripts/build-manifest.js`.

## Chargement local (test)

1. `npm run build:firefox`
2. Firefox → `about:debugging#/runtime/this-firefox`
3. « Charger un module complémentaire temporaire » → sélectionner `dist/manifest.json`

## Distribution auto-hébergée (GitHub, sans store)

### Principe

- Le `.xpi` est **signé par AMO en canal « unlisted »** : Mozilla signe le paquet
  mais ne le publie pas sur addons.mozilla.org. La distribution reste sur GitHub.
- [`updates.json`](../../updates.json) (à la racine du repo, servi via
  `raw.githubusercontent.com`) est pointé par `update_url` dans le manifest :
  **les instances installées vérifient ce fichier et se mettent à jour seules.**

### Publier une version

1. Monter la version dans `manifest.json` (et `package.json`).
2. `npm run build:firefox`
3. Signer : `npx web-ext sign --source-dir dist --channel unlisted` (nécessite des
   [clés API AMO](https://addons.mozilla.org/developers/addon/api/key/)).
4. Créer une GitHub Release `vX.Y.Z` et y attacher le `.xpi` signé sous le nom
   `symbiont-X.Y.Z.xpi`.
5. Ajouter l'entrée correspondante dans `updates.json` (version + `update_link`
   vers l'asset de la release) et pousser sur `main`.

L'utilisateur final installe en ouvrant simplement le lien du `.xpi` depuis
Firefox (installation en un clic, aucune manipulation développeur).

## Polices auto-hébergées

Inter est embarquée dans `public/assets/fonts/` (variable, graisses 100-900,
latin + latin-ext) et déclarée dans `assets/fonts/inter.css`, chargé directement
par `popup.html` — hors pipeline webpack. La CSP n'autorise plus
`fonts.googleapis.com` / `fonts.gstatic.com` : l'extension ne fait **aucune
requête externe** pour son interface.

## Architecture de rendu cross-navigateur (Phase 2)

Le rendu background passe par un moteur unique,
[`src/shared/rendering/OrganismRenderer.ts`](../../src/shared/rendering/OrganismRenderer.ts)
(WebGL2 → WebGL1, antialiasing + supersampling 2x, alpha prémultiplié,
export PNG data URL), routé par `WebGLOrchestrator` vers la meilleure cible :

| Cible | Contexte | Transport |
|---|---|---|
| `background-page` | Page d'événements **Firefox** (DOM dans le background) | **in-process** — zéro sérialisation |
| `offscreen` | **Chrome** (document offscreen, script externe conforme CSP) | data URL PNG via runtime messaging |
| `popup` / `content_script` | Repli | messaging |

Chaque rendu est persisté dans `chrome.storage.local` (`symbiont_last_render`)
et diffusé via `ORGANISM_RENDER_READY` quand le popup est ouvert.

Les détections d'environnement (DOM, WebRTC, offscreen, alarms) sont
centralisées dans [`src/shared/utils/browser-env.ts`](../../src/shared/utils/browser-env.ts).

## Cycle de vie background

Le heartbeat repose sur `chrome.alarms` (`symbiont-heartbeat`, 1 min) — seul
mécanisme de réveil fiable pour un service worker Chrome comme pour une page
d'événements Firefox. L'état critique est persisté à chaque réveil car Firefox
décharge la page d'événements sans émettre `onSuspend`.

## Limites connues restantes (Phase 3 — QA)

- Validation manuelle sur Firefox réel : rendu, P2P DataChannels entre deux
  profils, cycle de suspension/réveil de la page d'événements.
- Tests E2E Playwright à étendre à Firefox.
- Sur Chrome, PeerNetwork tourne en mode découverte seule (pas de
  RTCPeerConnection en service worker) — comportement journalisé, non bloquant.
