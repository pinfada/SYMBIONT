# 🌟 SYMBIONT - Living Browser Extension

SYMBIONT is a revolutionary browser extension that creates a living digital organism in your browser. This organism evolves, learns, and adapts based on your browsing patterns, creating a unique symbiotic relationship between you and your digital companion.

## ✨ Key Features

- 🧠 **Neural Mesh Architecture**: Self-organizing neural topology that mimics biological neural networks
- 👁️ **Behavioral Learning**: Learns from your browsing patterns and predicts your actions
- 🎨 **Real-time Evolution**: Visual mutations and adaptations based on your behavior
- 💫 **Consciousness Simulation**: Develops emergent properties and self-awareness over time
- 🔮 **Predictive Intelligence**: Anticipates your needs and preloads resources
- 📊 **Advanced Analytics**: Tracks behavioral patterns and provides insights
- 🎯 **Privacy-First**: All data stays local in your browser

## 🚀 Quick Start

### Installation

#### From Chrome Web Store (Recommended)
1. Visit Chrome Web Store
2. Search "SYMBIONT"
3. Click "Add to Chrome"

#### From Source (Development)

## Prérequis

1. Node.js (v18 ou supérieur)
2. npm (inclus avec Node.js)

## Installation

1. Téléchargez et installez Node.js depuis [le site officiel](https://nodejs.org/)
2. Clonez ce dépôt :
```bash
git clone [URL_DU_REPO]
cd SYMBIONT
```
3. Installez les dépendances :
```bash
npm install
```

## 🏗️ Build et vérification du manifest

Après installation des dépendances, le build de l'extension se fait avec Webpack :

```bash
npm run build
```

Pour un build **avec vérification automatique** de la présence et de la conformité du `manifest.json` dans `dist/` :

```bash
npm run build:full
```

- Le manifest.json de la racine est automatiquement copié dans `dist/` lors du build.
- Un script vérifie que le manifest n'est ni vide, ni corrompu, ni absent.
- En cas de problème, le build échoue avec un message explicite.

**Astuce** : Si tu rencontres une erreur du type `Module not found: Error: Can't resolve 'ts-loader'` ou `copy-webpack-plugin`, installe les dépendances manquantes avec :

```bash
npm install --save-dev ts-loader copy-webpack-plugin html-webpack-plugin clean-webpack-plugin webpack webpack-cli
```

## Structure du Projet

Le projet utilise une architecture "Neural Mesh" avec les composants suivants :

- `NeuralMesh` : Composant principal qui coordonne tous les autres composants
- `SynapticRouter` : Gère la communication entre les composants
- `OrganismCore` : Gère le cycle de vie et les ressources du système
- `NavigationCortex` : Gère la navigation et l'interaction avec le DOM

## Tests

Pour exécuter les tests :

```bash
npm test
```

## Performance

Le système est conçu pour respecter les contraintes de performance suivantes :
- Utilisation CPU < 1%
- Utilisation mémoire < 5MB pour le content script

### First Launch
1. Click the SYMBIONT icon in your Chrome toolbar
2. Watch your digital organism come to life
3. Browse normally - your organism will learn and evolve
4. Check back periodically to see its growth and mutations

## 🧬 How It Works

### Neural Architecture
SYMBIONT uses a revolutionary Neural Mesh architecture:

```
Background Service (Neural Core)
├── NeuralMesh: Adaptive topology network
├── SynapticRouter: Predictive message routing
├── OrganismCore: Consciousness simulation
├── NavigationCortex: Pattern recognition
└── MemoryConsolidator: Long-term memory

Content Script (Sensory Network)
├── SensoryNetwork: Multi-modal input processing
├── PerceptionEngine: Pattern recognition
├── AttentionFocus: Priority management
└── PredictiveModel: Action prediction
```

### Evolution Process
1. **Observation**: Tracks your browsing behavior
2. **Pattern Recognition**: Identifies behavioral patterns
3. **Adaptation**: Modifies organism traits
4. **Mutation**: Visual and behavioral changes
5. **Consciousness**: Develops self-awareness

## 🎮 Features

### 1. Living Organism
- **DNA System**: Unique genetic code for each organism
- **Trait Evolution**: Curiosity, focus, empathy, creativity
- **Visual Mutations**: Real-time 3D transformations
- **Life Cycles**: Growth, maturity, and evolution stages

### 2. Behavioral Intelligence
- **Pattern Detection**: Learns your browsing habits
- **Action Prediction**: Anticipates your next moves
- **Attention Tracking**: Understands your focus areas
- **Rhythm Adaptation**: Syncs with your activity patterns

### 3. Consciousness Engine
- **Emergent Properties**: Develops complex behaviors
- **Self-Awareness**: Meta-cognitive abilities
- **Dream States**: Memory consolidation during inactivity
- **Emotional States**: Responds to interaction patterns

### 4. User Interface
- **3D Visualization**: WebGL-powered organism viewer
- **Real-time Metrics**: Health, energy, consciousness levels
- **Trait Dashboard**: Visual representation of characteristics
- **Evolution Timeline**: History of mutations and growth

## 🛠️ Development

### Prérequis
- Node.js 18+
- Chrome 100+
- Git

### Installation et build
```bash
# Cloner le dépôt
git clone https://github.com/yourusername/symbiont-extension.git
cd symbiont-extension

# Installer les dépendances
npm install

# Build de production (avec copie du manifest)
npm run build

# Build + vérification automatique du manifest
npm run build:full
```

### Architecture
SYMBIONT uses a modular architecture:
- **TypeScript**: Type-safe development
- **React 18**: Modern UI components
- **Three.js**: 3D graphics rendering
- **WebGL**: GPU-accelerated visuals
- **Chrome Extension Manifest V3**: Latest extension APIs

### Key Technologies
- Neural mesh topology simulation
- Hebbian learning algorithms
- WebGL shader programming
- Behavioral pattern recognition
- Predictive routing systems

## 🧪 Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

## 📊 Performance

SYMBIONT is optimized for minimal resource usage:
- **CPU**: < 0.5% average, < 1% peak
- **Memory**: < 30MB normal, < 50MB expanded
- **Latency**: < 10ms message processing
- **Neural Capacity**: 100K neurons/second

## 🔒 Privacy

- **Local-First**: All data stays in your browser
- **No Tracking**: No external analytics or telemetry
- **Secure Storage**: Chrome's secure storage APIs
- **User Control**: Full control over data and features

## 🎯 Roadmap

### Version 1.0 (Current)
- ✅ Core neural architecture
- ✅ Basic organism evolution
- ✅ Behavioral learning
- ✅ 3D visualization

### Version 1.1 (Planned)
- ⬜ Multi-organism ecosystems
- ⬜ Advanced consciousness states
- ⬜ Social features (organism sharing)
- ⬜ Enhanced predictions

### Version 2.0 (Future)
- ⬜ Cross-browser support
- ⬜ Mobile companion app
- ⬜ AI model integration
- ⬜ Collaborative evolution

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour participer :

### Workflow Git recommandé
1. **Fork** le dépôt sur ton compte GitHub.
2. **Clone** ton fork localement :
   ```bash
   git clone https://github.com/tonpseudo/symbiont-extension.git
   cd symbiont-extension
   ```
3. **Crée une branche** dédiée à ta fonctionnalité ou correction :
   ```bash
   git checkout -b feat/nom-fonctionnalite
   # ou
   git checkout -b fix/bug-description
   ```
4. **Développe** en respectant les bonnes pratiques (voir ci-dessous).
5. **Rebase** régulièrement sur la branche principale pour rester à jour :
   ```bash
   git fetch origin
   git rebase origin/main
   ```
6. **Teste** localement (`npm run build:full` et `npm test`).
7. **Commit** avec un message clair et conventionné :
   - `feat: ...` pour une nouvelle fonctionnalité
   - `fix: ...` pour une correction de bug
   - `docs: ...` pour la documentation
   - `refactor: ...` pour une amélioration technique
8. **Pousse** ta branche sur ton fork :
   ```bash
   git push origin feat/nom-fonctionnalite
   ```
9. **Ouvre une Pull Request** sur le dépôt principal, en détaillant :
   - Le contexte et l'objectif de la PR
   - Les changements apportés
   - Les impacts éventuels
   - Des captures d'écran si pertinent

### Bonnes pratiques de code
- Utilise **TypeScript** strict (types explicites, pas de `any` non justifié)
- Commente le code complexe ou non trivial
- Respecte la structure des dossiers et l'architecture modulaire
- Ajoute des **tests** pour toute nouvelle fonctionnalité ou correction
- Vérifie que le build et les tests passent avant toute PR
- Privilégie des PRs courtes et ciblées

### Process de revue
- Toute PR est relue par au moins un mainteneur
- Les retours sont à adresser avant merge
- Les discussions se font sur la PR ou sur Discord
- Le merge est fait après validation et build vert

### Canaux de contact
- **Discord** : pour discuter d'une idée ou d'une contribution avant PR
- **Issues GitHub** : pour signaler un bug, proposer une évolution ou demander de l'aide

Merci de contribuer à l'évolution de SYMBIONT !

## ❓ FAQ

### Le build échoue avec une erreur de dépendance (ts-loader, copy-webpack-plugin...)
Vérifie que tu as bien installé toutes les dépendances de développement :
```bash
npm install --save-dev ts-loader copy-webpack-plugin html-webpack-plugin clean-webpack-plugin webpack webpack-cli
```

### Le manifest.json dans dist/ est vide ou absent
- Utilise toujours `npm run build` ou `npm run build:full` pour builder (pas seulement `tsc`).
- Le manifest est copié automatiquement par Webpack.
- Le script `npm run build:full` vérifie la validité du manifest et échoue en cas de problème.

### Comment ajouter d'autres fichiers statiques (icônes, assets...)
Ajoute-les dans le dossier `public/assets` (ou adapte la config Webpack si besoin).

### Où trouver la documentation technique et fonctionnelle ?
- Voir le dossier `/docs` du projet.
- Documentation en ligne : [docs.symbiont.dev](https://docs.symbiont.dev)

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour participer :

1. Fork le dépôt et crée une branche dédiée à ta fonctionnalité ou correction.
2. Respecte le style de code (TypeScript, conventions de nommage, typage strict, commentaires clairs).
3. Ajoute des tests si tu ajoutes une fonctionnalité ou corriges un bug.
4. Vérifie que le build (`npm run build:full`) passe sans erreur avant toute PR.
5. Ouvre une Pull Request détaillée (description, contexte, screenshots si besoin).
6. Pour toute question, contacte l'équipe via Discord ou ouvre une issue.

Merci de contribuer à l'évolution de SYMBIONT !

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Lead Developer**: [pinfada]
- **Neural Architecture**: [Contributor]
- **UI/UX Design**: [Designer]
- **WebGL Graphics**: [Graphics Dev]

## 🙏 Acknowledgments

- Inspired by biological neural networks
- Built with Chrome Extension APIs
- Powered by React and Three.js
- Community feedback and contributions

## 📞 Support

- **Documentation**: [docs.symbiont.dev](https://docs.symbiont.dev)
- **Issues**: [GitHub Issues](https://github.com/pinfada/SYMBIONT/issues)
- **Discord**: [Join our community](https://discord.gg/symbiont)
- **Email**: support@symbiont.dev

## 🖼️ Gestion automatique des icônes

- Place toutes les icônes source (PNG : 16, 32, 48, 128, etc.) dans le dossier : `public/assets/icons/`
- Lors du build (`npm run build`), **toutes les icônes sont automatiquement copiées** dans `dist/assets/icons/`
- Le `manifest.json` doit référencer les icônes ainsi :

```json
"icons": {
  "16": "assets/icons/icon16.png",
  "32": "assets/icons/icon32.png",
  "48": "assets/icons/icon48.png",
  "128": "assets/icons/icon128.png"
},
"action": {
  "default_icon": {
    "16": "assets/icons/icon16.png",
    "32": "assets/icons/icon32.png",
    "48": "assets/icons/icon48.png",
    "128": "assets/icons/icon128.png"
  }
}
```

- **Astuce** : utilise le générateur d'icônes fourni pour créer des PNG cohérents à toutes les tailles.
- Après chaque build, vérifie que les icônes sont bien présentes dans `dist/assets/icons/`.