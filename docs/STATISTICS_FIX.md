# 📊 Correction du Système de Statistiques SYMBIONT

## Problème Initial
Les statistiques "Pages visitées" et "Connaissances" ne s'incrémentaient pas correctement dans le panneau MetricsPanel.

## 🔴 Problèmes Identifiés

### 1. Architecture Fragmentée
- **3 systèmes parallèles** qui ne communiquaient pas :
  - `ContentScript` (content/index.ts)
  - `OrganismController` (content/webgl/OrganismController.ts)
  - `ConsciousOrganismController` (content/webgl/ConsciousOrganismController.ts)

### 2. Double Comptage
- `OrganismController` appelait `onPageVisit()` toutes les 5 secondes dans `updateOrganismState()`
- Cela incrémentait les compteurs même sans navigation réelle

### 3. Système Actif Non Clair
- `ConsciousOrganismController` était activé mais n'appelait jamais `onPageVisit()`
- `OrganismController` s'auto-initialisait aussi, créant des conflits

### 4. Cas Limites Non Gérés
- Navigation SPA (Single Page Applications)
- Changements de hash (#)
- Navigation back/forward
- Rechargement de page

## ✅ Solution Implémentée

### 1. Unification du Tracking dans ConsciousOrganismController

```typescript
// Ajout du tracking d'URL pour éviter le double comptage
private currentPageUrl: string = window.location.href;
private hasVisitedCurrentPage: boolean = false;

// Méthode dédiée pour le tracking
private async trackPageVisit(): Promise<void> {
  if (!this.hasVisitedCurrentPage) {
    await organismStateManager.onPageVisit(this.pageAnalysis.type);
    this.hasVisitedCurrentPage = true;
    logger.info(`Page visitée enregistrée: ${this.pageAnalysis.type}`);
  }
}
```

### 2. Détection Robuste de Navigation

Le système détecte maintenant :
- **Changements d'URL dans syncWithStateManager()** - vérification périodique
- **Navigation SPA via MutationObserver** - détecte les changements DOM
- **Events popstate/hashchange** - navigation browser native
- **Chargement initial** - première visite enregistrée au démarrage

### 3. Désactivation d'OrganismController

```typescript
// OrganismController.ts - Auto-initialisation désactivée
// ConsciousOrganismController est maintenant le seul système actif
```

### 4. Logique de Comptage Correcte

#### Pages Visitées
- Incrémenté **une seule fois** par URL unique
- Reset du flag `hasVisitedCurrentPage` lors d'un changement d'URL
- Pas d'incrémentation sur les mises à jour périodiques

#### Connaissances
- Incrémenté seulement pour les pages de type `'science'` ou `'learning'`
- Logique dans `OrganismStateManager.onPageVisit()` :

```typescript
if (pageType === 'science' || pageType === 'learning') {
  xpGain = 15;
  this.state.knowledgeGained += 1;
}
```

## 🔍 Flux de Données en Production

1. **Page Load** → ConsciousOrganismController s'initialise
2. **Analyse Page** → Détermine le type (science, social, etc.)
3. **Track Visit** → Appelle `organismStateManager.onPageVisit()`
4. **Update State** → Incrémente les compteurs appropriés
5. **Save Storage** → Persiste dans Chrome storage
6. **Notify UI** → MetricsPanel reçoit les mises à jour

## 📈 Métriques Affectées

| Métrique | Source | Condition d'incrémentation |
|----------|--------|---------------------------|
| Pages visitées | `onPageVisit()` | Chaque nouvelle URL |
| Connaissances | `onPageVisit()` | Pages science/learning uniquement |
| Interactions sociales | `onPageVisit()` | Pages social uniquement |
| Experience (XP) | `onPageVisit()` | Toutes pages (5-15 XP selon type) |

## 🧪 Tests Recommandés

### Scénarios à Valider
1. **Navigation standard** : Cliquer sur des liens
2. **SPA Navigation** : Sites React/Vue avec routing client
3. **Hash changes** : URLs avec #section
4. **Back/Forward** : Boutons navigateur
5. **Refresh** : F5 ne doit pas re-compter
6. **Tabs multiples** : Synchronisation entre tabs

### Vérification dans la Console

```javascript
// Pour débugger en production
chrome.storage.local.get('organism_state', (result) => {
  console.log('Pages visitées:', result.organism_state.pagesVisited);
  console.log('Connaissances:', result.organism_state.knowledgeGained);
});
```

## 🚀 Impact Performance

- **Réduction des écritures** : Debounce de 1 seconde sur saveState()
- **Backpressure intégré** : Skip des sauvegardes si système saturé
- **Hash pour changements** : Ne sauvegarde que si l'état a changé

## ⚠️ Points d'Attention

1. **Migration de données** : Les utilisateurs existants conservent leurs statistiques
2. **Compatibilité** : Fonctionne avec Chrome MV3 (Manifest V3)
3. **Sécurité** : Utilise SecureLogger pour éviter les fuites de données

## 📝 Maintenance Future

Pour réactiver l'ancien OrganismController :
1. Décommenter l'auto-init dans `OrganismController.ts`
2. Commenter l'init de `ConsciousOrganismController` dans `content/index.ts`
3. Rebuild avec `npm run build`

---

*Document créé le 26/01/2026 - Version 1.0*