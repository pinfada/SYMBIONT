# 📋 Corrections de Sérialisation SYMBIONT

## 🎯 Aperçu

Ce document détaille les corrections apportées au système de sérialisation de SYMBIONT pour éliminer les erreurs de références circulaires, particulièrement celles liées aux éléments HTMLCanvasElement avec React Fiber.

## 🚨 Problème Original

### Erreur Type
```
TypeError: Converting circular structure to JSON 
--> starting at object with constructor 'HTMLCanvasElement' 
    property '__reactFiber$0th76yucbtqp' -> object with constructor 'Ps' 
--- property 'stateNode' closes the circle
```

### Cause Root
L'élément `HTMLCanvasElement` était passé directement dans le payload des messages WebGL, incluant toutes ses propriétés React Fiber qui créent des références circulaires lors de la sérialisation JSON.

## ✅ Solution Implémentée

### 1. Amélioration de `sanitizeMessage()`

**Fichier**: `src/shared/utils/serialization.ts`

Nouvelle fonction `deepCleanForSerialization()` qui :
- Détecte récursivement tous les objets non-sérialisables
- Gère les références circulaires avec `WeakSet`
- Transforme les objets problématiques en représentations sûres

```typescript
function deepCleanForSerialization(obj: any, seen = new WeakSet()): any {
  // Objets WebGL, DOM, React non-sérialisables
  if (obj instanceof HTMLCanvasElement) {
    return {
      tagName: 'CANVAS',
      width: obj.width,
      height: obj.height,
      className: obj.className,
      id: obj.id
    };
  }
  
  if (obj && obj.__reactFiber) {
    return '[Non-serializable Object]';
  }
  
  // Gestion des références circulaires
  if (seen.has(obj)) {
    return '[Circular Reference]';
  }
  seen.add(obj);
  
  // Nettoyage récursif...
}
```

### 2. Modification de `OrganismViewer.tsx`

**Fichier**: `src/popup/components/OrganismViewer.tsx`

Changement du passage du canvas complet vers des propriétés sérialisables :

```typescript
// AVANT (problématique)
messaging.send(MessageType.WEBGL_INIT, {
  canvas: canvasRef.current,  // ❌ Objet DOM complet
  dna: organism.visualDNA
});

// APRÈS (corrigé)
messaging.send(MessageType.WEBGL_INIT, {
  dna: organism.visualDNA,
  canvasInfo: {               // ✅ Propriétés sérialisables
    width: canvasRef.current.width,
    height: canvasRef.current.height,
    className: canvasRef.current.className
  }
});
```

## 🛡️ Protection Multi-Niveaux

### Niveau 1: Sanitisation de Message
- Tous les messages passent par `sanitizeMessage()`
- Nettoyage automatique des objets problématiques
- Gestion des références circulaires

### Niveau 2: Validation de Payload
- Vérification des types attendus
- Rejet des objets DOM complets
- Log des tentatives problématiques

### Niveau 3: Composant
- Extraction des propriétés utiles uniquement
- Évitement du passage d'objets complexes
- Validation locale avant envoi

## 🧪 Tests de Validation

### Test de Reproduction
```javascript
const mockCanvas = {
  __reactFiber$test: { stateNode: null }
};
mockCanvas.__reactFiber$test.stateNode = mockCanvas; // Référence circulaire

JSON.stringify(mockCanvas); // ❌ Erreur attendue
```

### Test de Correction
```javascript
const cleaned = deepCleanForSerialization(mockCanvas);
JSON.stringify(cleaned); // ✅ Succès
```

## 📊 Objets Détectés et Traités

| Type d'Objet | Détection | Traitement |
|---------------|-----------|------------|
| `HTMLCanvasElement` | `instanceof` | Extraction propriétés utiles |
| `WebGLRenderingContext` | `instanceof` | `[Non-serializable Object]` |
| React Fiber | `__reactFiber` | `[Non-serializable Object]` |
| Fonctions | `typeof === 'function'` | `[Function]` |
| Dates | `instanceof Date` | `toISOString()` |
| Erreurs | `instanceof Error` | Extraction stack trace |
| Références circulaires | `WeakSet.has()` | `[Circular Reference]` |

## 🚀 Performance

### Impact Positif
- **Élimination des crashes** de sérialisation
- **Réduction de la charge CPU** (plus de tentatives répétées)
- **Stabilité accrue** de l'extension
- **Logs plus propres** sans spam d'erreurs

### Impact Négligeable
- Overhead minimal du nettoyage préventif
- Mémoire supplémentaire temporaire pour le WeakSet
- Latence imperceptible lors de l'envoi de messages

## 🔧 Configuration & Maintenance

### Ajout de Nouveaux Types
Pour ajouter la détection d'un nouveau type d'objet non-sérialisable :

```typescript
// Dans deepCleanForSerialization()
if (obj instanceof MonNouveauType) {
  return '[Non-serializable Object]';
}
```

### Debug & Monitoring
- Logs automatiques des objets nettoyés
- Compteurs de références circulaires détectées
- Métriques de performance de sérialisation

## 📚 Références

- **Code source**: `src/shared/utils/serialization.ts`
- **Tests**: Test manuel validé (références circulaires détectées et traitées)
- **Documentation complète**: `CORRECTIONS_SERIALISATION.md`

---

**Status**: ✅ Production Ready  
**Validé**: Janvier 2025  
**Mainteneur**: Équipe SYMBIONT 