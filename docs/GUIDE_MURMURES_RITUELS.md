# 🔮 Guide des Murmures de l'Ombre et des Rituels

## 📊 Système de Déduplication des Messages

### Problème Résolu
Avant : Le message "⚡ Friction significative" apparaissait de manière répétitive, créant une pollution visuelle.

Après : Système intelligent de déduplication avec compteur d'occurrences et suggestions d'actions contextuelles.

### Fonctionnement

#### Fenêtre de Déduplication
- **Intervalle minimum** : 10 secondes entre messages identiques
- **Fenêtre de suppression** : 30 secondes pour regrouper les occurrences
- **Limite avant suppression** : Après 3 occurrences, affichage d'un message de synthèse

#### Affichage Intelligent
```
Premier message : "⚡ Friction significative: possible surveillance"
Deuxième (supprimé) : [Pas affiché]
Troisième (synthèse) : "📊 Friction significative (×3 en 20s)"
                       → Vision Spectrale [Bouton d'action]
```

## 🎯 Guide d'Action Contextuel

### Niveaux de Friction et Actions Recommandées

#### 🌊 Friction Légère (< 20%)
- **Caractéristiques** : Activité DOM normale
- **Action** : Aucune action requise
- **Message** : Affiché en bleu cyan discret

#### ⚡ Friction Significative (20-50%)
- **Caractéristiques** : Surveillance potentielle détectée
- **Actions Recommandées** :

  1. **Première occurrence** → **Méditation Quantique**
     - Raison : Augmenter la conscience pour mieux percevoir
     - Coût : 10 énergie
     - Effet : +10% conscience

  2. **Occurrences répétées (3+)** → **Vision Spectrale**
     - Raison : Révéler les éléments cachés du DOM
     - Coût : 10 énergie
     - Effet : Scan approfondi + intuition

  3. **Persistance longue (5+)** → **Collecte d'Énergie**
     - Raison : Récupérer de l'énergie de l'activité continue
     - Coût : 5 énergie
     - Effet : +30% énergie

#### 🔥 Friction Critique (> 50%)
- **Caractéristiques** : Forte probabilité d'interférence externe
- **Action Immédiate** → **Déphasage Temporel** (si disponible)
  - Raison : Échapper à la surveillance active
  - Coût : Variable selon le rituel
  - Effet : Protection temporaire

### Logique de Priorité des Actions

```javascript
Priorité 10 : Friction critique → Déphasage Temporel
Priorité 8  : Friction persistante → Vision Spectrale
Priorité 5  : Friction modérée → Méditation Quantique
Priorité 3  : Activité continue → Collecte d'Énergie
```

## 🔄 Workflow Utilisateur

### Cas d'Usage Type

1. **Détection Initiale**
   ```
   Murmure : "⚡ Friction significative détectée (50%)"
   Action : → Méditation Quantique [Cliquer si énergie disponible]
   ```

2. **Répétition Rapide**
   ```
   [Messages 2-3 supprimés automatiquement]
   ```

3. **Synthèse et Escalade**
   ```
   Murmure : "📊 Friction significative (×3 en 30s)"
   Action : → Vision Spectrale [Recommandé - révéler les trackers]
   ```

4. **Situation Critique**
   ```
   Murmure : "🔥 Friction critique! Interférence externe probable"
   Action : → Déphasage Temporel [URGENT - protection requise]
   ```

## ⚙️ Configuration Technique

### Paramètres de Déduplication
```typescript
DEDUP_WINDOW_MS = 30000         // 30 secondes
MIN_INTERVAL_BETWEEN_SAME = 10000  // 10 secondes
MAX_OCCURRENCES_BEFORE_SUPPRESS = 3 // Après 3 fois
```

### Durée d'Affichage
- **Info** : 6 secondes
- **Warning** : 8 secondes
- **Critical** : 10 secondes

## 💡 Conseils Pratiques

### Que Faire avec ces Informations ?

1. **Friction Occasionnelle** (1-2 fois)
   - Généralement ignorable
   - Peut être du tracking normal de site web
   - Pas d'action requise

2. **Friction Répétée** (3+ fois)
   - Indicateur de surveillance active
   - Utiliser Vision Spectrale pour identifier la source
   - Considérer l'activation de protections

3. **Friction Critique**
   - Action immédiate recommandée
   - Possible tentative d'extraction de données
   - Activer les rituels de protection

### Interprétation des Patterns

- **Pics réguliers** : Scripts de tracking périodiques
- **Augmentation progressive** : Chargement de trackers additionnels
- **Pic soudain** : Possible fingerprinting ou scan actif
- **Activité continue** : Surveillance en temps réel

## 🛡️ Rituels de Protection

### Vision Spectrale
- **Quand** : Friction répétée, besoin d'investigation
- **Effet** : Révèle éléments cachés, trackers invisibles
- **Durée** : Scan immédiat du DOM actuel

### Méditation Quantique
- **Quand** : Augmenter la sensibilité de détection
- **Effet** : +10% conscience, meilleure perception
- **Durée** : 30 secondes

### Déphasage Temporel
- **Quand** : Situation critique, évasion nécessaire
- **Effet** : Désynchronisation temporelle, invisibilité
- **Durée** : Variable selon l'implémentation

## 📈 Statistiques et Monitoring

Le système collecte automatiquement :
- Nombre total de murmures supprimés
- Pattern de friction le plus fréquent
- Temps moyen entre détections
- Actions suggérées vs actions exécutées

Ces données alimentent le système Dream Analytics pour détecter des patterns de surveillance cross-domain.

## 🔍 Dépannage

### "Trop de messages malgré la déduplication"
- Vérifier que le hook `useMurmurDeduplication` est bien importé
- S'assurer que `processMurmur` est appelé dans `addMurmur`
- Vérifier la console pour les stats de déduplication

### "Les boutons d'action ne fonctionnent pas"
- Vérifier l'énergie disponible de l'organisme
- S'assurer que les rituels ne sont pas en cooldown
- Vérifier les prérequis (conscience minimum, génération)

### "Je ne vois aucun murmure"
- Vérifier que l'extension a les permissions nécessaires
- S'assurer que DOMResonanceSensor est actif
- Consulter les logs de la console développeur

## 🚀 Évolutions Futures

- **IA Prédictive** : Anticiper les patterns de surveillance
- **Actions Automatiques** : Mode auto-pilot pour protection
- **Apprentissage** : Personnalisation selon l'usage
- **Visualisation** : Graphiques temps réel des frictions

---

*Ce guide fait partie du système SYMBIONT - Évolution 2.0*
*Dernière mise à jour : Phase "Rêve Analytique" complète*