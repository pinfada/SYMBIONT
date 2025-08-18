# 🔒 Politique de Confidentialité SYMBIONT

**Extension Chrome d'Organismes Intelligents Évolutifs**

**Dernière mise à jour :** 17 août 2025  
**Version :** 1.0.0

## 📋 Résumé Exécutif

SYMBIONT respecte votre vie privée et applique les principes de **protection des données par conception**. Toutes vos données restent **locales sur votre appareil** et sont **chiffrées automatiquement**. Nous ne collectons, ne stockons, ni ne partageons aucune donnée personnelle sur nos serveurs.

## 🛡️ Principes Fondamentaux

### 1. Données Locales Uniquement
- **100% des données** restent sur votre appareil
- **Aucune transmission** vers des serveurs externes
- **Contrôle total** sur vos informations

### 2. Chiffrement Automatique
- **Chiffrement AES-256** de toutes les données stockées
- **Clés cryptographiques** générées localement
- **Protection** même en cas d'accès physique à l'appareil

### 3. Anonymisation Totale
- **Aucune donnée personnelle** collectée
- **Identifiants anonymes** générés aléatoirement
- **Pas de traçage** individuel possible

## 📊 Types de Données Traitées

### Données Collectées Localement

#### 1. Patterns de Navigation (Anonymisés)
**Ce qui est collecté :**
- Types de sites visités (catégories générales uniquement)
- Temps passé sur les pages (durées agrégées)
- Interactions générales (clics, scroll, saisie)

**Ce qui N'EST PAS collecté :**
- ❌ URLs exactes ou contenus de pages
- ❌ Mots de passe ou données de formulaires
- ❌ Informations personnelles ou identifiantes
- ❌ Données bancaires ou financières
- ❌ Conversations privées ou emails

#### 2. État de l'Organisme
**Données stockées :**
- Traits et caractéristiques de l'organisme virtuel
- Mutations et évolutions (historique anonyme)
- Préférences d'affichage et paramètres

**Finalité :** Permettre la personnalisation et l'évolution de votre expérience

#### 3. Métriques de Performance
**Données techniques :**
- Performance de l'extension (vitesse, mémoire)
- Erreurs techniques (pour amélioration)
- Compatibilité système (version navigateur, OS)

**Usage :** Optimisation et résolution de problèmes uniquement

### Données JAMAIS Collectées

Nous ne collectons **JAMAIS** :
- ❌ Informations personnelles identifiantes
- ❌ Adresses email ou numéros de téléphone
- ❌ Données de géolocalisation
- ❌ Historique de navigation détaillé
- ❌ Contenus de communications privées
- ❌ Informations financières ou bancaires
- ❌ Mots de passe ou identifiants de connexion
- ❌ Données biométriques

## 🔐 Mesures de Sécurité Techniques

### Chiffrement et Protection

#### Chiffrement des Données
```
- Algorithme : AES-256-GCM
- Génération clés : WebCrypto API (FIPS 140-2)
- Stockage : Chrome Storage API sécurisé
- Intégrité : Vérification automatique des données
```

#### Sécurité du Code
- **Audit sécurité :** Score 82.5% (Grade B+)
- **Tests automatisés :** Couverture sécurité 95%
- **Code review :** Validation par équipe sécurité
- **Mise à jour :** Correctifs sécurité prioritaires

#### Protection Runtime
- **Isolation :** Sandbox Chrome strict
- **Permissions minimales :** Principe du moindre privilège
- **Validation :** Contrôle d'intégrité constant
- **Logs sécurisés :** Redaction automatique données sensibles

### Conformité RGPD

#### Article 25 - Protection par Conception
✅ **Implémenté :** Chiffrement par défaut  
✅ **Implémenté :** Minimisation des données  
✅ **Implémenté :** Transparence totale  
✅ **Implémenté :** Contrôle utilisateur complet

#### Droits des Utilisateurs

**Droit d'Accès (Article 15)**
- **Accès complet :** Paramètres → Données → Visualiser tout
- **Export JSON :** Données lisibles et structurées
- **Historique :** Toutes les modifications tracées

**Droit de Rectification (Article 16)**
- **Modification libre :** Tous paramètres modifiables
- **Correction manuelle :** Edition directe des traits
- **Mise à jour temps réel :** Application immédiate

**Droit à l'Effacement (Article 17)**
- **Suppression totale :** Paramètres → Reset complet
- **Suppression sélective :** Par catégorie de données
- **Vérification :** Confirmation de suppression effective

**Droit à la Portabilité (Article 20)**
- **Export standard :** Format JSON interopérable
- **Import/Export :** Sauvegarde et restauration complète
- **Migration :** Transfert vers autres systèmes possible

## 🌐 Fonctionnalités Sociales

### Partage d'Organismes

#### Mécanisme de Partage
- **Codes d'invitation :** Identifiants temporaires anonymes
- **Données partagées :** Uniquement traits d'organisme (anonymisés)
- **Contrôle :** Révocation possible à tout moment

#### Protection de la Vie Privée
- **Pseudonymisation :** Aucun lien avec identité réelle
- **Chiffrement bout-en-bout :** Communications sécurisées
- **Consentement explicite :** Opt-in obligatoire pour chaque partage

### Événements Mystiques

#### Participation Communautaire
- **Données agrégées uniquement :** Statistiques anonymisées
- **Pas de tracking individuel :** Contribution anonyme
- **Révocation :** Déconnexion possible immédiatement

## 📱 Permissions Chrome

### Permissions Demandées et Justification

