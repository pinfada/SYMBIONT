# Navigateurs & installation

SYMBIONT est une extension **Manifest V3** compatible avec les deux grandes
familles de navigateurs.

| Navigateur | Statut | Installation | Notes |
|---|---|---|---|
| 🦊 **Firefox** 140+ | ✅ Supporté (recommandé) | `.xpi` signé, GitHub + **mises à jour automatiques** | Rendu WebGL et maille P2P WebRTC pleinement fonctionnels |
| 🦊 **Firefox Android** 140+ | ⚠️ Expérimental | collection AMO | Non validé pour la release initiale |
| 🌐 **Chrome / Chromium** 120+ | ✅ Supporté | Mode développeur (dossier `dist/`) | P2P WebRTC en mode découverte seule (limite service worker MV3) |
| 🌐 **Edge / Brave / Opera** 120+ | ✅ Compatible | Comme Chrome (base Chromium) | Non testé formellement |
| 🦁 **Safari** | ❌ Non supporté | — | Architecture d'extension incompatible |

> **Pourquoi Firefox est le canal recommandé** : Firefox permet de distribuer un
> `.xpi` signé par Mozilla tout en l'hébergeant soi-même (sur GitHub) *avec*
> mises à jour automatiques — sans passer par un store. Chrome réserve
> l'installation grand public au Chrome Web Store.

---

## Installation Firefox (recommandé)

**Utilisateur** — ouvrir le fichier `.xpi` de la
[dernière release](https://github.com/pinfada/SYMBIONT/releases) directement dans
Firefox → installation en un clic. Mises à jour automatiques ensuite.

**Développeur** :
```bash
git clone https://github.com/pinfada/SYMBIONT.git
cd SYMBIONT
npm install
npm run build:firefox
```
Puis : `about:debugging` → **Ce Firefox** → **Charger un module complémentaire
temporaire** → `dist/manifest.json`.

---

## Installation Chrome / Chromium

```bash
git clone https://github.com/pinfada/SYMBIONT.git
cd SYMBIONT
npm install
npm run build
```
Puis : `chrome://extensions` → **Mode Développeur** → **Charger l'extension non
empaquetée** → sélectionner `dist/`.

---

## Vie privée

- **Tout le traitement est local.** Aucune donnée personnelle transmise.
- L'interface ne fait **aucune requête externe** (polices auto-hébergées).
- Ce qui est partagé en P2P : uniquement des **signatures anonymes** de menaces
  et des traits abstraits d'organisme — jamais votre historique, vos URLs ou vos
  contenus.
