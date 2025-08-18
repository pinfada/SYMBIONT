# 🔧 Guide de Dépannage SYMBIONT

**Extension Chrome d'Organismes Intelligents Évolutifs**

## 🚨 Problèmes Courants et Solutions

### Installation et Première Configuration

#### Extension ne s'installe pas
**Symptômes :** Erreur lors de l'installation depuis le Chrome Web Store
**Solutions :**
1. Vérifier la version de Chrome (≥ 90.0.0 requis)
2. Vider le cache du navigateur : `chrome://settings/clearBrowserData`
3. Désactiver temporairement les autres extensions
4. Redémarrer Chrome et réessayer

#### Organisme ne se crée pas au premier lancement
**Symptômes :** Interface vide, aucun organisme visible
**Solutions :**
1. Vérifier WebGL : Aller sur `chrome://gpu/` et s'assurer que WebGL est activé
2. Autoriser l'extension à accéder aux données de site : `chrome://extensions/`
3. Rafraîchir l'extension en cliquant sur l'icône de rechargement
4. Si problème persiste, désinstaller et réinstaller l'extension

### Problèmes de Performance

#### Extension lente ou qui rame
**Symptômes :** Interface qui se charge lentement, animations saccadées
**Solutions :**
1. **Réduire la complexité visuelle :**
   - Paramètres → Affichage → Qualité "Performante"
   - Désactiver les animations complexes
   - Réduire la fréquence de mise à jour des métriques

2. **Optimiser Chrome :**
   ```
   chrome://settings/system
   - Désactiver "Utiliser l'accélération matérielle"
   - Activer "Utiliser un service de prédiction"
   ```

3. **Vérifier les ressources système :**
   - Fermer les onglets inutiles
   - Vérifier la mémoire disponible (Task Manager)
   - Redémarrer Chrome si > 2 Go de RAM utilisée

#### Consommation excessive de mémoire
**Symptômes :** Chrome utilise trop de RAM, système ralenti
**Solutions :**
1. **Paramètres SYMBIONT :**
   - Réduire l'historique des mutations (max 100 au lieu de 1000)
   - Désactiver le stockage des métriques détaillées
   - Activer le mode "Économie d'énergie"

2. **Nettoyage périodique :**
   - Paramètres → Données → Nettoyer le cache
   - Exporter les données importantes avant nettoyage
   - Redémarrer l'extension après nettoyage

### Problèmes d'Affichage

#### Interface blanche ou vide
**Symptômes :** Popup affiche une page blanche
**Solutions :**
1. **Vérifier WebGL :**
   ```
   Ouvrir chrome://gpu/
   Vérifier "WebGL: Hardware accelerated"
   Si "Software only", mettre à jour les drivers graphiques
   ```

2. **Mode de compatibilité :**
   - Paramètres → Avancé → Mode compatibilité
   - Redémarrer Chrome après activation
   - Si résolu, signaler la configuration système au support

3. **Reset complet :**
   - Sauvegarder données : Paramètres → Export
   - Désinstaller extension
   - Vider cache Chrome
   - Réinstaller et importer données

#### Organisme invisible ou déformé
**Symptômes :** Visualisation 3D ne s'affiche pas correctement
**Solutions :**
1. **Forcer le rendu :**
   - Paramètres → Affichage → Forcer le re-rendu
   - Changer temporairement la qualité puis revenir

2. **Vérifier la carte graphique :**
   ```
   chrome://gpu/
   Chercher "WebGL" et "Canvas"
   Si erreurs, mettre à jour drivers
   ```

3. **Mode de secours :**
   - Paramètres → Affichage → Mode 2D simple
   - Permet d'utiliser l'extension sans WebGL

### Problèmes de Données

#### Organisme "oublie" ses évolutions
**Symptômes :** Perte de mutations, retour à l'état initial
**Solutions :**
1. **Vérifier le stockage :**
   ```
   Paramètres → Données → Diagnostic stockage
   Si erreurs, utiliser "Réparer stockage"
   ```

2. **Conflit d'extensions :**
   - Désactiver autres extensions de productivité
   - Redémarrer Chrome
   - Tester si problème résolu

3. **Corruption de données :**
   - Utiliser la sauvegarde automatique : Paramètres → Récupération
   - Si pas de sauvegarde, reset avec données de base saines

#### Synchronisation impossible
**Symptômes :** Fonctionnalités sociales ne marchent pas
**Solutions :**
1. **Vérifier la connexion :**
   - Test de connectivité dans Paramètres → Réseau
   - Vérifier proxy/firewall d'entreprise
   - Essayer depuis un autre réseau

2. **Réinitialiser les connexions :**
   - Paramètres → Social → Déconnecter tout
   - Redémarrer extension
   - Reconnecter progressivement

