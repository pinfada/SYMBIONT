# API Reference SYMBIONT

Documentation technique complète de l'API SYMBIONT pour développeurs et intégrateurs.

## 📋 Vue d'Ensemble

L'API SYMBIONT permet la communication entre les différents composants de l'extension via un système de messages typés. Tous les échanges passent par le **Resilient Message Bus** qui garantit la fiabilité et la persistance des communications.

### Architecture de Communication
```
Content Script <---> Background Service <---> Popup UI
      |                       |                    |
      |                 [Message Bus]              |
      |                       |                    |
   Observers            Core Modules         React Components
```

## 🔧 Configuration de Base

### Import et Initialisation
```typescript
// Dans un Content Script
import { MessageBus } from '@/shared/messaging';

const messageBus = new MessageBus();

// Envoyer un message
messageBus.send({
  type: 'EVOLVE_ORGANISM',
  payload: { behaviorData: collectBehaviorData() }
});

// Écouter des messages
messageBus.listen('ORGANISM_UPDATED', (data) => {
  updateUI(data);
});
```

## 📨 Types de Messages

### Messages Core

#### CREATE_ORGANISM
Création d'un nouvel organisme.

```typescript
interface CreateOrganismMessage {
  type: 'CREATE_ORGANISM';
  payload: {
    initialTraits?: Partial<OrganismTraits>;
    preferences?: UserPreferences;
  };
}

// Exemple
messageBus.send({
  type: 'CREATE_ORGANISM',
  payload: {
    initialTraits: {
      curiosity: 0.8,
      adaptability: 0.6,
      energy: 0.9
    },
    preferences: {
      learningSpeed: 'medium',
      privacyLevel: 'high'
    }
  }
});
```

**Réponse:**
```typescript
{
  success: true,
  data: {
    organism: OrganismState,
    id: string
  }
}
```

#### EVOLVE_ORGANISM
Évolution de l'organisme basée sur les données comportementales.

```typescript
interface EvolveOrganismMessage {
  type: 'EVOLVE_ORGANISM';
  payload: {
    behaviorData: BehaviorData[];
    context?: NavigationContext;
  };
}

// Exemple
messageBus.send({
  type: 'EVOLVE_ORGANISM',
  payload: {
    behaviorData: [
      {
        type: 'click',
        element: 'button',
        timestamp: Date.now(),
        context: { url: window.location.href }
      },
      {
        type: 'scroll',
        direction: 'down',
        speed: 'fast',
        timestamp: Date.now()
      }
    ]
  }
});
```

**Réponse:**
```typescript
{
  success: true,
  data: {
    organism: OrganismState,
    mutations: Mutation[],
    evolutionScore: number
  }
}
```

#### GET_ORGANISM_STATE
Récupération de l'état actuel de l'organisme.

```typescript
interface GetOrganismStateMessage {
  type: 'GET_ORGANISM_STATE';
  payload: {
    includeHistory?: boolean;
    includeMetrics?: boolean;
  };
}
```

**Réponse:**
```typescript
{
  success: true,
  data: {
    organism: OrganismState,
    history?: EvolutionHistory[],
    metrics?: PerformanceMetrics
  }
}
```

### Messages Prédictifs

#### PREDICT_ACTION
Demande de prédiction d'action basée sur le contexte.

```typescript
interface PredictActionMessage {
  type: 'PREDICT_ACTION';
  payload: {
    context: {
      url: string;
      time: number;
      userAgent: string;
      domStructure?: DOMSnapshot;
    };
  };
}

// Exemple
messageBus.send({
  type: 'PREDICT_ACTION',
  payload: {
    context: {
      url: 'https://example.com',
      time: Date.now(),
      userAgent: navigator.userAgent,
      domStructure: captureDOMSnapshot()
    }
  }
});
```

**Réponse:**
```typescript
{
  success: true,
  data: {
    predictions: ActionPrediction[],
    confidence: number,
    suggestions: string[]
  }
}
```

### Messages Sociaux

#### GENERATE_INVITATION
Génération d'un code d'invitation pour partager l'organisme.

```typescript
interface GenerateInvitationMessage {
  type: 'GENERATE_INVITATION';
  payload: {
    duration?: number; // en heures
    permissions?: SharingPermissions;
  };
}
```

**Réponse:**
```typescript
{
  success: true,
  data: {
    invitationCode: string,
    expiresAt: number,
    qrCode: string
  }
}
```

#### SHARED_MUTATION
Application d'une mutation partagée depuis la communauté.

