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

## Intégration avancée : propagation contextuelle et triggers collectifs

Depuis la version 2024, PatternDetector est branché dans le background de l'extension pour :
- Analyser en temps réel les séquences d'événements utilisateur (navigation, scroll, interactions)
- Déclencher dynamiquement des invitations contextuelles selon les patterns détectés (burst, cycle, alternance, répétition)
- Détecter et signaler le franchissement de seuils collectifs (propagation virale à vague)

### Exemple d'intégration dans le background

```typescript
// Ajout d'un événement utilisateur
this.events.push({ type: 'visit', timestamp: Date.now(), url });
// Analyse contextuelle
this.analyzeContextualPatterns();

// Analyse contextuelle (extrait)
const bursts = PatternDetector.detectBurst(this.events, 10000, 5);
if (bursts.length > 0) triggerContextualInvitation('burst_activity');
const cycles = PatternDetector.detectTemporalPattern(this.events, 60000, 0.15);
if (cycles.length > 0) triggerContextualInvitation('temporal_cycle');
// ...
```

### Conseils
- Adapter les seuils et types de patterns selon le contexte métier
- Utiliser la notification UI pour différencier les triggers collectifs
- Persister les seuils déjà atteints pour éviter les doublons

Voir aussi la section technique sur la propagation virale et les triggers collectifs. 