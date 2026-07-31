# Checklist QA Firefox (Phase 3)

Validation manuelle avant la première release publique. Ce qui est
automatisé en CI est marqué ✅ CI ; le reste demande un Firefox réel.

## Automatisé (CI — `.github/workflows/ci.yml`, job `firefox`)

- ✅ CI — Build Firefox (`npm run build:firefox`)
- ✅ CI — Lint AMO self-hosted 0 erreur (`npm run lint:firefox`)
- ✅ CI — Smoke test de rendu WebGL sur Firefox (`firefox-rendering.spec.ts`)
- ✅ CI — Tests unitaires du moteur de rendu + détection d'environnement

## Manuel — chargement & interface

- [ ] `npm run build:firefox`, puis `about:debugging` → « Charger un module
      temporaire » → `dist/manifest.json` : l'extension se charge sans erreur.
- [ ] Console `about:debugging` → « Inspecter » : aucune erreur au démarrage
      (CSP, permission, module manquant).
- [ ] Le popup s'ouvre, la police Inter s'affiche (pas de fallback système),
      aucune requête réseau externe (onglet Réseau vide hors backend voulu).
- [ ] L'organisme WebGL s'anime dans le popup : contours nets (supersampling),
      pas de franges sombres sur les bords (alpha prémultiplié), pulsation
      visible.

## Manuel — rendu background (spécifique Firefox)

- [ ] `chrome.storage.local` contient `symbiont_last_render` après une
      mutation (le rendu in-process de la page d'événements fonctionne).
- [ ] Fermer puis rouvrir le popup : le dernier rendu persisté se réaffiche.
- [ ] Comparer visuellement le rendu Firefox et Chrome : parité de qualité.

## Manuel — cycle de vie (page d'événements)

- [ ] Laisser l'extension inactive > 2 min, puis déclencher une action :
      le heartbeat `chrome.alarms` a réveillé le background (vérifier
      `symbiont_last_heartbeat` récent).
- [ ] Redémarrer Firefox : l'organisme et son état sont restaurés.

## Manuel — P2P (nécessite 2 profils Firefox)

- [ ] Deux profils Firefox, même extension chargée : découverte locale via
      BroadcastChannel (mêmes machine) → les pairs se voient.
- [ ] Un `RTCDataChannel` s'établit entre les deux (log `[PeerNetwork]`,
      pas de mode « discovery-only » sur Firefox).
- [ ] Rappel : Chrome reste en discovery-only (pas de WebRTC en service
      worker) — comportement attendu, non bloquant.

## Manuel — distribution & auto-update

- [ ] `npm run sign:firefox` (avec `WEB_EXT_API_KEY`/`WEB_EXT_API_SECRET`)
      produit un `.xpi` signé.
- [ ] Installer le `.xpi` signé via un lien direct : installation en un clic,
      sans mode développeur.
- [ ] Publier une version supérieure dans `updates.json` (via
      `scripts/update-updates-json.js`) et vérifier que Firefox propose la
      mise à jour automatiquement.

## Firefox pour Android (optionnel, hors périmètre release initiale)

- [ ] Chargement via Firefox Nightly Android + collection AMO.
- [ ] Note : `data_collection_permissions` et `optional_host_permissions`
      exigent Firefox Android ≥ 140 (déjà reflété dans `strict_min_version`).
