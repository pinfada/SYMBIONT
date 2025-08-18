# API de messages SYMBIONT

## Sommaire
- Introduction
- Types de messages supportés
- Structure d'un message
- Exemples d'utilisation
- Résilience des messages (Phase 1)

## Introduction
L'API de messages permet la communication entre le Content Script, le Background Script et les modules internes.

## Types de messages supportés
- `CREATE_ORGANISM`
- `EVOLVE_ORGANISM`
- `PREDICT_ACTION`
- `GENERATE_INVITATION`
- `SHARED_MUTATION`
- `TRIGGER_RITUAL`
- `APPLY_VISUAL_MUTATION`
- `GET_ORGANISM_STATE`
- `GET_HISTORY`
- `PING`

## Structure d'un message
```ts
{
  type: 'EVOLVE_ORGANISM',
  payload: { behaviorData: [...] }
}
```

## Exemples d'utilisation
```ts
chrome.runtime.sendMessage({
  type: 'PREDICT_ACTION',
  payload: { context: { url: 'https://...', time: Date.now(), userAgent: navigator.userAgent } }
}, (response) => {
  console.log('Prédiction :', response)
})
```

## Réponse standard
```ts
{
  success: true,
  data: ...,
  error?: string
}
```

## Résilience des messages (Phase 1)
Depuis 2024, tous les messages critiques (ORGANISM_UPDATE, mutations, invitations, etc.) sont transmis via le Resilient Message Bus. Ce bus garantit :
- File persistante (aucun message perdu)
- Retry automatique en cas d'échec
- Fallback local si le contexte d'extension est indisponible

Cela améliore la fiabilité de l'API et la continuité de l'expérience utilisateur.

> **Note (Phase 2 - 2024)** : Les messages comme `PREDICT_ACTION` et `EVOLVE_ORGANISM` bénéficient désormais d'une adaptation contextuelle (ContextAwareOrganism) et d'une surveillance prédictive (PredictiveHealthMonitor), ce qui améliore la pertinence des réponses et la robustesse du système. 