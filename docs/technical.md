# Documentation technique - Moteur WebGL Symbiont

## 1. Architecture des modules

- **OrganismEngine** : moteur de rendu WebGL, gestion du cycle de vie, application des mutations
- **DNAInterpreter** : conversion DNA → paramètres shaders, mutations progressives
- **ProceduralGenerator** : génération de géométrie procédurale (formes, fractales)
- **MutationEngine** : gestion centralisée des mutations visuelles
- **PerformanceMonitor** : suivi temps réel du FPS et de la charge GPU
- **WebGLMessageAdapter** : pont entre le bus de messages et le moteur

## 2. Points d'intégration

- **Bus de messages** :
  - Les mutations et états sont transmis via des messages (`ORGANISM_MUTATE`, `ORGANISM_STATE_CHANGE`)
  - Les métriques de performance sont publiées régulièrement (`PERFORMANCE_UPDATE`)
- **Composant React** :
  - Le canvas WebGL est intégré dans un composant React (ex : `OrganismViewer`)
  - Le hook `useWebGL` permet de suivre l'état d'initialisation et les métriques
- **Configuration Webpack** :
  - Les shaders `.vert`, `.frag`, `.glsl` sont importés comme chaînes de caractères via `asset/source`

## 3. Bonnes pratiques de maintenance

- Toujours utiliser les types unifiés de `src/types/index.d.ts`
- Nettoyer les ressources WebGL (`cleanup()`) lors de la destruction du composant ou du contexte perdu
- Gérer les erreurs de rendu et de mutation via try/catch dans l'adaptateur
- Tester chaque module indépendamment (TDD recommandé)

## 4. Extension et personnalisation

- **Nouveaux types de mutations** : ajouter dans `MutationEngine` et les types
- **Shaders personnalisés** : ajouter les fichiers dans `src/shaders/` et adapter le chargement dans le moteur
- **Algorithmes génératifs** : étendre `ProceduralGenerator` pour de nouvelles formes ou textures

## 5. Tests et monitoring

- Utiliser Jest pour les tests unitaires (mock du contexte WebGL recommandé)
- Vérifier la stabilité à 60fps et la gestion de 1000 mutations/minute
- Surveiller la charge GPU via `PerformanceMonitor` et les messages de métriques

## 6. Exemple d'initialisation

```typescript
const canvas = document.createElement('canvas');
const engine = new OrganismEngine(canvas, 'DNA_STRING');
const adapter = new WebGLMessageAdapter(engine, messageBus);
```

## 7. Dépannage

- Si les shaders ne se chargent pas : vérifier la règle Webpack `asset/source`
- Si le contexte WebGL est perdu : appeler `engine.cleanup()`
- Si le bus de messages ne fonctionne pas : vérifier l'import et la configuration de `MessageBus` et `MessageType` 