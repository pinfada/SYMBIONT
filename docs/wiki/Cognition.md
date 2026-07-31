# 🧠 Cognition locale (LLM WebGPU)

L'onglet **Cognition** donne à ton organisme un **cerveau de langage exécuté
100 % sur ton poste**, via [WebGPU](https://developer.mozilla.org/docs/Web/API/WebGPU_API)
et [WebLLM](https://github.com/mlc-ai/web-llm). **Aucune donnée n'est envoyée à
un serveur** : le modèle est téléchargé une fois, mis en cache, puis tourne sur
ton GPU.

> C'est un **module bonus, opt-in**. Sans lui, l'organisme continue de
> fonctionner avec son réseau de neurones embarqué (NeuralMesh).

## Pourquoi local ?

Fidèle à la doctrine anti-pistage de SYMBIONT : un LLM local peut *comprendre*
le contenu d'une page (ton, intention, signaux de désinformation) sans jamais
transmettre ta navigation à un tiers. C'est la brique qui, à terme, permettra
aux symbionts de lutter contre la désinformation de masse.

## Prérequis

| Élément | Détail |
|---|---|
| Navigateur | Chrome/Edge 113+ ou Firefox récent avec WebGPU |
| GPU | Un GPU compatible WebGPU (la plupart des machines 2018+) |
| Téléchargement | ~350 Mo à ~2,2 Go **une seule fois** selon le modèle |

Si WebGPU est absent, l'onglet l'indique clairement et propose le repli
NeuralMesh — rien n'est cassé.

## Modèles proposés

| Modèle | Taille | Niveau |
|---|---|---|
| **Qwen2.5 0.5B** (défaut) | ~350 Mo | léger — classer/résumer |
| Llama 3.2 1B | ~900 Mo | équilibré — analyse de contenu |
| Qwen2.5 1.5B | ~1,2 Go | intermédiaire |
| Phi-3.5 mini | ~2,2 Go | avancé (GPU correct requis) |

Le modèle se change à tout moment dans le sélecteur de l'onglet.

## Parcours utilisateur

1. **Détection WebGPU** automatique à l'ouverture de l'onglet.
2. **Choix du modèle** + **consentement explicite** au téléchargement (la taille
   est affichée avant de lancer).
3. **Barre de progression** pendant le téléchargement/initialisation (les
   lancements suivants repartent du cache, quasi instantanés).
4. **Chat de démonstration** en streaming : les réponses s'affichent token par
   token, et un bouton **Stop** interrompt une génération.

## Confidentialité

- Les poids sont récupérés depuis Hugging Face / MLC **au premier chargement
  uniquement**, puis servis depuis le cache local.
- Les conversations ne quittent jamais le poste.
- Le module est désactivé par défaut ; il faut l'activer explicitement.

## Détails techniques

- Moteur : `src/shared/llm/LocalLLMEngine.ts` (enveloppe testable de WebLLM,
  chargé par `import()` dynamique → chunk webpack séparé, le popup reste léger).
- Détection : `src/shared/llm/webgpu.ts`.
- Catalogue de modèles : `src/shared/llm/modelCatalog.ts`.
- Préférences persistées : `src/shared/llm/llmPreferences.ts`.
- UI : `src/popup/components/LocalLLMPanel.tsx` (onglet **🧠 Cognition**).

En v1 le moteur tourne dans le **popup**. Une v2 le déplacera vers le
**document offscreen** pour permettre l'analyse de contenu en tâche de fond
(score de fiabilité d'une page, détection de réseaux de bots), alimentant
directement l'organisme.
