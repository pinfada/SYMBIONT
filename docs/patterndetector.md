# PatternDetector - Guide d'utilisation rapide

## Présentation

`PatternDetector` fournit des utilitaires pour détecter des motifs avancés dans des séquences d'événements (navigation, actions utilisateur, logs, etc.). Il permet d'identifier des répétitions, alternances, bursts temporels et motifs périodiques.

## Exemple de code

```typescript
import { PatternDetector, SequenceEvent } from '@/core/PatternDetector';

const events: SequenceEvent[] = [
  { type: 'A', timestamp: 1 },
  { type: 'A', timestamp: 2 },
  { type: 'B', timestamp: 3 },
  { type: 'A', timestamp: 4 }
];

// Détection de répétition
const rep = PatternDetector.detectRepetition(events, 2);
// Détection d'alternance
const alt = PatternDetector.detectAlternance(events, 'A', 'B', 3);
// Détection de burst temporel
const burst = PatternDetector.detectBurst(events, 1000, 2);
// Détection de périodicité
const temp = PatternDetector.detectTemporalPattern(events, 1, 0.5);
```

## Bonnes pratiques
- Adapter les paramètres (seuils, tolérances) selon le contexte métier
- Chaîner plusieurs détections pour des analyses complexes
- Tester chaque motif sur des séquences variées

## Points d'intégration
- **NavigationCortex** : utiliser les utilitaires pour enrichir la détection de patterns
- **Modules comportementaux** : appliquer sur tout flux d'événements (logs, actions, signaux)

## Conseils de test et debug
- Utiliser les tests unitaires fournis (`PatternDetector.test.ts`)
- Vérifier la robustesse sur des séquences longues ou bruitées
- Visualiser les motifs détectés pour valider leur pertinence 