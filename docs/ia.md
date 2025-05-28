# IA et Algorithmes

## Sommaire
- [1. Apprentissage Hebbien](#1-apprentissage-hebbien)
- [2. Behavioral Predictor](#2-behavioral-predictor)
- [3. Genetic Mutator](#3-genetic-mutator)
- [4. Intelligence Collective](#4-intelligence-collective)
- [5. Points d'extension](#5-points-dextension)

---

## 1. Apprentissage Hebbien
**Fichier :** `src/neural/HebbieanLearningSystem.ts`

- Renforcement des connexions selon la règle de Hebb (Δw = η * pre * post)
- Affaiblissement progressif des connexions inactives (anti-Hebbien)
- Gestion de l'historique d'activation, plasticité adaptative

**API principale :**
```ts
const hebb = new HebbieanLearningSystem(0.01, 10000);
hebb.strengthenConnection('A', 'B', 0.8, 0.7);
hebb.weakenUnusedConnections();
const patterns = hebb.detectEmergentPatterns();
```

---

## 2. Behavioral Predictor
**Fichier :** `src/neural/BehavioralPredictor.ts`

- Historique des contextes/actions
- Prédiction de la prochaine action (Markov ou fréquence)
- Feedback pour apprentissage

**API principale :**
```ts
const predictor = new BehavioralPredictor();
predictor.record(context, 'explore');
const prediction = predictor.predictNextAction(context);
```

---

## 3. Genetic Mutator
**Fichier :** `src/neural/GeneticMutator.ts`

- Calcul dynamique de la probabilité de mutation
- Génération de mutations sur traits ou DNA
- Application et historisation des mutations

**API principale :**
```ts
const mutator = new GeneticMutator();
const prob = mutator.calculateMutationProbability(organism);
const mutation = mutator.generateMutation('curiosity');
const newOrg = mutator.applyMutation(organism, mutation);
```

---

## 4. Intelligence Collective
**Fichier :** `src/social/SocialNetworkManager.ts`

- Détection de synchronisation collective (plusieurs utilisateurs)
- Fusion de traits (moyenne)
- Application d'un bonus collectif (ex : +empathie, +créativité)

**API principale :**
```ts
const manager = new SocialNetworkManager(memoryBank, security);
const sync = await manager.detectCollectiveSync(userIds);
const fused = await manager.fuseTraits(userIds);
await manager.applyCollectiveBonus(userIds, { empathy: 0.05 });
const result = await manager.triggerCollectiveWake('rituel', userIds);
```

---

## 5. Points d'extension
- Ajouter des algorithmes d'apprentissage profond (ex : réseaux de neurones réels)
- Enrichir le prédicteur comportemental (reinforcement learning, clustering…)
- Intelligence collective avancée (vote, fusion distribuée, propagation de modèles)
- Monitoring et visualisation des patterns IA

---

**Documentation générée automatiquement – SYMBIONT** 