### Problèmes Spécifiques par Navigateur

#### Chrome Entreprise / Géré
**Restrictions possibles :**
- Extensions bloquées par politique
- WebGL désactivé par sécurité
- Stockage local limité

**Solutions :**
- Contacter l'administrateur IT
- Demander exception pour SYMBIONT
- Utiliser en mode navigation privée si autorisé

#### Chrome sur Linux
**Problèmes connus :**
- Accélération matérielle parfois défaillante
- Permissions de stockage restrictives

**Solutions :**
```bash
# Lancer Chrome avec flags spécifiques
google-chrome --enable-webgl --enable-gpu-rasterization --enable-oop-rasterization
```

#### Chrome sur macOS
**Problèmes connus :**
- Conflits avec économiseur d'énergie
- Limitations sandbox renforcées

**Solutions :**
- Désactiver "App Nap" pour Chrome
- Autoriser Chrome dans Sécurité & Confidentialité

### Diagnostics Avancés

#### Activer les logs de debug
```javascript
// Dans la console Chrome (F12)
localStorage.setItem('SYMBIONT_DEBUG', 'true');
localStorage.setItem('SYMBIONT_VERBOSE', 'true');
// Recharger l'extension
```

#### Informations système utiles
```javascript
// Copier ces informations pour le support
console.log({
  chrome: navigator.userAgent,
  webgl: !!document.createElement('canvas').getContext('webgl'),
  webgl2: !!document.createElement('canvas').getContext('webgl2'),
  storage: navigator.storage && navigator.storage.estimate,
  memory: performance.memory,
  symbiont: chrome.runtime.getManifest()
});
```

#### Tests de performance
```javascript
// Test WebGL
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl2');
console.log('WebGL Vendor:', gl.getParameter(gl.VENDOR));
console.log('WebGL Renderer:', gl.getParameter(gl.RENDERER));
```

## 🚨 Situations d'Urgence

### Extension corrompue
1. **Sauvegarde immédiate :** Paramètres → Export → Sauvegarde complète
2. **Mode sécurisé :** Désactiver toutes fonctionnalités avancées
3. **Contact support :** Envoyer logs + informations système

### Perte de données
1. **Ne pas redémarrer Chrome** avant tentative de récupération
2. **Vérifier sauvegarde automatique :** Paramètres → Récupération
3. **Export des traces :** Paramètres → Debug → Export logs
4. **Contact support urgent :** support@symbiont-extension.com

### Comportement anormal
1. **Isolation :** Désactiver autres extensions
2. **Mode minimal :** Paramètres → Mode sécurisé
3. **Capture d'écran + logs :** Pour diagnostic
4. **Report immédiat :** Si suspicion de bug sécurité

## 📞 Obtenir de l'Aide

### Auto-diagnostic
**Outil intégré :** Paramètres → Diagnostic → Test complet
- Vérifie compatibilité système
- Teste toutes les fonctionnalités
- Génère rapport automatique

### Support Communautaire
- **FAQ Interactive :** https://symbiont-extension.com/help
- **Forum :** https://community.symbiont-extension.com
- **Discord :** https://discord.gg/symbiont

### Support Technique
- **Email :** support@symbiont-extension.com
- **Formulaire :** https://symbiont-extension.com/support
- **GitHub Issues :** https://github.com/symbiont/extension/issues

### Informations à Fournir
Lors d'un contact support, inclure :
1. **Version Chrome :** `chrome://version/`
2. **Version Extension :** Visible dans `chrome://extensions/`
3. **Système d'exploitation :** Version détaillée
4. **Logs d'erreur :** Console Chrome (F12)
5. **Étapes pour reproduire :** Description précise
6. **Capture d'écran :** Si problème visuel

## 🔄 Prévention

### Maintenance Régulière
- **Hebdomadaire :** Nettoyer le cache de l'extension
- **Mensuel :** Exporter une sauvegarde complète
- **Trimestriel :** Vérifier les mises à jour système

### Bonnes Pratiques
- Garder Chrome à jour automatiquement
- Ne pas installer trop d'extensions simultanément
- Redémarrer Chrome au moins une fois par semaine
- Surveiller l'usage mémoire en cas de ralentissements

### Signalement de Bugs
Si vous rencontrez un problème non documenté :
1. **Reproduire :** Confirmer que c'est reproductible
2. **Isoler :** Tester avec minimal d'extensions
3. **Documenter :** Étapes précises + environnement
4. **Signaler :** GitHub Issues avec template complet

---

**Ce guide est mis à jour régulièrement selon les retours utilisateurs.**

*Dernière mise à jour : 17 août 2025*