```typescript
interface SharedMutationMessage {
  type: 'SHARED_MUTATION';
  payload: {
    mutationData: MutationData;
    sourceOrganismId: string;
    trust: number;
  };
}
```

#### TRIGGER_RITUAL
Déclenchement ou participation à un rituel mystique.

```typescript
interface TriggerRitualMessage {
  type: 'TRIGGER_RITUAL';
  payload: {
    ritualType: 'community' | 'personal' | 'collective';
    participants?: string[];
    duration?: number;
  };
}
```

### Messages Visuels

#### APPLY_VISUAL_MUTATION
Application d'une mutation visuelle à l'organisme.

```typescript
interface ApplyVisualMutationMessage {
  type: 'APPLY_VISUAL_MUTATION';
  payload: {
    mutationType: VisualMutationType;
    parameters: Record<string, any>;
    temporary?: boolean;
  };
}
```

### Messages Utilitaires

#### PING
Test de connectivité et de santé du système.

```typescript
interface PingMessage {
  type: 'PING';
  payload: {
    timestamp: number;
    source: 'content' | 'popup' | 'background';
  };
}
```

**Réponse:**
```typescript
{
  success: true,
  data: {
    pong: number,
    latency: number,
    health: 'excellent' | 'good' | 'degraded' | 'critical'
  }
}
```

#### GET_HISTORY
Récupération de l'historique d'évolution.

```typescript
interface GetHistoryMessage {
  type: 'GET_HISTORY';
  payload: {
    limit?: number;
    startDate?: number;
    endDate?: number;
    eventTypes?: EventType[];
  };
}
```

## 📊 Types de Données

### OrganismState
```typescript
interface OrganismState {
  id: string;
  traits: OrganismTraits;
  energy: number;
  health: number;
  age: number;
  mutations: Mutation[];
  socialConnections: Connection[];
  learningHistory: LearningEvent[];
  visualState: VisualState;
}
```

### OrganismTraits
```typescript
interface OrganismTraits {
  curiosity: number;        // 0-1
  adaptability: number;     // 0-1
  energy: number;          // 0-1
  sociability: number;     // 0-1
  intelligence: number;    // 0-1
  creativity: number;      // 0-1
}
```

### BehaviorData
```typescript
interface BehaviorData {
  type: 'click' | 'scroll' | 'hover' | 'key' | 'focus' | 'navigate';
  element?: string;
  timestamp: number;
  context: {
    url: string;
    title?: string;
    viewport?: { width: number; height: number };
  };
  metadata?: Record<string, any>;
}
```

### Mutation
```typescript
interface Mutation {
  id: string;
  type: MutationType;
  timestamp: number;
  trigger: string;
  effect: MutationEffect;
  fitness: number;
  inherited?: boolean;
}
```

## 🔒 Sécurité et Authentification

### Headers Requis
```typescript
const headers = {
  'X-SYMBIONT-Version': '1.0',
  'X-SYMBIONT-Source': 'content-script',
  'X-SYMBIONT-Timestamp': Date.now().toString()
};
```

### Validation des Messages
Tous les messages sont automatiquement validés :
- **Type Safety** : Validation TypeScript stricte
- **Payload Validation** : Schéma JSON validé
- **Rate Limiting** : Protection contre le spam
- **Encryption** : Chiffrement des données sensibles

### Logging Sécurisé
```typescript
import { logger } from '@/shared/utils';

// ✅ Logging sécurisé
logger.info('Message sent', { type: message.type }, 'MessageBus');

// ❌ Éviter
console.log('Message:', message); // Peut exposer des données sensibles
```

## 📈 Monitoring et Performance

### Métriques Disponibles
```typescript
interface PerformanceMetrics {
  messageLatency: number;
  processingTime: number;
  memoryUsage: number;
  errorRate: number;
  throughput: number;
}
```

### Health Check
```typescript
// Vérification de santé automatique
messageBus.send({
  type: 'PING',
  payload: { timestamp: Date.now(), source: 'content' }
}).then((response) => {
  if (response.data.health === 'critical') {
    // Activer mode dégradé
    enableFallbackMode();
  }
});
```

## 🔄 Résilience et Fallbacks

### Circuit Breaker
Le Message Bus intègre un circuit breaker automatique :
- **Closed** : Fonctionnement normal
- **Open** : Mode dégradé après échecs répétés
- **Half-Open** : Test de récupération progressif

### File de Messages Persistante
```typescript
// Les messages critiques sont automatiquement mis en file
messageBus.sendCritical({
  type: 'EVOLVE_ORGANISM',
  payload: data
}); // Sera retenté jusqu'au succès
```

