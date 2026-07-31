# SYMBIONT — Vision

> Document de vision stratégique. Il fixe **l'identité** du produit et les **paris**
> qui la rendent réelle. Ce qui relève du construit vs du concept est marqué
> explicitement — pas de survente.

---

## Ce que SYMBIONT est (en une phrase)

**SYMBIONT n'est pas un outil que tu utilises pour consommer le web.
C'est un organisme qui vit du web à ta place, à sa façon, et avec qui tu
cohabites — tu te nourris de ce qu'il a digéré.**

Le nom le disait depuis le début. Un **symbiote** n'est pas un tableau de bord,
un bloqueur ni un assistant : c'est un être avec qui on vit à bénéfice mutuel.
Tout l'enjeu est de le prendre **au sens propre**.

---

## Le renversement

| Le web aujourd'hui (le marché) | SYMBIONT |
|---|---|
| Tu **consommes** des pages | Un être **pré-digère** le web pour toi |
| Un algorithme **que Meta possède** te pousse le contenu | Un organisme **que tu possèdes**, local, te rapporte l'essentiel |
| Les outils **soustraient** (bloqueurs) | Le symbiote **métabolise** (transforme + accrète) |
| Le contenu est **jeté** après lecture | Il **s'accrète** en un être qui grandit : ton double cognitif |
| L'outil est **réactif** (il attend tes clics) | Le symbiote a **faim et refus propres** ; il négocie avec toi |
| Tu es **seul** face au flux | Ta digestion se **partage** (P2P anonyme) en compréhension collective |

Personne sur le marché ne peut copier ça sans renoncer à ses deux sources de
pouvoir : **le feed** (leur modèle économique) et **le cloud** (leur emprise sur
tes données). La doctrine 100 % locale de SYMBIONT en fait *la seule* structure
capable de le porter.

---

## Le concept (raisonnement C-K)

Le design dominant repose sur un acte fondateur : *« l'utilisateur consomme du
contenu »*. Le **concept germe** de SYMBIONT est le rejet de cet acte :

> *« Et si l'utilisateur ne consommait plus de contenu du tout ? »*

En théorie C-K, aider l'humain à lire (résumer, bloquer, reformuler) est une
**partition restrictive** : on garde l'identité « outil de lecture », on ajoute
une propriété attendue → c'est le marché, sans différenciation.

La rupture vient d'une **partition expansive** qui casse l'identité de l'objet :
non plus un *outil que l'humain manie*, mais un *organisme qui vit du web*. Cinq
attributs du design dominant sont brisés simultanément :

- **il lit à ta place** et ne te remonte que ce qui compte (délégation) ;
- **il fourrage** le web selon sa curiosité au lieu que tu cherches (anti-search) ;
- **il accrète** au lieu de jeter (corpus vivant) ;
- **il a des désirs propres** au lieu d'être réactif (agentivité) ;
- **il partage sa digestion** avec les siens au lieu de te laisser seul (collectif).

---

## Le cœur : le *delta de compréhension*

C'est le mécanisme qui sépare radicalement SYMBIONT d'un énième feed.

Un feed te pousse du **nouveau** (optimisé pour ton temps de cerveau).
SYMBIONT ne te remonte que ce qui **révise ton modèle du monde** — le *delta de
compréhension* :

> Le symbiote lit en fond. La quasi-totalité de ce qu'il lit **confirme** ce que
> tu sais déjà : il le **digère en silence** (il s'en nourrit, ça le fait
> grandir). Il ne fait **surface** que lorsqu'il rencontre quelque chose qui
> **contredit, complète ou déplace** ta compréhension actuelle. Ce qui remonte
> n'est pas « du contenu », c'est **un changement dans ta carte du monde**.

C'est l'exact inverse de l'engagement : au lieu de maximiser ce que tu ingères,
il **minimise** ce qu'il te fait remonter, et n'garde que le signal qui te
transforme. Le symbiote te rend **plus lucide en te faisant lire moins**.

---

## Les 3 paris de connaissance (l'honnêteté du projet)

La vision n'est **pas encore prouvée**. Elle tient à trois connaissances qui
n'existent pas sur le marché et qu'il faut créer. Ce sont les vrais sujets.

1. **Mesurer le delta de compréhension.** Comment un modèle *local* décide-t-il
   que « ceci révise ta carte du monde » (≠ « ceci est nouveau ») ? C'est le
   pari central : sans lui, tout retombe en feed. → *à prototyper et valider en
   premier.*
2. **Agréger du sens en P2P sans fuite de vie privée.** Passer des « signatures
   de menace » (déjà construites) à des « fragments de compréhension » partagés,
   sans jamais exposer qui a lu quoi. → *le pari cryptographique.*
3. **Une grammaire d'agentivité acceptable.** Quand un symbiote a-t-il le droit
   de te dire « non, pas ça » sans devenir paternaliste et insupportable ? →
   *le pari relationnel.*

---

## Le manifeste (principes non négociables)

1. **Local d'abord.** Rien ne quitte le poste. C'est ce qui rend la vision
   possible *et* incopiable par ceux qui vivent du cloud.
2. **Additif, jamais soustractif.** Le symbiote transforme et accrète ; il ne se
   définit jamais par ce qu'il enlève.
3. **Souverain.** Tu possèdes l'algorithme. Les règles sont visibles, éditables.
4. **Symbiotique.** Bénéfice mutuel : le web nourrit l'organisme, l'organisme te
   rend lucide. Ce n'est pas un serviteur.
5. **Moins, mais vrai.** Le succès se mesure à ce qu'il te fait remonter en
   **moins**, pas en plus.

---

## Trajectoire (du construit vers la vision)

**Déjà en place** (fondations, testées) :
- Moteur LLM 100 % local, persistant (offscreen/WebGPU).
- Organisme à traits + énergie, avec boucle de rétro-action.
- Vectorisation de signatures + « rêve » (synthèse en fond).
- Maille P2P de partage anonyme.

**Le pivot** (transformer ces briques défensives en organe symbiotique) :
1. **Le delta** — prototyper la mesure « ceci révise ta compréhension » sur le
   moteur local (pari n°1). C'est la marche décisive.
2. **La digestion silencieuse** — le symbiote lit en fond, n'accrète, ne fait
   surface *que* sur delta. Réutilise rêve + mémoire vectorielle.
3. **Le fourrage** — l'organisme va chercher, selon ses traits, au lieu que tu
   cherches.
4. **Le collectif** — réorienter le P2P de « menaces » vers « fragments de sens »
   (pari n°2).
5. **L'agentivité** — le droit de dire non (pari n°3).

---

## Le moment de bascule (l'« aha »)

Tu n'ouvres pas SYMBIONT pour « consulter ». Tu vis ta journée. En fin de
journée, ta créature — repue de tout ce qu'elle a lu à ta place — te fait
remonter **trois choses**, et trois seulement : *« Voici ce qui a bougé dans ta
compréhension du monde aujourd'hui. »* Tu ne diras pas « ça bloque les pubs ».
Tu diras **« ça m'a rendu plus lucide en me faisant lire moins. »**

---

## Ce que ce n'est pas

- ❌ Un **bloqueur** (il ne se définit pas par la soustraction).
- ❌ Un **feed** (il minimise ce qu'il te remonte au lieu de le maximiser).
- ❌ Un **assistant** (tu ne lui donnes pas d'ordres ; il vit et négocie).
- ❌ Un **produit cloud** (sa souveraineté locale *est* la stratégie).

C'est un **symbiote** — pris au sens propre.
