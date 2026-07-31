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

## Limites connues (chantiers Phase 2 — voir audit)

- Rendu WebGL background : la cible offscreen n'existe pas sur Firefox ; ajouter
  une cible « background-page » dans `WebGLOrchestrator` (fallback popup en attendant).
- Cycle de vie : remplacer le heartbeat `setInterval` par `chrome.alarms`.
- P2P : `RTCPeerConnection` fonctionne dans la page d'événements Firefox
  (contrairement au service worker Chrome) — à valider en intégration.