### Fallback Local
```typescript
// En cas d'échec du Background Script
messageBus.sendWithFallback({
  type: 'GET_ORGANISM_STATE',
  payload: {}
}, {
  fallback: () => getLocalOrganismState()
});
```

## 🧪 Tests et Debugging

### Tests d'API
```typescript
import { MessageBus } from '@/shared/messaging';
import { mockMessageResponse } from '@/tests/mocks';

describe('Message Bus', () => {
  it('should handle EVOLVE_ORGANISM message', async () => {
    const bus = new MessageBus();
    const response = await bus.send({
      type: 'EVOLVE_ORGANISM',
      payload: { behaviorData: [] }
    });
    
    expect(response.success).toBe(true);
    expect(response.data.organism).toBeDefined();
  });
});
```

### Debugging
```typescript
// Mode debug global
if (process.env.SYMBIONT_DEBUG === 'true') {
  messageBus.enableDebugMode();
}

// Intercepter tous les messages
messageBus.intercept((message, direction) => {
  console.debug(`[${direction}] ${message.type}`, message);
});
```

## 📚 Exemples Complets

### Content Script Complet
```typescript
import { MessageBus } from '@/shared/messaging';
import { BehaviorCollector } from '@/content/collectors';

class ContentOrchestrator {
  private messageBus: MessageBus;
  private collector: BehaviorCollector;

  constructor() {
    this.messageBus = new MessageBus();
    this.collector = new BehaviorCollector();
    this.initialize();
  }

  private async initialize() {
    // Démarrer la collecte
    this.collector.start();

    // Envoyer les données périodiquement
    setInterval(async () => {
      const behaviorData = this.collector.flush();
      if (behaviorData.length > 0) {
        await this.messageBus.send({
          type: 'EVOLVE_ORGANISM',
          payload: { behaviorData }
        });
      }
    }, 5000);

    // Écouter les updates
    this.messageBus.listen('ORGANISM_UPDATED', (data) => {
      this.handleOrganismUpdate(data);
    });
  }

  private handleOrganismUpdate(organism: OrganismState) {
    // Mettre à jour l'interface si nécessaire
    if (organism.mutations.length > 0) {
      this.showEvolutionNotification(organism.mutations);
    }
  }
}

new ContentOrchestrator();
```

### Popup Component React
```typescript
import React, { useEffect, useState } from 'react';
import { MessageBus } from '@/shared/messaging';
import { OrganismState } from '@/types';

const OrganismDashboard: React.FC = () => {
  const [organism, setOrganism] = useState<OrganismState | null>(null);
  const [messageBus] = useState(() => new MessageBus());

  useEffect(() => {
    // Récupérer l'état initial
    const loadOrganism = async () => {
      const response = await messageBus.send({
        type: 'GET_ORGANISM_STATE',
        payload: { includeMetrics: true }
      });
      
      if (response.success) {
        setOrganism(response.data.organism);
      }
    };

    // Écouter les mises à jour
    const unsubscribe = messageBus.listen('ORGANISM_UPDATED', (data) => {
      setOrganism(data.organism);
    });

    loadOrganism();
    
    return unsubscribe;
  }, [messageBus]);

  const triggerEvolution = async () => {
    await messageBus.send({
      type: 'EVOLVE_ORGANISM',
      payload: {
        behaviorData: [{
          type: 'manual_trigger',
          timestamp: Date.now(),
          context: { url: 'popup://manual' }
        }]
      }
    });
  };

  if (!organism) {
    return <div className="loading">Loading organism...</div>;
  }

  return (
    <div className="organism-dashboard">
      <h2>Your Organism</h2>
      <div className="traits">
        <div>Curiosity: {(organism.traits.curiosity * 100).toFixed(0)}%</div>
        <div>Energy: {(organism.energy * 100).toFixed(0)}%</div>
        <div>Age: {organism.age} days</div>
      </div>
      <button onClick={triggerEvolution}>Force Evolution</button>
    </div>
  );
};
```

## 🔗 Liens Utiles

- **[Architecture](Architecture)** : Design global du système
- **[Developer Guide](Developer-Guide)** : Configuration développement
- **[Security](Security)** : Bonnes pratiques sécurité
- **[Performance](Performance)** : Optimisation et profiling

---

**Questions sur l'API ?**

[**➡️ FAQ Technique**](FAQ) | [**🐛 Rapporter un Bug**](https://github.com/pinfada/SYMBIONT/issues)