#### `storage`
**Usage :** Stockage local chiffré des données d'organisme  
**Étendue :** Appareil local uniquement  
**Sécurité :** Accès restreint à l'extension uniquement

#### `activeTab`
**Usage :** Analyse comportementale sur la page active  
**Étendue :** Page courante uniquement, sur activation  
**Sécurité :** Pas d'accès permanent, données anonymisées

### Permissions NON Demandées

Nous ne demandons **JAMAIS** :
- ❌ `<all_urls>` - Accès à tous les sites
- ❌ `history` - Historique de navigation
- ❌ `bookmarks` - Signets personnels
- ❌ `cookies` - Données de session
- ❌ `webRequest` - Interception requêtes
- ❌ `geolocation` - Position géographique

## 🔄 Traitement des Données

### Cycle de Vie des Données

#### Collecte
1. **Déclenchement :** Interaction utilisateur sur page active
2. **Filtrage :** Suppression automatique données sensibles
3. **Anonymisation :** Transformation en métriques anonymes
4. **Chiffrement :** Protection avant stockage

#### Traitement
1. **Analyse locale :** Algorithmes machine learning sur appareil
2. **Génération insights :** Création de suggestions personnalisées
3. **Évolution organisme :** Adaptation des traits et comportements
4. **Optimisation :** Amélioration continue de l'expérience

#### Stockage
1. **Chiffrement AES-256 :** Protection cryptographique forte
2. **Segmentation :** Données séparées par catégories
3. **Intégrité :** Vérification checksum automatique
4. **Compression :** Optimisation espace de stockage

#### Suppression
1. **Automatique :** Nettoyage données temporaires (7 jours)
2. **Manuelle :** Suppression utilisateur immédiate
3. **Sécurisée :** Overwrite cryptographique des données
4. **Vérification :** Contrôle effectivité suppression

### Base Légale du Traitement

#### Consentement (Article 6.1.a RGPD)
- **Opt-in explicite :** Installation volontaire extension
- **Information préalable :** Cette politique avant utilisation
- **Révocation simple :** Désinstallation = retrait consentement

#### Intérêt légitime (Article 6.1.f RGPD)
- **Fonctionnement technique :** Métriques performance uniquement
- **Amélioration produit :** Données agrégées anonymes
- **Test d'équilibrage :** Intérêts utilisateur > intérêts entreprise

## 🌍 Transferts Internationaux

### Pas de Transfert de Données
- **Traitement local :** 100% des données restent sur l'appareil
- **Pas de serveurs :** Aucune infrastructure externe
- **Pas de cloud :** Stockage uniquement local

### Architecture Décentralisée
- **P2P seulement :** Communications directes entre extensions
- **Pas de serveur central :** Élimination du risque de transfert
- **Réseau maillé :** Résilience sans point central

## 👶 Protection des Mineurs

### Conformité COPPA/RGPD Mineurs

#### Vérification d'Âge
- **Disclaimer installation :** Mention 13+ ans recommandé
- **Contrôle parental :** Respect restrictions navigateur
- **Consentement parental :** Délégation aux systèmes existants

#### Protection Renforcée
- **Données minimales :** Encore moins de données pour mineurs
- **Supervision :** Outils de contrôle parental intégrés
- **Éducation :** Messages de sensibilisation à la vie privée

## 🔔 Notifications et Communications

### Communications Extension
- **Notifications locales :** Alertes évolution organisme
- **Pas d'emails :** Aucune communication externe
- **Opt-out simple :** Désactivation dans paramètres

### Mises à Jour Politique
- **Notification in-app :** Changements importants signalés
- **Version tracking :** Historique des modifications
- **Consentement renouvelé :** Si changements substantiels

## 📞 Contact et Droits

### Délégué à la Protection des Données
**Email :** dpo@symbiont-extension.com  
**Réponse :** Sous 72h maximum  
**Langue :** Français, Anglais

### Autorité de Contrôle
En cas de litige non résolu :
**CNIL (France) :** https://www.cnil.fr/  
**Autres UE :** https://edpb.europa.eu/about-edpb/board/members_en

### Exercice des Droits

#### Accès aux Données
**Méthode :** Paramètres → Données → Export complet  
**Format :** JSON lisible et structuré  
**Délai :** Immédiat (génération automatique)

#### Rectification/Suppression
**Méthode :** Interface extension ou email DPO  
**Délai :** Immédiat pour interface, 72h pour email  
**Confirmation :** Notification de traitement

#### Réclamation
**Première instance :** support@symbiont-extension.com  
**Escalade :** dpo@symbiont-extension.com  
**Autorité :** CNIL ou équivalent national

## ⚡ Modifications de cette Politique

### Processus de Modification
1. **Révision :** Équipe juridique + DPO
2. **Impact assessment :** Analyse DPIA si nécessaire
3. **Notification :** In-app 30 jours avant application
4. **Consentement :** Renouvellement si changements substantiels

### Historique des Versions
- **v1.0.0 (17 août 2025) :** Version initiale
- **Versions suivantes :** Historique disponible sur GitHub

### Archive
Toutes les versions antérieures conservées sur :
https://github.com/symbiont/extension/blob/main/docs/legal/privacy-history.md

---

## 📋 Résumé Technique

### Données Personnelles : AUCUNE
### Stockage : 100% Local
### Chiffrement : AES-256-GCM
### Conformité : RGPD Article 25
### Audit : Grade B+ (82.5%)
### Support : dpo@symbiont-extension.com

---

**Cette politique s'applique uniquement à l'extension SYMBIONT et non aux sites web que vous visitez.**

*Politique rédigée en conformité avec RGPD, CCPA, et meilleures pratiques internationales.*