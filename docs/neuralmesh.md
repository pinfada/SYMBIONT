# NeuralMesh - Guide d'utilisation rapide

## Présentation

`NeuralMesh` est un module de graphe neuronal orienté conçu pour modéliser la dynamique interne d'un organisme artificiel. Il permet de simuler des réseaux de neurones simples : propagation, plasticité, mutation, et export JSON pour visualisation/debug.

## Cas d'usage typiques
- Modélisation de la mémoire, de la perception, de la prise de décision
- Génération de comportements adaptatifs
- Couplage avec le moteur WebGL pour visualiser l'état interne

## Exemple de code

```typescript
import { NeuralMesh } from '@/core/neural/NeuralMesh';

// Création du réseau
const mesh = new NeuralMesh();
mesh.addNode('in1', 'input');
mesh.addNode('h1', 'hidden');
mesh.addNode('out1', 'output');
mesh.addConnection('in1', 'h1', 0.8);
mesh.addConnection('h1', 'out1', 1.2);

// Stimulation et propagation
mesh.stimulate('in1', 1);
mesh.propagate();
console.log('Activation sortie:', mesh.getActivation('out1'));

// Plasticité (apprentissage)
mesh.adapt(0.05);

// Mutation aléatoire
mesh.mutate(0.1);

// Réinitialisation
mesh.reset();

// Export JSON pour debug/visualisation
console.log(mesh.toJSON());
```

## Bonnes pratiques
- Toujours vérifier l'existence des nœuds avant d'ajouter des connexions
- Utiliser `reset()` avant chaque nouvelle séquence de stimulation pour éviter les effets de bord
- Adapter le taux de plasticité selon la dynamique souhaitée (plus élevé = apprentissage rapide mais instable)
- Utiliser `mutate()` pour simuler l'évolution ou l'adaptation structurelle

## Points d'intégration
- **OrganismCore** : le NeuralMesh peut être encapsulé dans le cœur de l'organisme pour piloter les traits, la mémoire ou la prise de décision
- **Moteur WebGL** : les activations ou la structure du mesh peuvent être visualisées en temps réel (ex : couleur, forme, animation)

## Conseils de test et debug
- Utiliser les tests unitaires fournis (`NeuralMesh.test.ts`) pour valider chaque extension
- Exploiter `toJSON()` pour visualiser le réseau dans des outils externes (ex : graphviz, d3.js)
- Simuler des séquences de stimulation/propagation pour observer la dynamique du réseau 