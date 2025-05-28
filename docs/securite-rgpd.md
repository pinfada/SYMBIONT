# Sécurité et RGPD SYMBIONT

## Sommaire
- Chiffrement des données
- Anonymisation
- Contrôle d'accès
- Conformité RGPD

## Chiffrement des données
- Toutes les données persistées sont chiffrées côté client (base64, extensible WebCrypto)
- Déchiffrement à la volée lors de la lecture

## Anonymisation
- Suppression des URLs, hashage des IDs lors des partages sociaux
- Aucune donnée personnelle transmise sans consentement

## Contrôle d'accès
- Validation des requêtes sensibles
- Possibilité d'étendre avec des rôles ou scopes

## Conformité RGPD
- Données locales uniquement par défaut
- Consentement explicite pour tout partage externe
- Droit à l'oubli (suppression sur demande) 