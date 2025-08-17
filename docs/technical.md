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

## 3. Système de Sérialisation Robuste (Janvier 2025) ⭐️

### Problème résolu
Élimination des erreurs `"Converting circular structure to JSON"` causées par les éléments HTMLCanvasElement avec React Fiber.

### Solution technique
- **Fonction `deepCleanForSerialization()`** : Nettoyage récursif des objets avant sérialisation
- **Détection automatique** : HTMLCanvasElement, WebGLContext, React Fiber, références circulaires
- **Double protection** : Au niveau message et au niveau composant
- **Performance optimisée** : Utilisation de WeakSet pour éviter les boucles infinies

```typescript
// Gestion spéciale HTMLCanvasElement
if (obj instanceof HTMLCanvasElement) {
  return {
    tagName: 'CANVAS',
    width: obj.width,
    height: obj.height,
    className: obj.className,
    id: obj.id
  };
}
```

### Objets traités automatiquement
- `HTMLCanvasElement` → Extraction propriétés utiles
- `WebGLRenderingContext` → `[Non-serializable Object]`
- React Fiber (`__reactFiber`) → `[Non-serializable Object]`
- Références circulaires → `[Circular Reference]`
- Fonctions → `[Function]`
- Dates → ISO string

## 4. Bonnes pratiques de maintenance

- Toujours utiliser les types unifiés de `src/types/index.d.ts`
- Nettoyer les ressources WebGL (`cleanup()`) lors de la destruction du composant ou du contexte perdu
- Gérer les erreurs de rendu et de mutation via try/catch dans l'adaptateur
- **Éviter de passer des objets DOM complets dans les payloads de messages**
- **Utiliser `sanitizeMessage()` pour tout objet complexe avant sérialisation**
- **Implémenter la gestion d'erreurs avec circuit breaker patterns**
- **Utiliser le HybridStorageManager pour toute persistence critique**
- Tester chaque module indépendamment (TDD recommandé)
- **Suivre les métriques de performance en temps réel**
- **Documenter toute nouvelle dépendance ou service externe**

## 5. Extension et personnalisation

- **Nouveaux types de mutations** : ajouter dans `MutationEngine` et les types
- **Shaders personnalisés** : ajouter les fichiers dans `src/shaders/` et adapter le chargement dans le moteur
- **Algorithmes génératifs** : étendre `ProceduralGenerator` pour de nouvelles formes ou textures
- **NOUVEAU** : Pour les nouveaux objets non-sérialisables, les ajouter dans `deepCleanForSerialization()`

## 6. Tests et monitoring

- Utiliser Jest pour les tests unitaires (mock du contexte WebGL recommandé)
- Vérifier la stabilité à 60fps et la gestion de 1000 mutations/minute
- Surveiller la charge GPU via `PerformanceMonitor` et les messages de métriques
- **NOUVEAU** : Tester la sérialisation des nouveaux types d'objets complexes
- **NOUVEAU** : Surveiller les logs pour détecter les objets non-sérialisables

## 7. Exemple d'initialisation

```typescript
const canvas = document.createElement('canvas');
const engine = new OrganismEngine(canvas, 'DNA_STRING');
const adapter = new WebGLMessageAdapter(engine, messageBus);

// NOUVEAU : Utilisation sécurisée pour les messages
messaging.send(MessageType.WEBGL_INIT, {
  dna: organism.visualDNA,
  canvasInfo: {  // ✅ Propriétés sérialisables uniquement
    width: canvas.width,
    height: canvas.height,
    className: canvas.className
  }
});
```

## 8. Dépannage

### Problèmes courants
- **Shaders ne se chargent pas** : vérifier la règle Webpack `asset/source`
- **Contexte WebGL perdu** : appeler `engine.cleanup()` et réinitialiser
- **Bus de messages défaillant** : vérifier l'import et la configuration de `MessageBus` et `MessageType`
- **Erreur de sérialisation circulaire** : vérifier que l'objet passe par `sanitizeMessage()`
- **Performance dégradée** : vérifier les logs de nettoyage d'objets complexes

### Débogage avancé
- **Extension qui crash** : vérifier le SecurityManager et les logs de sécurité
- **Mémoire qui fuit** : utiliser les outils de profiling Chrome DevTools
- **Tests qui timeout** : augmenter les timeouts et vérifier les mocks
- **Vulnérabilités détectées** : lancer `npm audit` et corriger immédiatement
- **Backend instable** : vérifier les logs de WebSocketService et DatabaseService

### Monitoring en production
- Utiliser PerformanceAnalytics pour surveiller les métriques temps réel
- Configurer des alertes sur les seuils critiques (CPU, mémoire, erreurs)
- Monitorer les patterns de crash et les erreurs de sérialisation
- Surveiller la health des connexions WebSocket et base de données

## 9. Propagation virale, triggers contextuels et transmission collective

### Transmission virale par invitation
- Génération, validation et activation d'invitations via le background (stockage persistant IndexedDB)
- Suivi de la lignée réelle (inviteur, invités, historique)
- Rituel d'activation : l'organisme n'est créé qu'après consommation d'un code valide
- Visualisation de la lignée dans l'UI (graph, badges, historique)

### Propagation contextuelle avancée
- Module PatternDetector branché dans le background
- À chaque événement utilisateur (navigation, scroll, interaction), l'événement est ajouté à un historique local
- Analyse contextuelle automatique :
  - Détection de bursts d'activité (ex : 5 actions en <10s)
  - Cycles temporels (actions régulières)
  - Alternances navigation/scroll
  - Répétitions d'actions
- Si un pattern rare est détecté, une invitation contextuelle est générée avec le contexte correspondant
- Notification UI immersive et différenciée selon le contexte

### Trigger collectif (propagation virale à seuil)
- À chaque analyse contextuelle, le background vérifie le nombre total d'invitations générées
- Seuils définis : 10, 50, 100, 250, 500 (modifiables)
- Quand un seuil est franchi pour la première fois, une invitation contextuelle spéciale est générée (`collective_threshold_X`)
- Persistance des seuils déjà atteints (localStorage)
- Notification UI spéciale (halo, icône, message)

### Bonnes pratiques
- Adapter les seuils et patterns selon la viralité souhaitée
- Utiliser PatternDetector pour enrichir la détection de comportements collectifs ou individuels
- Documenter chaque évolution dans la doc technique et métier 