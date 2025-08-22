# Troubleshooting SYMBIONT

Guide complet de dépannage pour résoudre les problèmes courants avec SYMBIONT.

## 🚨 Problèmes d'Installation

### Extension ne se charge pas après installation

**Symptômes :**
- L'icône SYMBIONT n'apparaît pas dans la barre d'outils
- Message d'erreur lors du chargement
- Extension grisée dans `chrome://extensions`

**Solutions :**

1. **Vérifier le mode développeur**
   ```
   1. Aller à chrome://extensions
   2. Activer "Mode développeur" (coin supérieur droit)
   3. Cliquer sur "Recharger" sur l'extension SYMBIONT
   ```

2. **Vérifier l'intégrité des fichiers**
   ```bash
   # Dans le dossier SYMBIONT
   ls -la dist/
   # Doit contenir : manifest.json, background.js, popup.html, etc.
   ```

3. **Reconstruire l'extension**
   ```bash
   # Nettoyer et reconstruire
   rm -rf dist/ node_modules/
   npm install
   npm run build
   ```

4. **Vérifier les permissions**
   ```bash
   # S'assurer que les fichiers sont lisibles
   chmod -R 755 dist/
   ```

### Erreurs de build

**Symptômes :**
- `npm run build` échoue
- Erreurs TypeScript
- Modules manquants

**Solutions :**

1. **Nettoyer complètement**
   ```bash
   rm -rf node_modules/
   rm package-lock.json
   npm cache clean --force
   npm install
   ```

2. **Vérifier la version Node.js**
   ```bash
   node --version  # Doit être >= 18.0.0
   npm --version   # Doit être >= 9.0.0
   ```

3. **Résoudre les conflits de dépendances**
   ```bash
   npm ls  # Identifier les conflits
   npm audit fix  # Corriger les vulnérabilités
   ```

## ⚡ Problèmes de Performance

### Extension lente ou qui rame

**Symptômes :**
- Interface popup lente à s'ouvrir
- Réponses tardives aux interactions
- Chrome ralenti

**Diagnostic :**
```javascript
// Ouvrir la console de l'extension (chrome://extensions → Inspecter les vues)
// Vérifier ces métriques
console.log(performance.memory);
console.log(performance.now());
```

**Solutions :**

1. **Mode performance réduite**
   ```
   1. Ouvrir SYMBIONT popup
   2. Paramètres → Performance
   3. Activer "Mode économie d'énergie"
   4. Réduire qualité 3D à "Basique"
   ```

2. **Vider le cache**
   ```
   1. Paramètres SYMBIONT → Maintenance
   2. "Vider le cache" 
   3. "Nettoyer les données temporaires"
   4. Redémarrer Chrome
   ```

3. **Identifier les conflits d'extensions**
   ```
   1. Désactiver toutes les autres extensions
   2. Tester SYMBIONT isolément
   3. Réactiver les autres une par une
   ```

### Consommation mémoire excessive

**Symptômes :**
- Onglet Task Manager Chrome montre usage élevé
- Chrome devient instable
- Système ralenti

**Investigation :**
```bash
# Ouvrir chrome://task-manager
# Identifier si SYMBIONT utilise > 50MB
```

**Solutions :**

1. **Réduire l'historique stocké**
   ```
   Paramètres → Données → Historique
   Réduire à "1 semaine" au lieu de "1 mois"
   ```

2. **Limiter les connexions sociales**
   ```
   Paramètres → Social → Connexions
   Réduire "Max connexions" à 5
   ```

3. **Désactiver les fonctionnalités gourmandes**
   ```
   Paramètres → Avancé
   - Désactiver "Prédictions temps réel"
   - Réduire "Fréquence d'analyse" à "Faible"
   ```

## 🖥️ Problèmes d'Affichage

### Organisme 3D invisible ou corrompu

**Symptômes :**
- Zone 3D complètement noire
- Organisme figé ou déformé
- Erreurs WebGL dans la console

**Diagnostic WebGL :**
```javascript
// Tester WebGL dans la console
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl2');
console.log('WebGL2 support:', !!gl);
console.log('Renderer:', gl?.getParameter(gl.RENDERER));
```

**Solutions :**

1. **Vérifier le support WebGL**
   ```
   1. Aller à chrome://gpu/
   2. Chercher "WebGL" dans les informations
   3. Statut doit être "Enabled"
   ```

2. **Mettre à jour les drivers graphiques**
   ```bash
   # Windows
   # Aller sur le site du fabricant (NVIDIA/AMD/Intel)
   # Télécharger les derniers drivers
   
   # Linux
   sudo apt update && sudo apt upgrade
   sudo ubuntu-drivers autoinstall
   ```

3. **Forcer l'accélération matérielle**
   ```
   1. Chrome → Paramètres → Avancés → Système
   2. Activer "Utiliser l'accélération matérielle"
   3. Redémarrer Chrome
   ```

4. **Mode de compatibilité**
   ```
   Paramètres SYMBIONT → Affichage
   Activer "Mode compatibilité WebGL1"
   ```

### Interface déformée ou illisible

**Symptômes :**
- Texte tronqué ou illisible
- Boutons mal placés
- Interface qui déborde

**Solutions :**

1. **Réinitialiser le zoom**
   ```
   1. Chrome → Paramètres → Apparence
   2. Zoom de page → 100%
   3. Redémarrer Chrome
   ```

2. **Vérifier la résolution d'écran**
   ```
   Paramètres SYMBIONT → Interface
   Ajuster "Facteur d'échelle" selon votre écran
   ```

