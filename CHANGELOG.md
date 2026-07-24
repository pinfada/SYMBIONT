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
- **NeuralMesh causal** : la perception DOM réelle traverse désormais le réseau (`processPattern({ sensory_input, memory_input })` → sorties émotionnelle/motrice + `learn({ feedback })`), et sa sortie **agit sur l'organisme** au lieu d'alimenter un simple champ d'affichage : la sortie émotionnelle tire la conscience, l'état ressenti pousse les traits (durcissement résilience/focus en environnement hostile, ouverture curiosité/créativité au calme). Une variable d'**hostilité environnementale** (montée par les menaces fortes détectées, décroissance dans le temps) devient l'entrée mémoire du réseau — les menaces se ressentent réellement. Application bornée dans le temps (anti-bruit).
- **État unifié** : le viewer du popup reflète l'organisme canonique du background via `ORGANISM_UPDATE`.
- **Cortex démarré** : le moteur de détection de menaces s'exécute dans le background et analyse les signaux de résonance DOM réels (Oracle en fallback main-thread, un service worker MV3 ne pouvant pas créer de Worker imbriqué).
- **Apprentissage hebbien** : passe périodique nourrie des comportements réels, appliquant des mutations de traits à l'organisme canonique.
- **Sommeil Analytique branché** : le cycle circadien est démarré dans le background (`circadianCycle.start()`), déclenchant réellement la synthèse onirique (vectorisation 32D → clustering par résonance adaptative → identification d'entités d'ombre cross-domain). Auparavant tout le moteur existait mais n'était jamais démarré (`OrganismVitalSystems`, seul appelant, non instancié).

### 🛡️ Détection de menaces réellement alimentée
- **Capteurs de menace côté page** (`ThreatObserver`, monde isolé) : scripts injectés dynamiquement (eval/Function/atob, obfuscation, chaînes encodées, scripts tiers), iframes cachés, requêtes réseau tierces / gros payloads / beacons. Le Cortex recevait jusqu'ici uniquement des signaux de résonance DOM ; ses règles (injection, obfuscation, exfiltration…) peuvent enfin se déclencher.
- **Détecteur de fingerprinting en monde MAIN** (`fp-detector.js`, content script `world: MAIN`) : hooke `canvas.toDataURL/getImageData`, `WebGL getParameter` (UNMASKED renderer/vendor), `AudioContext` → détecte les tentatives d'identification par empreinte. Ne lit jamais le contenu, signale seulement l'appel.
- **Câblage menace → Cortex → communication** : chaque signal devient un `CortexSignal` (source + métadonnées) soumis à l'analyse ; les menaces **fortes et immédiates** (fingerprinting canvas/audio, script obfusqué, iframe caché tiers) sont chuchotées dans la page, avec seuils conservateurs (canvas : petit canvas uniquement) et cooldown de 30 min par domaine+catégorie pour éviter les faux positifs et le bruit.
- **Protection anti-fingerprinting active** (`fp-protector.js`, content script `world: MAIN`) : le module `FingerprintProtection` (bruit déterministe canvas/WebGL/audio) était présent mais tournait en monde isolé — il ne protégeait donc rien. Il tourne désormais dans le monde MAIN et rend l'empreinte **fausse et différente sur chaque site** (stable dans la page → non-cassant), défaisant le pistage par corrélation cross-site. Actif par défaut (privacy-first), avec un vrai réglage on/off dans **Paramètres** (piloté vers le monde MAIN via `postMessage`). Détecter **et** neutraliser.

### 🗣️ Communication autonome (le symbiont parle seul, sobrement)
- **Fin du bruit** : suppression des murmures poétiques aléatoires émis à chaque visite (« Pourquoi cette boucle ? ») — pollution sans lien avec la perception réelle.
- **Chuchotement contextuel dans la page** : quand tu navigues sur un site appartenant à une infrastructure invisible déjà perçue par le rêve, le symbiont chuchote un message discret et auto-disparaissant DANS la page (Shadow DOM isolé), sans ouvrir le popup ni aucun bouton. Cooldown de 6 h par cluster pour ne jamais polluer.
- **Notification système rare** : uniquement pour une découverte **nouvelle et à fort impact** (≥ 2 domaines corrélés, impact ≥ 0.66, confiance ≥ 0.7), dédupliquée à vie par cluster. Nouvelle permission `notifications`.
- **Panneau Vigilance passif** : le bouton « Rêver maintenant » est retiré ; le panneau devient un journal en lecture seule. L'organisme rêve seul pendant les phases d'inactivité et décide seul quand parler.

