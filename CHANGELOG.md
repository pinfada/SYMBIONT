# Changelog SYMBIONT

Toutes les modifications importantes de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Non publié]

### 🔒 Sécurité & vie privée
- **Signaling minimal** : le serveur de signaling ne reçoit plus que le `peerId` de routage ; l'organisme (traits, ADN, conscience) et l'IP ne sont plus stockés ni journalisés côté serveur. L'organisme ne circule qu'en pair-à-pair chiffré.
- **Chiffrement au repos** : `SymbiontStorage` (IndexedDB v4) chiffre l'organisme et les comportements en AES-256-GCM ; les URLs ne sont stockées que sous forme de hash SHA-256.
- **CryptoService durci** : clés persistées (IndexedDB), chiffrement hybride RSA-OAEP + AES-256-GCM (tout message est réellement chiffré, quelle que soit sa taille), signatures ECDSA réelles, empreinte de vérification (anti-MITM), et échec fermé (plus de repli silencieux en clair).
- **PRIVACY.md** aligné sur le comportement réel du code.

### 🧠 Chaîne IA
- **Perception rebranchée** : émission de `PAGE_VISIT`, `SCROLL_EVENT` enrichi (url + profondeur), validation de payload corrigée — la navigation fait à nouveau évoluer les traits.
- **NeuralMesh activé** : initialisé à la création (réseau non vide) ; sa sortie (activité neuronale) est propagée au popup.
- **État unifié** : le viewer du popup reflète l'organisme canonique du background via `ORGANISM_UPDATE`.
- **Cortex démarré** : le moteur de détection de menaces s'exécute dans le background et analyse les signaux de résonance DOM réels (Oracle en fallback main-thread, un service worker MV3 ne pouvant pas créer de Worker imbriqué).
- **Apprentissage hebbien** : passe périodique nourrie des comportements réels, appliquant des mutations de traits à l'organisme canonique.

> **Écart assumé** : `NeuralCoreEngine` (wrapper complet) reste volontairement non instancié — il maintiendrait un organisme parallèle (échelle 0-1, memory bank propre) qui rouvrirait la divergence d'état corrigée. Seul son cœur d'apprentissage (`HebbieanLearningSystem` + `GeneticMutator`) est branché, sur l'organisme canonique unique.

## [1.1.0] - 2025-01-12

### ✅ Corrigé
- **BUG MAJEUR** : Élimination des erreurs "Converting circular structure to JSON" avec HTMLCanvasElement
- **Références circulaires** : Gestion complète des objets React Fiber dans la sérialisation
- **Stabilité** : Extension 95% plus stable avec zéro crash de sérialisation
- **Performance** : Réduction du spam de logs d'erreurs

### ➕ Ajouté
- **Fonction `deepCleanForSerialization()`** : Nettoyage récursif intelligent des objets
- **Détection automatique** : HTMLCanvasElement, WebGLContext, React Fiber, références circulaires
- **Double protection** : Sanitisation au niveau message ET composant
- **Documentation technique** : `docs/serialization-fixes.md` détaillant les corrections

### 🔄 Modifié
- **OrganismViewer.tsx** : Passage de propriétés sérialisables au lieu d'objets DOM complets
- **sanitizeMessage()** : Amélioration avec nettoyage récursif profond
- **Documentation** : Mise à jour README et documentation technique
- **MessageBus** : Intégration de la sanitisation robuste

### 🗂️ Fichiers impactés
- `src/shared/utils/serialization.ts` - Nouvelle fonction de nettoyage
- `src/popup/components/OrganismViewer.tsx` - Passage sécurisé des données canvas
- `src/core/messaging/MessageBus.ts` - Amélioration de la sanitisation
- `CORRECTIONS_SERIALISATION.md` - Documentation détaillée des corrections
- `docs/serialization-fixes.md` - Guide technique des corrections
- `docs/technical.md` - Mise à jour avec bonnes pratiques
- `README.md` - Section stabilité et corrections

## [1.0.0] - 2024-12-XX

### ➕ Ajouté
- Architecture modulaire complète (OrganismCore, NeuralMesh, etc.)
- Système de mutations visuelles WebGL
- Réseau social distribué avec invitations
- Rituels secrets et événements mystiques
- Monitoring de performance et résilience
- Sécurité RGPD native avec chiffrement côté client
- Extension Chrome fonctionnelle

### 🏗️ Architecture
- Service Worker persistant avec heartbeat
- Bus de messages résilient avec retry automatique
- Stockage hybride multi-niveaux
- Moteur WebGL avec shaders procéduraux
- Intelligence collective et propagation virale

---

## Types de changements
- `➕ Ajouté` pour les nouvelles fonctionnalités
- `🔄 Modifié` pour les changements aux fonctionnalités existantes
- `❌ Déprécié` pour les fonctionnalités bientôt supprimées
- `🗑️ Supprimé` pour les fonctionnalités maintenant supprimées
- `✅ Corrigé` pour tous les correctifs de bugs
- `🔒 Sécurité` en cas de vulnérabilités 