# API de messages SYMBIONT

## Sommaire
- Introduction
- Types de messages supportés
- Structure d'un message
- Exemples d'utilisation

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