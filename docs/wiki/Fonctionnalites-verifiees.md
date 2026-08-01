# ✅ Fonctionnalités vérifiées

Synthèse de l'état de vérification de chaque fonctionnalité. Toutes les captures
du wiki sont des **rendus réels** du build courant, obtenus en pilotant le popup
de façon automatisée (navigation + interactions).

## Tableau récapitulatif

| Domaine | Fonctionnalité | Statut | Preuve |
|---|---|---|---|
| Organisme | Rendu fractal WebGL temps réel | ✅ vérifié | [page](Organisme) + tests moteur |
| Organisme | Nutrition — nourrissage manuel + cooldown live | ✅ vérifié | [page](Organisme) |
| Organisme | Contrôles WebGL (interrupteur persisté) | ✅ vérifié | [page](Organisme) |
| Réseau | Graphe P2P + nœud « Moi » | ✅ affiché | [page](Reseau) |
| Réseau | Sous-onglets Pairs / Messages / Stats | ✅ affichés | [page](Reseau) |
| Réseau | Connexions P2P live (partage/sync) | 🧪 à valider | nécessite 2 instances connectées |
| Stats | Métriques d'évolution | ✅ affiché | [page](Stats) |
| Rituels | Lancement + progression en direct | ✅ vérifié | [page](Rituels) |
| Rituels | Réaction visuelle de l'organisme | ✅ vérifié | [page](Rituels) |
| Rituels | Dégradation gracieuse (page protégée) | ✅ vérifié | flux headless |
| Rituels | Sous-onglets Actif / Historique / Secrets | ✅ affichés | [page](Rituels) |
| Social | Génération de code auto-porteur | ✅ vérifié | [page](Social) |
| Social | Acceptation **cross-installation** | ✅ vérifié | 2 contextes isolés + tests |
| Social | Héritage + réaction de l'organisme | ✅ vérifié | [page](Social) |
| Social | Sous-onglets Guide / Contacts / Partager | ✅ affichés | [page](Social) |
| Paramètres | Réduire les animations (persisté) | ✅ vérifié | [page](Parametres) + tests |
| Paramètres | Qualité du rendu → supersampling | ✅ vérifié | [page](Parametres) + tests |
| Cognition | Détection WebGPU + repli NeuralMesh | ✅ vérifié | [page](Cognition) + tests |
| Cognition | Catalogue de modèles + préférences | ✅ vérifié | [page](Cognition) + tests |
| Cognition | Chat local (streaming) | 🧪 à valider en vrai | logique testée ; WebGPU non exécutable en CI |
| Cognition | Analyse de fiabilité → signal organisme | ✅ logique vérifiée | [page](Cognition) + tests (parsing/nudge) |
| Cognition | Moteur offscreen (persiste popup fermé) + repli | 🧪 à valider en vrai | protocole/repli/bail testés ; round-trip WebGPU à confirmer |
| Cognition | Delta de compréhension (anti-feed : nouveauté ≠ surface) | ✅ logique vérifiée | invariant testé — [comprehension-delta](../comprehension-delta.md) |
| Cognition | Digestion persistante (modèle du monde qui grossit) | ✅ logique vérifiée | `KnowledgeStore`/`SurfaceJournal` + tests ; qualité LLM à valider en vrai |
| Cognition | Écran « ce qui a bougé aujourd'hui » | ✅ vérifié | `WhatMovedPanel` + `partitionSurface` testé, réactif au journal |

## Couverture de tests automatisés

- `OrganismRenderer.test.ts` — moteur de rendu (WebGL2→WebGL1, supersampling,
  alpha prémultiplié, perte de contexte, unicité par ADN).
- `OrganismPreferences.test.ts` — réglages (défauts, persistance, notification,
  mapping qualité).
- `InviteCode.test.ts` — codec d'invitation (round-trip, unicode, rejet des codes
  corrompus/tronqués/expirés, expiration).
- `src/shared/llm/__tests__/*` — module cognitif : détection WebGPU, catalogue de
  modèles, moteur (load/stream/abort/unload), préférences, analyse de fiabilité
  (parsing tolérant + fallback), signal organisme, client offscreen
  (protocole/timeout), fabrique offscreen→popup.
- `src/shared/comprehension/__tests__/*` — delta de compréhension : embedding
  déterministe, modèle du monde (assimilation/renforcement/récupération/prune),
  extraction de claims, classement de relation, **invariant anti-feed** (la
  nouveauté ne fait jamais surface), persistance (`KnowledgeStore`), journal de
  surface, service de lecture persistant, embedding sémantique (`SemanticEmbedder` :
  cache + repli, moteur injecté).

## Ce qui reste à valider en conditions réelles

Les **connexions P2P en direct** (partage d'énergie et synchronisation de
conscience entre deux pairs effectivement connectés) demandent deux navigateurs
réels reliés — elles seront validées lors de la QA multi-profils Firefox décrite
dans le dépôt.

Le **module Cognition** exécute un LLM via **WebGPU**, que l'environnement de CI
ne peut pas faire tourner (ni télécharger un modèle). Toute la logique
(détection, catalogue, protocole offscreen, repli, parsing, signal organisme)
est couverte par des tests unitaires, mais le **round-trip inférence réel** doit
être confirmé dans un Chrome/Edge récent avec l'extension chargée. Tout le reste
est vérifié ici.
