# SYMBIONT – Documentation Générale

## Sécurité & RGPD

SYMBIONT intègre une sécurité avancée et une conformité RGPD native :

- **Chiffrement des données** : toutes les données sensibles (état, mutations, exports) sont chiffrées côté client (AES-GCM ou base64).
- **Anonymisation** : aucune donnée personnelle, pas d'IP, pas de tracking, identifiants hashés pour le partage social.
- **Contrôle d'accès** : chaque action critique (invitation, mutation partagée) est soumise à une validation de rôle.
- **Export & portabilité** : l'utilisateur peut exporter ses données (brutes ou chiffrées) et les déchiffrer via l'outil RGPD intégré.
- **Audit & logs** : tous les accès sensibles peuvent être journalisés/anonymisés pour répondre aux demandes RGPD.

**Schéma de flux** :
```
[Utilisateur] --(export chiffré)--> [Outil RGPD] --(déchiffrement local)--> [Lecture JSON]
```

**Bonnes pratiques utilisateur** :
- Utilisez l'export chiffré pour la portabilité maximale
- Déchiffrez vos données uniquement sur un poste de confiance
- En cas de perte de clé ou d'erreur, contactez le support SYMBIONT

Pour plus de détails, voir : [docs/securite-rgpd.md](./securite-rgpd.md) 