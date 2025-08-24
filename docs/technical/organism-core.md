# OrganismCore - Guide d'intégration avancée

## 1. Architecture et rôle

`OrganismCore` est le cœur logique de l'organisme artificiel :
- Encapsule le réseau neuronal interne (`NeuralMesh`)
- Gère les traits, l'énergie, la santé, l'évolution
- Sert de pont entre la logique adaptative et le moteur WebGL (rendu visuel)
- Prêt pour extension perception, comportement, mémoire

## 2. Cycle de vie typique

1. **Initialisation**
   ```typescript
   import { OrganismCore } from '@/core/OrganismCore';
   const core = new OrganismCore('DNA_STRING', { curiosity: 0.7 });
   ```
2. **Stimulation sensorielle**
   ```typescript
   core.stimulate('perception', 1.0);
   core.propagate();
   ```
3. **Mutation (évolution)**
   ```typescript
   core.mutate(0.1); // mutation légère
   ```
4. **Synchronisation avec le moteur WebGL**
   ```typescript
   const shaderParams = core.getShaderParameters();
   // À passer à OrganismEngine pour le rendu
   ```
5. **Export état complet**
   ```typescript
   const state = core.getState();
   const debug = core.toJSON();
   ```

## 3. Intégration avec NeuralMesh et OrganismEngine

- **NeuralMesh** : accessible via `core.mesh` (pour extensions avancées)
- **OrganismEngine** : utiliser `getShaderParameters()` pour piloter le rendu, ou synchroniser les traits/états via `getState()`
- **Exemple** :
  ```typescript
  // Boucle principale
  core.stimulate('perception', inputValue);
  core.propagate();
  engine.render(core.getState());
  ```

## 4. Bonnes pratiques
- Toujours initialiser le mesh avec les nœuds/connexions nécessaires à votre logique
- Utiliser `setTraits()` pour adapter dynamiquement le comportement
- Appeler `mutate()` périodiquement pour simuler l'évolution
- Utiliser `toJSON()` pour le debug et la visualisation
- Couvrir chaque extension par des tests unitaires (voir `OrganismCore.test.ts`)

## 5. Conseils de debug et monitoring
- Surveiller l'évolution de l'énergie et de la santé pour détecter les dérives
- Visualiser le mesh via l'export JSON (outils externes possibles)
- Injecter des valeurs extrêmes pour tester la robustesse
- Utiliser les hooks de cycle de vie (stimulate, propagate, mutate) pour instrumenter le comportement

## 6. Extension future
- Ajout de réseaux sensoriels ou moteurs supplémentaires dans le mesh
- Couplage avec des modules de perception, mémoire, prédiction (Sprint 3+)
- Synchronisation bidirectionnelle avec l'UI (React, dashboard) 