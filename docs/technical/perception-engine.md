# PerceptionEngine - Guide d'utilisation rapide

## Présentation

`PerceptionEngine` est un moteur de prétraitement/fusion des signaux sensoriels. Il permet d'appliquer des filtres personnalisés (moyenne, seuillage, normalisation, etc.) pour extraire des features exploitables par le cœur de l'organisme.

## Exemple de code

```typescript
import { PerceptionEngine } from '@/core/PerceptionEngine';

const engine = new PerceptionEngine();
// Ajout d'un filtre de moyenne
engine.addFilter(inputs => {
  const avg = Object.values(inputs).reduce((a, b) => a + b, 0) / Object.keys(inputs).length;
  return Object.fromEntries(Object.keys(inputs).map(k => [k, avg]));
});

// Traitement d'inputs sensoriels
const features = engine.process({ vision: 0.8, touch: 0.2 });
console.log(features); // { vision: 0.5, touch: 0.5 }

// Reset
engine.reset();
```

## Bonnes pratiques
- Chaîner plusieurs filtres pour des traitements complexes (ex : normalisation → seuillage → extraction)
- Utiliser `reset()` à chaque cycle si le moteur doit être stateless
- Tester chaque filtre indépendamment

## Points d'intégration
- **SensoryNetwork** : passer la sortie de `getInputs()` à `process()`
- **OrganismCore** : utiliser les features extraites pour piloter le comportement, la mémoire, etc.

## Conseils de test et debug
- Utiliser les tests unitaires fournis (`PerceptionEngine.test.ts`)
- Vérifier le comportement sur entrées extrêmes ou bruitées
- Exploiter `toJSON()` pour le debug et la visualisation 