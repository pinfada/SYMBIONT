# Sécurité avancée & RGPD

## Sommaire
- [1. Chiffrement des données](#1-chiffrement-des-données)
- [2. Anonymisation](#2-anonymisation)
- [3. Contrôle d'accès](#3-contrôle-daccès)
- [4. Points d'extension](#4-points-dextension)
- [5. Intégration dans les flux critiques](#5-intégration-dans-les-flux-critiques)
- [6. Log d'accès (audit RGPD)](#6-log-daccès-audit-rgpd)
- [7. Export chiffré des données utilisateur (UI)](#7-export-chiffré-des-données-utilisateur-ui)
- [8. Outil de déchiffrement utilisateur (UI)](#8-outil-de-déchiffrement-utilisateur-ui)

## Permissions Chrome utilisées

| Permission      | Usage dans SYMBIONT                                                                 | Recommandation sécurité                        |
|----------------|-------------------------------------------------------------------------------------|------------------------------------------------|
| storage        | Stockage des états, logs, données critiques (via HybridStorageManager)              | Nécessaire, usage documenté                    |
| tabs           | Analyse du contexte de navigation, adaptation comportementale, rituels contextuels  | Restreindre l'accès, ne jamais logger d'URL    |
| webNavigation  | Détection des changements de page, adaptation dynamique de l'organisme              | Utiliser uniquement pour adaptation, anonymiser |
| alarms         | Planification des tâches périodiques (heartbeat, maintenance, monitoring)           | Usage limité, pas de données sensibles         |
| idle           | Détection d'inactivité pour adaptation ou maintenance                               | Usage limité, pas de tracking utilisateur      |
| <all_urls>     | Nécessaire pour l'injection de scripts et la collecte contextuelle                  | Restreindre au maximum, anonymiser les données |

**Bonnes pratiques** :
- Toujours documenter l'usage de chaque permission dans le code et la doc.
- Ne jamais collecter ni stocker d'informations personnelles ou d'URL complètes.
- Limiter l'accès aux permissions au strict nécessaire (principe du moindre privilège).
- Auditer régulièrement le manifest et retirer toute permission non utilisée.

---

## 1. Chiffrement des données
**Fichier :** `src/background/SecurityManager.ts`

- Chiffrement AES-GCM (WebCrypto) si disponible, sinon base64 (fallback)
- Déchiffrement symétrique

**API principale :**
```ts
const sec = new SecurityManager();
const encrypted = await sec.encryptSensitiveData(obj);
const decrypted = await sec.decryptSensitiveData(encrypted);
```

---

## 2. Anonymisation
- Suppression des PII (URL, userId, id, etc.)
- Hashage des identifiants (méthode `hash`)

**API principale :**
```ts
const anonymized = sec.anonymizeForSharing(behaviorPattern);
```

---

## 3. Contrôle d'accès
- Validation d'accès par userId, ressource, rôle (user/admin)

**API principale :**
```ts
const ok = sec.validateDataAccess({ userId, resource, role }, 'admin');
```

---

## 4. Points d'extension
- Passage à un vrai hash SHA-256 asynchrone (WebCrypto)
- Gestion de clés de chiffrement par utilisateur
- Journalisation des accès et alertes sécurité
- Audit RGPD automatisé

---

## 5. Intégration dans les flux critiques
- Contrôle d'accès effectif dans le background script :
  - Consommation d'invitation (`MessageType.CONSUME_INVITATION`)
  - Acceptation de mutation partagée (`MessageType.ACCEPT_SHARED_MUTATION`)
- Si l'accès est refusé, une erreur explicite est renvoyée au client.

**Exemple :**
```ts
if (!security.validateDataAccess({ userId, resource, role }, 'user')) {
  // Accès refusé
  sendError('Accès refusé.');
  return;
}
```

---

## 6. Log d'accès (audit RGPD)
- Possibilité de journaliser chaque accès ou tentative sensible (voir `core/securityMonitor.ts`)
- Exemple de log :
```ts
import { logAccess } from '../core/securityMonitor';
logAccess(ip, route, status); // status 200, 403, etc.
```
- Permet d'auditer les accès, détecter les abus, et répondre aux demandes RGPD.

---

## 7. Export chiffré des données utilisateur (UI)
- Depuis la popup RGPD, l'utilisateur peut exporter ses données locales sous forme chiffrée (AES-GCM ou base64).
- Le chiffrement est réalisé côté client via `SecurityManager.encryptSensitiveData`.
- Le fichier exporté est inutilisable sans déchiffrement (protection en cas de fuite).

**Exemple d'appel dans l'UI :**
```ts
const sec = new SecurityManager();
const encrypted = await sec.encryptSensitiveData(data);
// Blob et téléchargement
```
- Un état de chargement et d'erreur est affiché à l'utilisateur.

---

## 8. Outil de déchiffrement utilisateur (UI)
- Accessible depuis la popup RGPD (« Déchiffrer des données »)
- Permet de coller un texte chiffré (export, mutation, invitation…)
- Utilise `SecurityManager.decryptSensitiveData` pour afficher le contenu déchiffré
- Affiche un message d'erreur si la clé est incorrecte ou le format invalide

**Procédure d'utilisation :**
1. Ouvrir la popup RGPD
2. Cliquer sur « Déchiffrer des données »
3. Coller le texte chiffré dans la zone prévue
4. Cliquer sur « Déchiffrer »
5. Le contenu JSON s'affiche si la clé est correcte

**Exemple d'appel dans l'UI :**
```ts
const sec = new SecurityManager();
const decrypted = await sec.decryptSensitiveData(cipherText);
```

- Compatible avec tous les exports chiffrés SYMBIONT (données, mutations, invitations)
- Respecte la portabilité RGPD et la transparence utilisateur

---

**Documentation générée automatiquement – SYMBIONT** 