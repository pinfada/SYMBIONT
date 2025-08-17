# Onboarding SYMBIONT – Guide Complet

## 👥 Pour les Utilisateurs
### Objectif
Guider l'utilisateur dans l'activation et la prise en main de l'organisme numérique SYMBIONT, en respectant les rituels de transmission, la sécurité et l'expérience immersive.

## 🧑‍💻 Pour les Développeurs
### Prérequis
- Node.js 18+ et npm 8+
- Connaissance TypeScript/React
- Familiarité avec les extensions Chrome
- Accès à PostgreSQL et Redis (pour le backend)

## Étapes de l’onboarding

1. **Écran d’introduction**
   - Présentation du concept : organisme vivant, transmission, art génératif.
   - Murmure d’accueil contextuel (heure/jour).

2. **Permissions**
   - Demande d’accès aux onglets/navigation (explication transparente, pas de collecte de données personnelles).
   - Feedback sur la sécurité et la confidentialité.

3. **Rituel d’activation par invitation**
   - Saisie du code d’invitation reçu.
   - Vérification et consommation du code (feedback immédiat : succès/erreur).
   - Affichage du lien symbolique (couleur/motif unique).
   - Création de l’organisme uniquement après activation réussie.

4. **Personnalisation initiale**
   - Choix d’un emoji, d’une couleur, de traits comportementaux.
   - Visualisation de l’organisme généré.

5. **Découverte des rituels**
   - Transmission : possibilité de générer des invitations pour transmettre l’organisme.
   - Rituels secrets : codes spéciaux, mutations partagées, réveil collectif.
   - Murmures contextuels : messages adaptatifs selon l’usage.

6. **Feedback immersif**
   - Notifications visuelles (halo, badges, murmures).
   - Historique de transmission et visualisation de la lignée.

## Sécurité & confidentialité
- Aucune donnée personnelle collectée.
- Stockage local (IndexedDB/chrome.storage), pas de synchronisation externe par défaut.
- Permissions minimales, explicitées à l’utilisateur.

## Bonnes pratiques d'onboarding
- Toujours donner un feedback immédiat (succès, erreur, progression).
- Rendre chaque étape immersive (visuel, murmure, animation).
- Encourager la transmission et la découverte des rituels.
- Proposer un accès facile à la documentation et à l'export des données.

---

## 🚀 Guide de Démarrage Développeur

### Installation rapide
```bash
# 1. Clone et installation
git clone <repo-url>
cd SYMBIONT
npm install

# 2. Configuration backend
cd backend
npm install
cp .env.example .env
# Configurer DATABASE_URL, REDIS_URL, JWT_SECRET

# 3. Base de données
npm run migrate
npm run seed

# 4. Démarrage
npm run dev  # Backend
cd .. && npm run dev  # Extension en mode développement
```

### Structure du projet
```
SYMBIONT/
├── src/                 # Code source extension
│   ├── background/      # Service worker
│   ├── content/         # Scripts injectés
│   ├── popup/           # Interface utilisateur
│   ├── core/            # Logique métier
│   └── shared/          # Types et utilitaires
├── backend/             # API Express.js
│   ├── src/services/    # Services métier
│   ├── prisma/          # Schema DB et migrations
│   └── dist/            # Compiled JavaScript
├── docs/                # Documentation complète
└── tests/               # Tests unitaires et E2E
```

### Première contribution
1. **Lire la documentation** dans `/docs/`
2. **Configurer l'environnement** de développement
3. **Lancer les tests** : `npm test`
4. **Créer une branche** : `git checkout -b feature/my-feature`
5. **Développer** en suivant les patterns existants
6. **Tester** : coverage ≥ 80%
7. **Soumettre une PR** avec description détaillée

### Outils de développement
- **Chrome DevTools** : debugging extension
- **Prisma Studio** : visualisation base de données
- **Jest + Playwright** : tests automatisés
- **ESLint + Prettier** : qualité de code
- **TypeScript** : typage statique