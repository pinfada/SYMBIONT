# NavigationCortex - Guide d'utilisation rapide

## Présentation

`NavigationCortex` analyse les séquences de navigation (URL, actions, timestamps) pour détecter des patterns comportementaux : routine, exploration, répétition, etc. Il permet d'ajouter des détecteurs personnalisés pour enrichir l'analyse.

## Exemple de code

```typescript
import { NavigationCortex } from '@/core/NavigationCortex';

const cortex = new NavigationCortex();
cortex.recordEvent({ url: 'https://a.com', timestamp: Date.now(), action: 'visit' });
cortex.recordEvent({ url: 'https://b.com', timestamp: Date.now(), action: 'visit' });

// Détecteur de routine (URL visitée > 2 fois)
cortex.addDetector(events => {
  const counts: Record<string, number> = {};
  for (const e of events) counts[e.url] = (counts[e.url] || 0) + 1;
  return Object.entries(counts)
    .filter(([_, c]) => c > 2)
    .map(([url, c]) => ({ type: 'routine', score: c, details: { url } }));
});

const patterns = cortex.getPatterns();
console.log(patterns);

// Reset
cortex.reset();
```

## Bonnes pratiques
- Ajouter plusieurs détecteurs pour couvrir différents patterns (exploration, routine, séquences temporelles)
- Réinitialiser l'historique régulièrement pour éviter la dérive mémoire
- Utiliser `toJSON()` pour le debug et la visualisation

## Points d'intégration
- **OrganismCore** : utiliser les patterns détectés pour adapter les traits ou déclencher des mutations
- **Modules comportementaux** : brancher d'autres analyses (PatternDetector, TemporalAnalyzer, PredictiveModel)

## Conseils de test et debug
- Utiliser les tests unitaires fournis (`NavigationCortex.test.ts`)
- Simuler des séquences variées pour valider la détection
- Vérifier la robustesse sur des historiques très longs 