# Le delta de compréhension — pari n°1

> Descente C-K du concept central de [`VISION.md`](VISION.md), transformé ici en
> **connaissance** : un premier module qui *opérationnalise* et rend *falsifiable*
> l'idée « ne remonter que ce qui révise le modèle du monde ».

## Le concept (rappel)

Un feed pousse du **nouveau**. SYMBIONT ne fait surface que sur ce qui
**révise ta compréhension**. La nouveauté pure ne suffit jamais — c'est
l'invariant anti-feed.

## Sous-arbre C-K

**C₁** : *« l'organisme ne remonte que ce qui change ta carte du monde »* — indécidable
tant qu'on ne sait pas *mesurer* « changer ta carte ».

Partitions (C→C) et connaissances activées (C→K) :

| Partition | Idée | K activée / manquante |
|---|---|---|
| Delta = **nouveauté** | remonter ce qui est loin du déjà-vu | ❌ **rejetée** : c'est la définition d'un feed |
| Delta = **relation au modèle** | remonter ce qui *contredit / complète / déplace* une croyance **déjà assimilée** | ✅ opérationnalisable : il faut (a) un modèle des croyances, (b) un juge de relation |
| Le juge = **similarité vectorielle** | classer par distance | ❌ insuffisant : la distance ne dit pas « contredit » |
| Le juge = **LLM local** | classer la relation sémantique | ✅ faisable en local (moteur déjà là) |

→ **Conjonction** (le concept devient artefact) : un modèle de croyances accrété
(`KnowledgeModel`) + un classement de relation par le LLM (`ComprehensionDelta`).

## L'opérationnalisation (ce qui est construit)

`src/shared/comprehension/` :

- **`KnowledgeModel`** — l'ensemble accrété des croyances de l'utilisateur
  (`Claim` = proposition + embedding + salience + sources). Récupération par
  similarité ; **assimilation** (digestion) qui renforce au lieu de dupliquer.
- **`HashingEmbedder`** — embedding déterministe sans dépendance, pour *récupérer*
  les croyances candidates (remplaçable par un embedding du modèle local).
- **`ClaimExtractor`** — le LLM extrait les affirmations atomiques d'une page.
- **`ComprehensionDelta.assessDelta`** — pour chaque affirmation, le LLM **classe
  la relation** au modèle : `confirme | complète | contredit | déplace | nouveau`.
- **`digestPage`** — l'acte de lecture : extrait → évalue → **accrète tout**.
- **`KnowledgeStore`** — persiste le modèle (chrome.storage.local), borné aux N
  croyances les plus saillantes (`prune`).
- **`SurfaceJournal`** — journalise ce qui a fait surface (matière du « 3 choses
  qui ont bougé aujourd'hui »), persistant et borné.
- **`readPage`** — l'acte de lecture **persistant** : charge le modèle → digère →
  sauvegarde → journalise les révisions. C'est ce qu'appelle l'UI.

Règle de décision (dans `types.ts`) :

```
poids   contredit 1.0 · déplace 0.9 · complète 0.55 · nouveau 0.15 · confirme 0
score   = max( poids(kind) × confiance )
surface = il existe une révision (contredit/déplace/complète) au-dessus de 0.5
```

**Invariant testé** (`ComprehensionDelta.test.ts`) : une affirmation `nouveau`,
**même avec une confiance de 0.99**, ne fait **pas** surface (0.15 × 0.99 < 0.5).
La nouveauté est digérée en silence ; seule une révision remonte.

## Protocole de falsification (le vrai test de la vision)

Le module est une *hypothèse exécutable*. Pour savoir si le pari tient, il faut
mesurer sur des humains réels — voici l'expérience minimale :

1. **Journal de surface** : pendant N jours, l'organisme lit en fond et note ce
   qu'il *aurait* fait surface (sans encore le montrer), avec le `kind` et la
   croyance concernée.
2. **Vérité terrain** : pour un échantillon, demander à l'utilisateur, sur chaque
   item remonté ET un tirage d'items digérés en silence : *« ceci a-t-il changé
   ta façon de voir quelque chose ? »* (oui/non).
3. **Métriques** :
   - **Précision de surface** = part des items remontés jugés « ça m'a fait
     penser ». Cible : nettement > taux de base d'un feed chronologique.
   - **Rappel** = part des items « mind-changing » effectivement remontés (ne pas
     manquer l'essentiel).
   - **Taux de silence** = part digérée sans surface (doit être élevé : *moins,
     mais vrai*).
4. **Falsification** : si la précision de surface n'est pas significativement
   supérieure à « remonter le plus nouveau », **le pari est faux** — il faut
   revoir le juge (meilleur modèle, meilleure notion de « croyance »), pas
   l'enrober.

## État & prochaines marches (honnête)

**Fait & testé :**
- ✅ Digestion branchée sur le **moteur** (via `readPage`, moteur injecté = le
  moteur offscreen/popup existant — aucune permission nouvelle, digestion **sur
  geste** dans l'onglet Cognition, bouton « Digérer la page active »).
- ✅ **Persistance** du `KnowledgeModel` (`KnowledgeStore`) + journal de surface
  (`SurfaceJournal`) — le modèle survit et grossit d'une session à l'autre.
- ✅ **UI minimale** : le bouton de digestion affiche la taille du modèle et ce
  qui a fait surface (vs digéré en silence).
- ✅ La vue **« ce qui a bougé aujourd'hui »** (`WhatMovedPanel`, en tête de
  l'onglet Cognition) : partitionne le journal aujourd'hui/avant (`partitionSurface`,
  testé), n'affiche que les révisions, réactif via `chrome.storage.onChanged`.

**Pas encore fait :**
- 🔨 Remplacer le `HashingEmbedder` par un **embedding sémantique** du modèle
  local (meilleure récupération des candidats).
- 🔨 Digestion **automatique de fond** — écartée volontairement : elle exigerait
  la permission `<all_urls>`, en tension avec la doctrine vie privée. La
  digestion reste sur geste.
- 🔨 Lancer le **protocole de falsification** ci-dessus (le vrai test de la thèse).
