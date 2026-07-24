# 🔒 Politique de Confidentialité - SYMBIONT

**Dernière mise à jour : 24 juillet 2026**

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

**Principe fondamental : SYMBIONT fonctionne localement sur votre navigateur. Aucune donnée personnelle, comportementale (URLs, navigation) ni aucun état d'organisme n'est transmis à un serveur.**

La seule exception est la fonctionnalité **P2P optionnelle** : si vous l'activez, un serveur de *signaling* (relais de mise en relation) est contacté pour permettre à deux navigateurs de se découvrir. Ce relais ne reçoit **qu'un identifiant de routage éphémère** (`peerId`) et les messages techniques d'établissement de connexion (SDP/ICE). Il ne reçoit, ni ne stocke, ni ne journalise votre organisme, vos traits, votre ADN, votre IP ou votre activité. Une fois les pairs connectés, tout échange se fait **directement de navigateur à navigateur**, chiffré (WebRTC/DTLS + chiffrement applicatif de bout en bout).

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
- **Stockage** : IndexedDB local, **chiffré au repos avec AES-256-GCM** (clé générée localement via WebCrypto, jamais transmise). Un cache d'affichage non sensible (traits/génération) peut aussi résider en `localStorage` local, jamais transmis.

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
- ❌ Captures d'écran ou enregistrements

> **Note sur l'adresse IP (P2P uniquement)** : toute connexion réseau expose techniquement votre IP au serveur contacté et aux serveurs STUN (Google) utilisés pour la traversée de NAT WebRTC. Le serveur de signaling de SYMBIONT **ne stocke ni ne journalise aucune IP**. Si vous n'activez pas le P2P, aucun serveur n'est contacté et votre IP n'est exposée à personne via l'extension.

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

- **Stockage Principal** : IndexedDB local (chiffré AES-256-GCM)
- **Clés & préférences** : Chrome Storage API (local, sandboxé)
- **Mémoire** : RAM uniquement pendant l'utilisation
- **Serveurs Externes** : aucun, sauf le relais de signaling P2P si vous activez cette fonction (peerId éphémère uniquement)

## Partage des Données

### 🌐 Fonctionnalité P2P (Optionnelle)

Si vous activez le partage P2P :

1. **Ce qui est partagé (directement entre pairs, chiffré)** :
   - Code d'invitation (UUID aléatoire)
   - Traits de l'organisme (valeurs numériques)
   - Génération et mutations (nombres)

2. **Ce qui transite par le serveur de signaling** :
   - Uniquement un `peerId` de routage éphémère + les messages techniques SDP/ICE
   - **Jamais** l'organisme, les traits, l'ADN ni aucune activité

3. **Ce qui n'est PAS partagé** :
   - Aucune donnée personnelle
   - Aucun historique de navigation
   - Aucune information identifiable

4. **Contrôle** :
   - Activation manuelle uniquement
   - Révocation possible à tout moment
   - Connexions chiffrées de bout en bout (WebRTC/DTLS + couche applicative)

> **Identifiant P2P** : un `peerId` (UUID aléatoire) est généré et conservé localement pour le routage. Il ne contient aucune information personnelle mais reste stable tant que vous ne réinitialisez pas l'extension.

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

- **IndexedDB** : État de l'organisme et données comportementales, **chiffrés au repos (AES-256-GCM)** ; les URLs ne sont stockées que sous forme de **hash SHA-256** (jamais en clair)
- **Chrome Storage API** : clés de chiffrement et préférences (local, sandboxé)
- **localStorage** : caches d'affichage locaux (état d'organisme non sensible, `peerId` de routage, contacts P2P) — **jamais transmis à un serveur**
- **SessionStorage** : données de session (effacées à la fermeture)

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

- **Données personnelles collectées** : 0 KB
- **Données comportementales/organisme transmises à un serveur** : 0
- **Serveurs contactés** : uniquement le relais de signaling **si le P2P est activé** (peerId éphémère seulement) ; sinon 0
- **Trackers tiers** : 0
- **Cookies utilisés** : 0

## Résumé Exécutif

### ✅ CE QUE FAIT SYMBIONT
- ✅ Traite les données localement sur votre appareil
- ✅ Chiffre toutes les données stockées
- ✅ Vous donne le contrôle total
- ✅ Respecte votre anonymat

### ❌ CE QUE SYMBIONT NE FAIT PAS
- ❌ Ne collecte pas de données personnelles
- ❌ Ne transmet ni vos URLs, ni votre navigation, ni votre organisme à un serveur
- ❌ Ne vend pas vos données
- ❌ Ne vous track pas

### 🧩 Permissions et capacités à connaître
- **Détection d'extensions** (permission `management`) : la fonction d'organisme « conscient » compte et classe les extensions installées comme signaux d'environnement. Ce traitement est **entièrement local** et n'est jamais transmis. Vous pouvez ignorer cette fonction ; aucune liste d'extensions ne quitte votre appareil.
- **Injection de content script** (`<all_urls>`) : nécessaire à l'observation locale du DOM (Vision Spectrale, résonance). Aucune donnée de page n'est transmise.
- **Notifications** (permission `notifications`) : le symbiont peut vous avertir, **rarement**, quand il perçoit une infrastructure de surveillance invisible reliant plusieurs sites que vous avez croisés. Ces alertes sont calculées **localement** (analyse onirique cross-domain) ; aucune donnée n'est transmise. Le contenu se limite à un décompte agrégé (« N sites partagent la même infrastructure cachée »).

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