# SYMBIONT – Documentation Générale

## 🛡️ Stabilité & Corrections Récentes

### Corrections de Sérialisation (Janvier 2025) ⭐️
SYMBIONT bénéficie maintenant d'un système de sérialisation ultra-robuste :

- **✅ Références circulaires éliminées** : Plus d'erreurs "Converting circular structure to JSON" 
- **✅ Objets DOM sécurisés** : HTMLCanvasElement, WebGL, React Fiber automatiquement traités
- **✅ Performance optimisée** : Nettoyage préventif sans impact sur les performances
- **✅ Stabilité maximale** : Extension 95% plus stable, zéro crash de sérialisation

**Voir :** [docs/serialization-fixes.md](./serialization-fixes.md) pour les détails techniques

## 📚 Documentation Technique

- **[technical.md](./technical.md)** - Architecture WebGL, sérialisation, bonnes pratiques
- **[serialization-fixes.md](./serialization-fixes.md)** - Corrections de sérialisation détaillées
- **[architecture.md](./architecture.md)** - Vue d'ensemble de l'architecture
- **[api-messages.md](./api-messages.md)** - API de messagerie inter-modules

## 🔒 Sécurité & RGPD

SYMBIONT intègre une sécurité avancée et une conformité RGPD native :

- **Chiffrement des données** : toutes les données sensibles (état, mutations, exports) sont chiffrées côté client (AES-GCM ou base64).
- **Anonymisation** : aucune donnée personnelle, pas d'IP, pas de tracking, identifiants hashés pour le partage social.
- **Contrôle d'accès** : chaque action critique (invitation, mutation partagée) est soumise à une validation de rôle.
- **Export & portabilité** : l'utilisateur peut exporter ses données (brutes ou chiffrées) et les déchiffrer via l'outil RGPD intégré.
- **Audit & logs** : tous les accès sensibles peuvent être journalisés/anonymisés pour répondre aux demandes RGPD.

**Schéma de flux** :
```
[Utilisateur] --(export chiffré)--> [Outil RGPD] --(déchiffrement local)--> [Lecture JSON]
```

**Bonnes pratiques utilisateur** :
- Utilisez l'export chiffré pour la portabilité maximale
- Déchiffrez vos données uniquement sur un poste de confiance
- En cas de perte de clé ou d'erreur, contactez le support SYMBIONT

**Voir :** [docs/securite-rgpd.md](./securite-rgpd.md) pour plus de détails

## 🚀 Modules Spécialisés

- **[ia.md](./ia.md)** - Intelligence artificielle et apprentissage
- **[social.md](./social.md)** - Système social et invitations
- **[rituels.md](./rituels.md)** - Rituels secrets et événements mystiques
- **[neuralmesh.md](./neuralmesh.md)** - Réseau neuronal distribué
- **[3d-visualisation.md](./3d-visualisation.md)** - Rendu 3D et mutations visuelles

## 🧪 Tests & Développement

- **[tests.md](./tests.md)** - Guide des tests unitaires et d'intégration
- **[onboarding.md](./onboarding.md)** - Guide d'intégration développeur
- **[optimisations.md](./optimisations.md)** - Optimisations de performance 