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
transmettre ta navigation à un tiers. C'est la brique qui permet aux symbionts
de lutter contre la désinformation de masse.

## Prérequis

| Élément | Détail |
|---|---|
| Navigateur | Chrome/Edge 113+ ou Firefox récent avec WebGPU |
| GPU | Un GPU compatible WebGPU (la plupart des machines 2018+) |
| Téléchargement | ~350 Mo à ~2,2 Go **une seule fois** selon le modèle |

Si WebGPU est absent, l'onglet l'indique clairement et propose le repli
NeuralMesh — rien n'est cassé.

![WebGPU indisponible : repli gracieux](images/cognition-unsupported.png)

## 1. Activation & choix du modèle

À l'ouverture de l'onglet, l'extension détecte WebGPU puis propose un modèle et
**demande un consentement explicite** avant tout téléchargement (la taille est
affichée). Le modèle est modifiable à tout moment.

![Écran d'activation avec sélecteur de modèle](images/cognition-setup.png)

### Modèles proposés

| Modèle | Taille | Niveau |
|---|---|---|
| **Qwen2.5 0.5B** (défaut) | ~350 Mo | léger — classer/résumer |
| Llama 3.2 1B | ~900 Mo | équilibré — analyse de contenu |
| Qwen2.5 1.5B | ~1,2 Go | intermédiaire |
| Phi-3.5 mini | ~2,2 Go | avancé (GPU correct requis) |

## 2. Téléchargement

Au premier lancement, les poids sont récupérés puis **mis en cache** (Cache
API) : les fois suivantes repartent du cache, quasi instantanément. Une barre
de progression indique l'avancement.

![Barre de progression du téléchargement](images/cognition-download.png)

## 3. Chat local

Une fois le modèle prêt, tu peux dialoguer avec ton organisme. Les réponses
s'affichent **token par token** (streaming) et un bouton **Stop** interrompt
une génération. Tout reste sur le poste.

![Chat local en streaming](images/cognition-chat.png)

## 4. Analyse de fiabilité (anti-désinformation)

Le bouton **🔍 Analyser la page active** envoie le texte visible de l'onglet
courant au LLM local, qui renvoie :

- un **score de fiabilité** (0–100) et un niveau (élevée / moyenne / faible) ;
- un **résumé** de l'évaluation ;
- les **signaux** détectés (sensationnalisme, sources absentes, appel
  émotionnel, théorie du complot…).

Le résultat **nudge la vigilance de l'organisme** (sa conscience monte quand il
repère une page manipulatrice) : l'analyse ne sert pas qu'à toi, elle nourrit
l'organisme. Le texte de la page ne quitte jamais le poste.

![Rapport de fiabilité d'une page](images/cognition-analysis.png)

## 5. Digestion — le delta de compréhension

Le bouton **🧫 Digérer la page active** incarne la vision SYMBIONT (voir
[`VISION.md`](../VISION.md)) : le symbiote **lit** la page, l'**accrète** à son
**modèle du monde persistant**, et ne te fait **« surface »** que sur ce qui
**révise ta compréhension** (contredit / complète / déplace une croyance déjà
assimilée). La **nouveauté pure ne remonte jamais** — c'est l'invariant anti-feed.

- Le modèle survit et grossit d'une session à l'autre (stockage local borné).
- L'écran affiche combien de croyances ton organisme connaît, et ce qui a bougé
  (ou « digéré en silence » si rien ne révise ta carte du monde).
- 100 % local, **sur geste** (aucune lecture automatique de toutes tes pages).

En tête de l'onglet, l'écran **🌅 « Ce qui a bougé aujourd'hui »** présente le
*moment aha* de la vision : il n'affiche **que** les révisions de compréhension
du jour (contredit / complète / déplace), jamais la simple nouveauté. Vide au
premier lancement, il se remplit au fil des digestions (et se met à jour tout
seul quand tu digères une page).

![Écran « ce qui a bougé aujourd'hui »](images/cognition-whatmoved.png)

Détail technique et protocole de validation : [`comprehension-delta.md`](../comprehension-delta.md).

## Confidentialité

- Les poids sont récupérés depuis Hugging Face / MLC **au premier chargement
  uniquement**, puis servis depuis le cache local.
- Conversations et contenus de page **ne quittent jamais le poste**.
- Le module est désactivé par défaut ; il faut l'activer explicitement.

## Détails techniques

| Élément | Fichier |
|---|---|
| Détection WebGPU | `src/shared/llm/webgpu.ts` |
| Catalogue de modèles | `src/shared/llm/modelCatalog.ts` |
| Moteur (enveloppe WebLLM, `import()` dynamique → chunk séparé) | `src/shared/llm/LocalLLMEngine.ts` |
| Préférences persistées | `src/shared/llm/llmPreferences.ts` |
| Analyse de fiabilité | `src/shared/llm/ContentAnalysis.ts` |
| Pont vers l'organisme | `src/shared/llm/organismSignal.ts` |
| Extraction du texte de page | `src/shared/llm/pageText.ts` |
| Moteur offscreen (persiste popup fermé) | `src/background/offscreen-llm.ts` |
| Protocole popup ↔ offscreen | `src/shared/llm/offscreenProtocol.ts` |
| Client offscreen + repli in-popup | `src/shared/llm/OffscreenLLMClient.ts`, `cognitiveEngine.ts` |
| Coordination du document offscreen (bail) | `src/background/CognitiveOffscreen.ts` |
| UI (onglet 🧠 Cognition) | `src/popup/components/LocalLLMPanel.tsx` |

Le runtime WebLLM (~6 Mo) est chargé en `import()` dynamique : webpack le place
dans un chunk séparé, donc le bundle initial du popup reste léger et le gros
paquet n'arrive que si l'utilisateur ouvre l'onglet et active le module.

### Où tourne le moteur ? (v3)

Le moteur vit désormais dans le **document offscreen** : le modèle **reste
chargé même quand le popup est fermé**, et une génération/analyse **continue en
arrière-plan**. Le popup n'est qu'un client léger qui dialogue avec l'offscreen
par messages runtime (protocole corrélé par `id`).

- MV3 n'autorise **qu'un seul** document offscreen : il est **partagé** avec le
  rendu WebGL. Le module cognitif pose un « **bail** » tant qu'un modèle est
  chargé, pour que le pont WebGL ne ferme pas le document sous ses pieds
  (`CognitiveOffscreen.ts` + garde dans `OffscreenWebGL.ts`).
- Si l'offscreen est **injoignable**, repli **transparent** sur un moteur
  in-popup (`createCognitiveEngine()`), avec un délai de garde. L'onglet indique
  où tourne le moteur (`offscreen (persistant)` ou `popup`).
- **Aucune nouvelle permission invasive** : pas de lecture automatique de toutes
  les pages ; l'analyse reste déclenchée à la demande.

> ⚠️ Le chemin offscreen + WebGPU se **vérifie en conditions réelles** (Chrome/
> Edge récent, extension chargée non empaquetée) : l'environnement de CI ne peut
> pas exécuter WebGPU. La logique (protocole, client, repli, bail) est couverte
> par des tests unitaires.
