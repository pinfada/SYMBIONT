# Installation SYMBIONT

## 🚀 Installation Rapide

### Méthode 1 : Chrome Web Store (Recommandée)

> **Note** : SYMBIONT n'est pas encore publié sur le Chrome Web Store. Utilisez l'installation manuelle pour le moment.

### Méthode 2 : Installation Manuelle (Développeur)

#### Prérequis
- **Google Chrome** : Version 88 ou plus récente
- **Git** : Pour cloner le repository
- **Node.js** : Version 18+ avec npm

#### Étapes d'Installation

1. **Cloner le repository**
   ```bash
   git clone https://github.com/pinfada/SYMBIONT.git
   cd SYMBIONT
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Construire l'extension**
   ```bash
   npm run build
   ```

4. **Charger l'extension dans Chrome**
   - Ouvrir Chrome et aller à `chrome://extensions`
   - Activer le "Mode développeur" (coin supérieur droit)
   - Cliquer sur "Charger l'extension non empaquetée"
   - Sélectionner le dossier `dist/` du projet

5. **Vérifier l'installation**
   - L'icône SYMBIONT devrait apparaître dans la barre d'outils Chrome
   - Cliquer sur l'icône pour ouvrir le popup principal

## ⚙️ Configuration Initiale

### Première Configuration

Au premier lancement, SYMBIONT vous guidera dans la configuration initiale :

1. **Génération de l'Organisme**
   - Votre organisme unique sera créé automatiquement
   - Traits de base déterminés aléatoirement
   - Génération de l'ADN personnalisé

2. **Paramètres de Confidentialité**
   - Choisir le niveau de collecte de données
   - Configurer les préférences d'anonymat
   - Définir les paramètres RGPD

3. **Préférences d'Interface**
   - Sélectionner le thème visuel
   - Configurer les notifications
   - Régler les raccourcis clavier

## 🔧 Configuration Avancée

### Variables d'Environnement

Créer un fichier `.env` dans le répertoire racine :

```env
# Configuration de base
NODE_ENV=production
SYMBIONT_VERSION=1.0.0

# Sécurité
ENABLE_SECURE_RANDOM=true
ENABLE_SECURE_LOGGING=true
CRYPTO_KEY_SIZE=256

# Performance
WEBGL_OPTIMIZATION=true
NEURAL_WORKER_THREADS=4
STORAGE_COMPRESSION=true

# Social
ENABLE_P2P_NETWORKING=true
MAX_PEER_CONNECTIONS=10
RITUAL_PARTICIPATION=true

# Développement uniquement
DEBUG_MODE=false
VERBOSE_LOGGING=false
```

### Configuration Chrome

#### Permissions Requises
SYMBIONT nécessite les permissions suivantes :
- `storage` : Sauvegarde des données de l'organisme
- `activeTab` : Observation du comportement de navigation
- `background` : Service worker pour l'IA
- `webgl` : Rendu 3D des organismes

#### Configuration de Sécurité
Pour une sécurité optimale :
1. Désactiver les extensions non fiables
2. Utiliser Chrome en mode sécurisé
3. Activer la navigation sécurisée
4. Maintenir Chrome à jour

## 🧪 Validation de l'Installation

### Tests de Base

Exécuter les tests pour vérifier l'installation :

```bash
# Tests rapides
npm test

# Tests de sécurité
npm run test:security

# Tests d'intégration
npm run test:integration

# Tests E2E
npm run test:e2e
```

### Vérifications Manuelles

1. **Interface Utilisateur**
   - ✅ Le popup s'ouvre correctement
   - ✅ L'organisme est visible en 3D
   - ✅ Les métriques s'affichent

2. **Fonctionnalités Core**
   - ✅ L'organisme réagit à la navigation
   - ✅ Les mutations sont enregistrées
   - ✅ La mémoire persiste entre les sessions

3. **Sécurité**
   - ✅ Les données sont chiffrées
   - ✅ Aucune fuite de données sensibles
   - ✅ Les logs respectent la confidentialité

## 🛠️ Dépannage Installation

### Problèmes Courants

#### Extension ne se charge pas
**Symptômes** : L'extension n'apparaît pas après installation
**Solutions** :
- Vérifier que le mode développeur est activé
- S'assurer que le dossier `dist/` contient les fichiers construits
- Relancer `npm run build` si nécessaire
- Redémarrer Chrome

#### Erreurs de Build
**Symptômes** : `npm run build` échoue
**Solutions** :
```bash
# Nettoyer les dépendances
rm -rf node_modules package-lock.json
npm install

# Nettoyer le build
rm -rf dist/
npm run build

# Vérifier Node.js version
node --version  # Doit être >= 18
```

#### Performance Dégradée
**Symptômes** : Extension lente ou Chrome ralenti
**Solutions** :
- Réduire le nombre d'onglets ouverts
- Désactiver autres extensions gourmandes
- Ajuster les paramètres de performance dans SYMBIONT
- Redémarrer Chrome

#### Problèmes WebGL
**Symptômes** : Organisme 3D ne s'affiche pas
**Solutions** :
- Vérifier que WebGL est activé : `chrome://gpu`
- Mettre à jour les drivers graphiques
- Tester sur `https://get.webgl.org`
- Activer l'accélération matérielle dans Chrome

### Logs de Diagnostic

Pour diagnostiquer les problèmes :

1. **Console Chrome** : `F12` → Console
2. **Extension DevTools** : `chrome://extensions` → "Inspecter les vues"
3. **Logs SYMBIONT** : Disponibles dans l'interface de l'extension

## ⬆️ Mise à Jour

### Mise à Jour Manuelle

```bash
# Récupérer les dernières modifications
git pull origin main

# Réinstaller les dépendances si nécessaire
npm install

# Reconstruire
npm run build

# Recharger l'extension dans Chrome
# chrome://extensions → Recharger
```

### Migration des Données

SYMBIONT préserve automatiquement :
- ✅ L'organisme et ses traits
- ✅ L'historique comportemental
- ✅ Les connexions sociales
- ✅ Les paramètres personnalisés

## 📞 Support

Si vous rencontrez des difficultés :
- **Documentation** : [Troubleshooting](Troubleshooting)
- **Issues GitHub** : [Rapporter un problème](https://github.com/pinfada/SYMBIONT/issues)
- **FAQ** : [Questions fréquentes](FAQ)

---

**Installation terminée ?** 🎉  
[**➡️ Suivez le Guide Utilisateur**](User-Guide)