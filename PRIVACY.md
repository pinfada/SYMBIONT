# 🔒 Politique de Confidentialité - SYMBIONT

**Dernière mise à jour : 1er février 2026**

## 📋 Table des Matières

1. [Introduction](#introduction)
2. [Données Collectées](#données-collectées)
3. [Utilisation des Données](#utilisation-des-données)
4. [Stockage et Sécurité](#stockage-et-sécurité)
5. [Partage des Données](#partage-des-données)
6. [Vos Droits](#vos-droits)
7. [Cookies et Technologies Similaires](#cookies-et-technologies-similaires)
8. [Modifications de cette Politique](#modifications-de-cette-politique)
9. [Contact](#contact)

## Introduction

SYMBIONT ("nous", "notre", "nos") est une extension Chrome qui respecte profondément votre vie privée. Cette politique de confidentialité explique comment nous traitons les informations lorsque vous utilisez notre extension.

**Principe fondamental : SYMBIONT fonctionne entièrement localement sur votre navigateur. Nous ne collectons, ne stockons et ne transmettons AUCUNE donnée personnelle vers des serveurs externes.**

## Données Collectées

### 🟢 Données Traitées Localement (sur votre appareil uniquement)

SYMBIONT traite les données suivantes **exclusivement sur votre appareil** :

#### 1. **Données de Navigation Anonymisées**
- **Ce que nous analysons** : Patterns de navigation (fréquence de visite, temps passé)
- **Ce que nous NE collectons PAS** : URLs complètes, historique de navigation, données de formulaires
- **Traitement** : Hashage cryptographique local, aucune donnée brute conservée
- **Finalité** : Permettre à l'organisme digital d'évoluer selon vos habitudes

#### 2. **Métriques de Performance**
- **Ce que nous mesurons** : Temps de chargement, utilisation CPU/mémoire de l'extension
- **Stockage** : Local uniquement, rotation automatique après 7 jours
- **Finalité** : Optimiser les performances de l'extension

#### 3. **État de l'Organisme**
- **Données** : Traits de personnalité, niveau d'énergie, génération, mutations
- **Format** : Données numériques abstraites sans lien avec votre identité
- **Stockage** : Chrome Storage API local, chiffré avec AES-256-GCM

#### 4. **Détection d'Éléments Web**
- **Vision Spectrale** : Analyse des éléments DOM invisibles (trackers, pixels)
- **Traitement** : Analyse en temps réel, aucun stockage des éléments détectés
- **Résultat** : Compteurs agrégés uniquement (ex: "3 trackers détectés")

### 🔴 Données que nous NE Collectons JAMAIS

- ❌ Informations personnellement identifiables (nom, email, adresse)
- ❌ Mots de passe ou données de connexion
- ❌ Données de formulaires ou saisies clavier
- ❌ Historique de navigation complet
- ❌ Cookies ou identifiants de session
- ❌ Données bancaires ou financières
- ❌ Localisation géographique
- ❌ Adresse IP
- ❌ Captures d'écran ou enregistrements

## Utilisation des Données

### Finalités du Traitement Local

1. **Évolution de l'Organisme** : Adapter les traits selon les patterns d'usage
2. **Détection de Menaces** : Identifier les trackers et éléments invisibles
3. **Optimisation** : Améliorer les performances de l'extension
4. **Fonctionnalités P2P** : Permettre le partage volontaire d'organismes (voir section P2P)

### Base Légale (RGPD)

- **Intérêt légitime** : Fournir les fonctionnalités de l'extension
- **Consentement** : Pour toute fonctionnalité optionnelle (ex: partage P2P)

## Stockage et Sécurité

### 🔐 Mesures de Sécurité

1. **Chiffrement**
   - Algorithme : AES-256-GCM
   - Clés : Générées localement, jamais transmises
   - Vecteurs d'initialisation : Uniques pour chaque opération

2. **Isolation**
   - Utilisation de l'API Chrome Storage (sandboxée)
   - Aucun accès cross-origin
   - Content Security Policy stricte

3. **Génération Aléatoire Sécurisée**
   - WebCrypto API pour tous les nombres aléatoires
   - Conforme FIPS 140-2
   - Aucune utilisation de Math.random() pour la sécurité

4. **Audit de Sécurité**
   - Code source ouvert et auditable
   - Tests de sécurité automatisés
   - Conformité OWASP

### 📍 Localisation des Données

- **Stockage Principal** : Chrome Storage API (local)
- **Cache Temporaire** : IndexedDB (local, rotation 7 jours)
- **Mémoire** : RAM uniquement pendant l'utilisation
- **Serveurs Externes** : AUCUN

## Partage des Données

### 🌐 Fonctionnalité P2P (Optionnelle)

Si vous activez le partage P2P :

1. **Ce qui est partagé** :
   - Code d'invitation (UUID aléatoire)
   - Traits de l'organisme (valeurs numériques)
   - Génération et mutations (nombres)

2. **Ce qui n'est PAS partagé** :
   - Aucune donnée personnelle
   - Aucun historique de navigation
   - Aucune information identifiable

3. **Contrôle** :
   - Activation manuelle uniquement
   - Révocation possible à tout moment
   - Connexions chiffrées de bout en bout

### 🚫 Tiers

**Nous ne vendons, ne louons et ne partageons JAMAIS vos données avec des tiers**, incluant :
- Annonceurs
- Analystes de données
- Partenaires commerciaux
- Gouvernements (sauf obligation légale)

## Vos Droits

### Droits RGPD (Utilisateurs Européens)

Vous disposez des droits suivants :

1. **Droit d'accès** : Voir toutes les données stockées localement
   - Via : Panneau de l'extension → Paramètres → Données

2. **Droit de rectification** : Modifier les traits de l'organisme
   - Via : Interface de l'extension

3. **Droit à l'effacement** : Supprimer toutes les données
   - Via : Désinstallation de l'extension ou bouton "Réinitialiser"

4. **Droit à la portabilité** : Exporter vos données
   - Via : Paramètres → Exporter l'organisme (format JSON)

5. **Droit d'opposition** : Désactiver des fonctionnalités
   - Via : Paramètres → Désactiver les fonctions spécifiques

6. **Droit à la limitation** : Limiter le traitement
   - Via : Mode "Hibernation" de l'organisme

### Droits CCPA (Utilisateurs Californiens)

- **Droit de savoir** : Cette politique décrit toutes les données traitées
- **Droit de suppression** : Désinstallez l'extension pour supprimer toutes les données
- **Droit de non-discrimination** : Accès complet sans partage de données
- **Droit de refus** : Aucune vente de données (nous ne vendons jamais)

## Cookies et Technologies Similaires

### 🍪 Utilisation des Cookies

SYMBIONT **n'utilise PAS de cookies** pour le tracking ou l'analyse.

### 📊 Technologies de Stockage

- **Chrome Storage API** : État de l'organisme (local uniquement)
- **IndexedDB** : Cache temporaire (local uniquement)
- **SessionStorage** : Données de session (effacées à la fermeture)
- **Pas de localStorage** : Pour éviter les fuites cross-origin

## Enfants

SYMBIONT n'est pas destiné aux enfants de moins de 13 ans. Nous ne collectons pas sciemment d'informations d'enfants. Si vous êtes parent et pensez que votre enfant utilise l'extension, contactez-nous.

## Modifications de cette Politique

Nous pouvons mettre à jour cette politique. Les changements seront :
1. Annoncés dans l'extension (notification)
2. Publiés sur cette page avec la date de mise à jour
3. Soumis à votre consentement pour les changements majeurs

**Fréquence de révision** : Annuelle ou selon les changements réglementaires

## Contact

### Pour les Questions de Confidentialité

**Email** : privacy@symbiont-extension.io
**Adresse** : [À définir selon votre localisation]

### Délégué à la Protection des Données (DPO)

[Si applicable selon la taille de votre organisation]

### Autorités de Protection

Pour les résidents de l'UE, vous pouvez contacter votre autorité locale :
- **France** : CNIL - www.cnil.fr
- **Belgique** : APD - www.dataprotectionauthority.be
- **Autres pays** : Liste sur edpb.europa.eu

## Engagement de Transparence

### 🔍 Audit et Vérification

1. **Code Source** : [Lien vers GitHub si open source]
2. **Rapport de Sécurité** : Publié annuellement
3. **Certificats** : [Liste des certifications si applicable]

### 📊 Statistiques de Confidentialité

- **Données collectées** : 0 KB de données personnelles
- **Serveurs externes contactés** : 0
- **Trackers tiers** : 0
- **Cookies utilisés** : 0
- **Dernière fuite de données** : Jamais

## Résumé Exécutif

### ✅ CE QUE FAIT SYMBIONT
- ✅ Traite les données localement sur votre appareil
- ✅ Chiffre toutes les données stockées
- ✅ Vous donne le contrôle total
- ✅ Respecte votre anonymat

### ❌ CE QUE SYMBIONT NE FAIT PAS
- ❌ Ne collecte pas de données personnelles
- ❌ Ne transmet rien vers des serveurs
- ❌ Ne vend pas vos données
- ❌ Ne vous track pas

## Déclaration Finale

**"Votre vie privée n'est pas notre produit. SYMBIONT est conçu pour fonctionner entièrement sur votre appareil, sans jamais compromettre votre confidentialité. C'est notre engagement fondamental et inviolable envers vous."**

---

**Version** : 1.0.0
**Date d'effet** : 1er février 2026
**Langues disponibles** : Français, [Anglais à venir]

*Cette politique est rédigée en conformité avec :*
- Règlement Général sur la Protection des Données (RGPD) - UE 2016/679
- California Consumer Privacy Act (CCPA) - AB-375
- Chrome Web Store Developer Program Policies
- ISO/IEC 27701:2019 (Gestion de la confidentialité)

---

© 2026 SYMBIONT - Tous droits réservés