3. **Réinitialiser l'interface**
   ```
   Paramètres → Interface → Avancé
   "Restaurer interface par défaut"
   ```

## 🔄 Problèmes de Données

### Organisme perdu ou reseté

**Symptômes :**
- Organisme revenu aux paramètres par défaut
- Historique d'évolution vide
- Traits de base réinitialisés

**Solutions de récupération :**

1. **Restauration automatique**
   ```
   1. Paramètres → Récupération
   2. "Rechercher sauvegardes automatiques"
   3. Sélectionner la plus récente
   4. "Restaurer"
   ```

2. **Import de sauvegarde manuelle**
   ```
   1. Paramètres → Import/Export
   2. "Importer depuis fichier"
   3. Sélectionner votre fichier .json
   ```

3. **Récupération communautaire** (si réseau social activé)
   ```
   1. Paramètres → Social → Récupération
   2. "Rechercher backup communautaire"
   3. Authentification par code d'invitation
   ```

### Évolution bloquée

**Symptômes :**
- L'organisme n'évolue plus
- Pas de nouvelles mutations malgré l'activité
- Métriques figées

**Diagnostic :**
```javascript
// Console extension
chrome.runtime.sendMessage({
  type: 'GET_ORGANISM_STATE',
  payload: { includeMetrics: true }
}, console.log);
```

**Solutions :**

1. **Vérifier les conditions d'évolution**
   ```
   Paramètres → Évolution → Seuils
   Réduire "Seuil de mutation" si trop élevé
   ```

2. **Forcer une évolution**
   ```
   Dashboard → Actions → "Évolution manuelle"
   Utiliser uniquement si nécessaire
   ```

3. **Réinitialiser l'algorithme d'apprentissage**
   ```
   Paramètres → Avancé → Algorithmes
   "Réinitialiser réseau neuronal"
   ```

## 🌐 Problèmes Sociaux/Réseau

### Impossible de se connecter au réseau P2P

**Symptômes :**
- Pas de connexions dans le panneau social
- Codes d'invitation qui ne marchent pas
- Rituels mystiques indisponibles

**Diagnostic réseau :**
```javascript
// Tester la connectivité
fetch('https://api.ipify.org?format=json')
  .then(r => r.json())
  .then(data => console.log('IP publique:', data.ip));
```

**Solutions :**

1. **Vérifier les paramètres réseau**
   ```
   Paramètres → Social → Réseau
   - Vérifier que P2P est activé
   - Tester la connectivité
   ```

2. **Configuration firewall**
   ```bash
   # Windows Defender
   # Ajouter Chrome aux exceptions
   
   # Linux (ufw)
   sudo ufw allow out 443
   sudo ufw allow out 80
   ```

3. **Proxy/VPN**
   ```
   Si vous utilisez un VPN/proxy :
   1. Désactiver temporairement
   2. Tester SYMBIONT
   3. Configurer exceptions si nécessaire
   ```

### Codes d'invitation invalides

**Solutions :**
1. **Vérifier la validité**
   ```
   Les codes expirent après 24h par défaut
   Demander un nouveau code si expiré
   ```

2. **Format correct**
   ```
   Format attendu : SYMB-XXXX-XXXX-XXXX
   Vérifier la saisie caractère par caractère
   ```

## 🛡️ Problèmes de Sécurité

### Erreurs de chiffrement

**Symptômes :**
- Messages d'erreur cryptographiques
- Données corrompues
- Échec de sauvegarde

**Solutions :**

1. **Régénérer les clés de chiffrement**
   ```
   Paramètres → Sécurité → Clés
   "Régénérer clés" (⚠️ Perte de données chiffrées)
   ```

2. **Mode de récupération**
   ```
   Paramètres → Sécurité → Mode récupération
   Désactiver temporairement le chiffrement
   ```

### Logs de sécurité suspicieux

**Investigation :**
```
1. Paramètres → Sécurité → Logs
2. Vérifier les tentatives d'accès
3. Chercher des patterns anormaux
```

**Actions :**
1. **Révoquer les accès**
2. **Changer les clés de chiffrement**
3. **Signaler si nécessaire**

## 🔧 Outils de Diagnostic

### Console de Debug

```javascript
// Activer le mode debug
localStorage.setItem('SYMBIONT_DEBUG', 'true');

// Métriques détaillées
chrome.runtime.sendMessage({
  type: 'GET_DEBUG_INFO',
  payload: {}
}, console.log);

// État complet du système
chrome.runtime.sendMessage({
  type: 'SYSTEM_HEALTH_CHECK',
  payload: {}
}, console.log);
```

### Export des Logs

```
1. Paramètres → Diagnostic → Logs
2. "Exporter logs système"
3. Joindre à votre rapport de bug
```

### Test de Performance

```
1. Paramètres → Diagnostic → Performance
2. "Lancer benchmark complet"
3. Analyser les résultats
```

## 📞 Support Avancé

### Informations à Fournir

Pour un support efficace, inclure :

```
1. Version Chrome : chrome://version/
2. Système d'exploitation
3. Version SYMBIONT
4. Logs d'erreur
5. Étapes pour reproduire
```

### Collecte automatique

```bash
# Script de collecte d'informations
node scripts/collect-debug-info.js
```

### Contacts Support

- **Issues GitHub** : Problèmes techniques
- **Discussions** : Questions générales
- **Documentation** : [Developer Guide](Developer-Guide)

---

**Problème non résolu ?**

[**🐛 Signaler sur GitHub**](https://github.com/pinfada/SYMBIONT/issues) | [**💬 Demander de l'Aide**](https://github.com/pinfada/SYMBIONT/discussions)