### 🪞 État ressenti visible dans le popup (passif)
- **Face visible du système nerveux** : les effets causals câblés (conscience tirée par la sortie émotionnelle, climat d'hostilité monté par les menaces et modulé par l'attention, activité neuronale) n'étaient reflétés nulle part. Nouveau `FELT_STATE` diffusé par le background (à chaque perception, menace, ou signal d'attention marquant) et nouveau panneau **passif** `FeltStatePanel` en tête de l'onglet Organisme : humeur dérivée (au calme / serein / attentif / vigilant) + jauges conscience, climat perçu, activité neuronale. Purement informatif, aucun bouton — l'organisme reflète seul ce qu'il ressent. Instantané fourni à l'ouverture via `GET_FELT_STATE`.

### 👁️ Signaux d'attention exploités (et assainis)
- **Câblage attention → organisme** : `AttentionMonitor` calculait des métriques riches (engagement profond, flux de lecture, distraction, multitâche) et émettait `ATTENTION_EVENT` vers le background… qui n'avait **aucun handler** (le type n'était même pas dans l'enum `MessageType`) — perception morte. Désormais le climat attentionnel **façonne réellement l'organisme** : engagement profond / lecture → l'organisme s'ouvre (focus + curiosité, conscience qui monte) et l'hostilité ressentie décroît ; distraction / multitâche → légère érosion du focus, hausse d'adaptabilité, et hausse de l'hostilité ressentie qui **nourrit la prochaine propagation du NeuralMesh** (intégration avec le système nerveux). Effet borné dans le temps (anti-bruit) ; l'inactivité reste gérée par le cycle circadien.
- **Assainissement privacy à la source** : le payload `ATTENTION_EVENT` transmis au background transportait le **texte visible de la page**, l'URL et le titre en clair. Il ne porte plus que des **métriques scalaires** (niveau de focus, vitesse de lecture, vélocité de scroll, multitâche, motif d'engagement) + le type ; aucun contenu, aucune URL. L'événement complet reste confiné à la page (jamais transmis).

### 🛡️ Rituels de protection réellement conditionnels
- **Déclenchement autonome sur perception réelle** : les rituels de contre-mesure (`TemporalDephasing` → latence réseau injectée sur les traceurs + bruit DOM + empoisonnement d'empreinte via `CountermeasureHandler`, `FrequencyCommunion`) étaient gérés par un gate `if/else` grossier dans le background, et leur contexte était reconstruit depuis un stockage possiblement périmé (`getCurrentContext`) — de sorte que leur propre `canTrigger` pouvait les bloquer sur des métriques à zéro. Désormais le background fournit le **contexte de perception vivant** (friction/pression réseau/oppression DOM réelles + organisme canonique) via `evaluateAutonomousTriggers`, et chaque rituel décide seul (`canTrigger`, cooldown et rate-limit inclus).
- **STRUCTURE_INSTINCT enfin atteignable** : l'analyse structurelle profonde (léthargie informationnelle) n'était déclenchée nulle part. Une évaluation périodique de léthargie (toutes les 3 min) offre un contexte calme aux rituels ; seule sa condition — indépendante d'échelle, basée sur le temps depuis la dernière mutation — s'y active, auto-limitée par son cooldown (15 min) et son plafond (4/h). Les contre-mesures (friction nulle au repos) ne s'y déclenchent pas.
- **Chemin de bus corrigé** : le déclenchement automatique passait par des listeners `RESONANCE_UPDATE` sur le `MessageBus` partagé, qui est un no-op dans ce contexte d'exécution — ils ne se réveillaient jamais. La logique d'évaluation est extraite en méthode publique directe (`RitualManager.evaluateContext`) appelée avec le contexte réel, sans dépendre du bus.

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