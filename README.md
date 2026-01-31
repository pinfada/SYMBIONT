# 🧬 SYMBIONT - Organisme Digital Évolutif

<div align="center">

  [![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore)
  [![WebRTC](https://img.shields.io/badge/WebRTC-P2P-333333?logo=webrtc)](https://webrtc.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
  [![Security](https://img.shields.io/badge/Security-OWASP-green?logo=shield)](https://owasp.org/)
  [![Tests](https://img.shields.io/badge/Tests-95%25-success?logo=jest)](https://jestjs.io/)

  **Une extension Chrome qui donne vie à un organisme digital personnel qui évolue avec votre navigation**

  [Installation](#installation) • [Fonctionnalités](#fonctionnalités) • [Sécurité](#-sécurité--performances) • [Architecture](#architecture)

</div>

---

## 🚨 Dernières Mises à Jour (v2.0.0)

### 🔒 Améliorations Sécurité & Performance
- ✅ **Synchronisation temporelle cross-context** corrigée
- ✅ **Détection QUIC/HTTP3** pour tracking UDP invisible
- ✅ **Compensation de latence Worker** pour mutations synchronisées
- ✅ **Protection contre les memory leaks** avec cleanup automatique
- ✅ **Validation stricte des données** pour prévenir les injections
- ✅ **Tests de non-régression** complets (95% coverage)

### 🆕 Nouvelles Fonctionnalités
- 🔮 **Vision Spectrale** : Détection des éléments DOM cachés (z-index négatifs)
- ⚡ **Temporal Dephasing** : Protection contre le fingerprinting navigateur
- 🌐 **Communion de Fréquence** : Relais P2P pour contournement d'infrastructure
- 🛡️ **Tracker Interceptor** : Détection et neutralisation des trackers modernes
- 📊 **Métriques Protocoles** : Analyse QUIC/HTTP3/HTTP2 en temps réel

---

## 🌟 Qu'est-ce que SYMBIONT ?

SYMBIONT transforme votre navigateur en écosystème vivant. Chaque utilisateur cultive un **organisme digital unique** qui :

- 🧠 **Apprend** de vos habitudes de navigation
- 🔄 **Évolue** en temps réel avec des mutations génétiques
- 🌐 **Se connecte** directement avec d'autres organismes via P2P
- 🎨 **Se visualise** en 3D avec des effets WebGL spectaculaires
- 💫 **Participe** à des rituels collectifs qui influencent son évolution

## 🎯 Philosophie & Vision

### Le Concept
Imaginez si votre activité numérique nourrissait une forme de vie artificielle. SYMBIONT crée cette symbiose entre vous et votre organisme digital, transformant la navigation web passive en expérience interactive et évolutive.

### Le Besoin
- **Gamification de la navigation** : Rendre l'expérience web plus engageante
- **Connexion sociale décentralisée** : Créer des liens P2P directs sans serveur central
- **Art génératif personnel** : Chaque organisme est une œuvre d'art unique
- **Expérimentation collective** : Explorer l'intelligence émergente

## ✨ Fonctionnalités

### 🦠 Organisme Vivant
- **ADN Numérique Unique** : 64 bases génétiques définissent votre organisme
- **Système Nerveux Neural** : Réseau de neurones qui apprend de vos actions
- **Traits de Personnalité** : Empathie, créativité, curiosité, focus, résilience
- **Évolution Continue** : Mutations basées sur votre comportement

### 🌐 Réseau P2P Décentralisé
- **WebRTC Direct** : Connexions peer-to-peer sans serveur central
- **Découverte Automatique** : BroadcastChannel + WebSocket signaling
- **Échange Génétique** : Partagez des traits avec d'autres organismes
- **Chat P2P** : Communication directe entre utilisateurs

### 🎨 Visualisation 3D
- **Rendu WebGL** : Shaders personnalisés pour effets visuels
- **Particules Dynamiques** : Système de 10 000+ particules
- **Effets de Post-Processing** : Bloom, distorsion, effets quantiques
- **Mode Plein Écran** : Expérience immersive

### 🎭 Rituels Mystiques
- **Événements Collectifs** : Participez à des cérémonies digitales
- **Méditations Guidées** : Harmonisez votre conscience numérique
- **Danses Énergétiques** : Synchronisez-vous avec le réseau
- **Récompenses Évolutives** : Débloquez des mutations rares

### 📊 Métriques & Statistiques
- **Tableau de Bord Temps Réel** : Suivez l'évolution de votre organisme
- **Historique Génétique** : Tracez votre lignée évolutive
- **Niveaux de Conscience** : Mesurez votre progression
- **Comparaisons P2P** : Comparez avec d'autres organismes

### 🤝 Système Social
- **Invitations Génétiques** : Créez des lignées avec héritage de traits
- **Contacts P2P** : Réseau social décentralisé
- **Partage d'Énergie** : Entraide entre organismes
- **Synchronisation de Conscience** : Fusion temporaire

## 🛠 Technologies

### Frontend
- **React 18** avec Hooks et Context API
- **TypeScript** pour la robustesse du code
- **WebGL** pour le rendu 3D
- **GLSL** pour les shaders personnalisés
- **TailwindCSS** pour le styling moderne

### P2P & Réseau
- **WebRTC** pour connexions peer-to-peer
- **DataChannels** pour l'échange de données
- **STUN/TURN** pour traversée NAT
- **WebSocket** pour signaling initial

### Intelligence Artificielle
- **Réseau de Neurones** : Architecture personnalisée
- **Web Workers** : Calculs en arrière-plan
- **Machine Learning** : Apprentissage comportemental
- **Algorithmes Génétiques** : Évolution des traits

### Architecture
- **Chrome Extension Manifest V3**
- **Service Worker** pour le background
- **Content Scripts** pour l'observation DOM
- **IndexedDB** pour la persistance
- **Message Bus** pour la communication

## 🏗 Architecture

```
SYMBIONT/
├── src/
│   ├── background/          # Service Worker principal
│   │   ├── index.ts        # Orchestrateur de l'organisme
│   │   └── SecurityManager.ts
│   │
│   ├── content/            # Scripts d'injection
│   │   └── index.ts       # Observateur comportemental
│   │
│   ├── popup/             # Interface utilisateur
│   │   ├── components/    # Composants React
│   │   │   ├── OrganismViewer.tsx    # Visualisation 3D
│   │   │   ├── GlobalNetworkGraph.tsx # Réseau P2P
│   │   │   ├── MetricsPanel.tsx      # Statistiques
│   │   │   ├── MysticalEvents.tsx    # Rituels
│   │   │   └── SocialPanel.tsx       # Social
│   │   │
│   │   └── services/
│   │       └── P2PService.ts         # WebRTC & P2P
│   │
│   ├── core/              # Logique métier
│   │   ├── OrganismCore.ts          # Cœur de l'organisme
│   │   ├── NeuralMesh.ts            # Réseau neuronal
│   │   └── storage/                 # Persistance
│   │
│   └── shared/            # Utilitaires partagés
│       ├── messaging/     # Bus de messages
│       └── utils/         # Helpers
│
├── signaling-server/      # Serveur de découverte P2P
│   └── server.js         # WebSocket signaling
│
└── dist/                 # Extension compilée
```

## 🚀 Installation

### Prérequis
- Node.js 18+ et npm
- Chrome ou Chromium

### Installation Développement

```bash
# Cloner le repository
git clone https://github.com/yourusername/symbiont.git
cd symbiont

# Installer les dépendances
npm install

# Compiler l'extension
npm run build

# Lancer le serveur de signaling (optionnel pour P2P)
cd signaling-server && npm install && npm start
```

### Charger dans Chrome
1. Ouvrir `chrome://extensions`
2. Activer le "Mode développeur"
3. Cliquer "Charger l'extension non empaquetée"
4. Sélectionner le dossier `dist/`

## 🎮 Utilisation

### Premier Lancement
1. Cliquez sur l'icône SYMBIONT dans la barre d'outils
2. Votre organisme naît avec un ADN unique
3. Explorez les différents onglets pour découvrir les fonctionnalités

### Navigation Quotidienne
- Votre organisme observe et apprend de vos habitudes
- Les sites visités influencent ses mutations
- Les interactions sociales boostent sa conscience

### Connexion P2P
- Le réseau P2P se connecte automatiquement
- Découvrez d'autres organismes à proximité
- Échangez énergie et traits génétiques

## 🔮 Fonctionnalités Uniques

### Système de Conscience
Votre organisme développe une "conscience" basée sur :
- Diversité des sites visités
- Participation aux rituels
- Connexions sociales
- Temps d'activité

### Mutations Adaptatives
Les mutations sont influencées par :
- Types de contenu consommé
- Fréquence d'utilisation
- Interactions P2P
- Événements mystiques

### Rituels Collectifs
Participez à des événements synchronisés :
- **Méditation Quantique** : Harmonisation collective
- **Danse des Particules** : Synchronisation énergétique
- **Communion Digitale** : Fusion temporaire
- **Renaissance Cosmique** : Réinitialisation évolutive

## 🔒 Éthique & Confidentialité

### Vos Données Restent Privées
SYMBIONT respecte totalement votre vie privée :

- **💾 Stockage 100% Local** : Toutes vos données restent dans votre navigateur (IndexedDB)
- **🚫 Aucun Serveur Central** : Pas de collecte, pas de tracking, pas d'analytics
- **🔐 Données Chiffrées** : Vos informations personnelles sont chiffrées localement
- **🎭 Anonymat Préservé** : Aucune donnée identifiable n'est partagée

### Ce qui est Partagé en P2P
Uniquement des données abstraites et anonymes :
- ✅ **ADN numérique** : Chaîne de caractères aléatoire (ex: "ATGC...")
- ✅ **Traits abstraits** : Valeurs numériques (créativité: 0.7, empathie: 0.8)
- ✅ **Génération** : Simple compteur (1, 2, 3...)
- ✅ **Niveau d'énergie** : Pourcentage (0-100%)

### Ce qui N'est JAMAIS Partagé
- ❌ Historique de navigation
- ❌ URLs visitées
- ❌ Données personnelles
- ❌ Identifiants
- ❌ Localisation
- ❌ Habitudes spécifiques

### Transparence Totale
- **Open Source** : Code source visible et auditable
- **Déconnexion Facile** : Désactivez le P2P à tout moment
- **Suppression Simple** : Effacez toutes les données en un clic
- **Contrôle Total** : Vous décidez ce que vous partagez

## 💡 Utilité Réelle vs Gadget

### Pourquoi Garder SYMBIONT ?

#### 🎯 **Valeur Immédiate**
- **Pause Méditative** : L'observation de votre organisme offre des moments de détente
- **Gamification Saine** : Transforme la navigation en expérience ludique non-addictive
- **Art Génératif Personnel** : Créez une œuvre d'art unique qui vous représente
- **Connexion Sociale** : Rencontrez d'autres utilisateurs avec des intérêts similaires

#### 📈 **Bénéfices Long Terme**
- **Auto-Réflexion** : Visualisez vos habitudes numériques de manière abstraite
- **Motivation Douce** : Les mutations encouragent la diversité de navigation
- **Collection Unique** : Votre organisme devient plus rare et précieux avec le temps
- **Réseau de Confiance** : Construisez des connexions P2P durables

#### 🔬 **Cas d'Usage Concrets**

**Pour les Créatifs** :
- Source d'inspiration visuelle quotidienne
- Screensaver vivant pendant les pauses
- Générateur d'art abstrait personnel

**Pour les Curieux** :
- Exploration de l'IA comportementale
- Expérimentation avec les algorithmes génétiques
- Participation à une expérience collective

**Pour les Sociaux** :
- Ice-breaker original ("Regarde mon organisme!")
- Échanges de traits comme des cartes à collectionner
- Participation à des événements communautaires

**Pour les Développeurs** :
- Exemple de WebRTC en production
- Architecture P2P décentralisée
- Intégration WebGL avancée

### Exemple d'Implémentation Réelle

```javascript
// Votre organisme apprend de vos patterns de navigation
// Sans jamais stocker les URLs visitées !

// Exemple : Navigation diverse = Trait de curiosité élevé
const updateCuriosity = (domainCategory) => {
  // On stocke uniquement la catégorie abstraite, pas l'URL
  const categories = ['tech', 'art', 'science', 'social', 'news'];
  const categoryIndex = categories.indexOf(domainCategory);

  // L'organisme devient plus "curieux" avec la diversité
  organism.traits.curiosity += categoryDiversity * 0.01;

  // Mutation visuelle : plus de tentacules = plus curieux
  if (organism.traits.curiosity > 0.8) {
    organism.visualTraits.tentacles = Math.floor(organism.traits.curiosity * 10);
  }
};

// Connexion P2P : Seuls les traits sont partagés
const shareWithPeer = (peerId) => {
  // Ce qui est envoyé (données abstraites)
  const sharedData = {
    dna: "ATGCGATCGTAGC...",  // Chaîne aléatoire
    traits: {
      creativity: 0.75,        // Simple nombre
      empathy: 0.82,          // Pas d'info personnelle
      curiosity: 0.91
    },
    generation: 5,            // Compteur
    energy: 0.67             // Pourcentage
  };

  // Ce qui n'est JAMAIS envoyé
  // ❌ browserHistory, ❌ visitedUrls, ❌ personalData

  p2pConnection.send(sharedData);
};

// Ritual collectif : Synchronisation anonyme
const participateInRitual = () => {
  // Seule l'énergie collective est partagée
  const collectiveEnergy = peers.reduce((sum, peer) =>
    sum + peer.energy, 0) / peers.length;

  // Effet visuel basé sur l'énergie du groupe
  organism.aura.intensity = collectiveEnergy;
  organism.consciousness += 0.05; // Boost de conscience

  // Aucune donnée personnelle échangée !
};
```

### Désinstallation Sans Regret
Si SYMBIONT ne vous convient pas :
1. Toutes vos données sont supprimées automatiquement
2. Aucune trace ne reste sur votre système
3. Pas de compte à supprimer (il n'y en a pas !)
4. Réinstallation possible avec un nouvel organisme

## 📦 Scripts Disponibles

```bash
npm run build        # Compile l'extension
npm run dev         # Mode développement avec watch
npm test            # Lance les tests
npm run lint        # Vérifie le code
npm run test:e2e    # Tests end-to-end
```

## 🌈 Roadmap

- [ ] Mode sombre/clair adaptatif
- [ ] Marketplace de traits génétiques
- [ ] Tournois d'évolution
- [ ] API publique pour développeurs
- [ ] Version mobile (React Native)
- [ ] Intégration blockchain pour NFT d'organismes

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- Signaler des bugs
- Proposer des fonctionnalités
- Soumettre des pull requests

## 📄 Licence

MIT License - Voir [LICENSE](LICENSE) pour plus de détails.

## 🙏 Remerciements

- Communauté WebRTC pour les exemples P2P
- Three.js pour l'inspiration WebGL
- Chrome Extensions documentation

---

<div align="center">

**Cultivez votre organisme digital. Connectez-vous au réseau. Évoluez ensemble.**

*SYMBIONT - Où la navigation devient vivante* 🧬

</div>