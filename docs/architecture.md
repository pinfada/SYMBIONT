# Architecture SYMBIONT

## Sommaire
- Vue d'ensemble
- Diagramme d'architecture
- Description des modules principaux
- Flux de données

## Vue d'ensemble
SYMBIONT repose sur une architecture modulaire, orientée message, où chaque composant est faiblement couplé et extensible.

## Diagramme d'architecture
```
Content Script <-> Background (bus de messages)
   |                |
   |                +-- NeuralCoreEngine
   |                +-- OrganismMemoryBank
   |                +-- SocialNetworkManager
   |                +-- SecretRitualSystem
   |                +-- WebGLOrchestrator
   |                +-- SecurityManager
```

## Modules principaux
- **NeuralCoreEngine** : IA comportementale, apprentissage, mutation, prédiction.
- **OrganismMemoryBank** : stockage persistant, consolidation, chiffrement.
- **SocialNetworkManager** : invitations, mutations partagées, intelligence collective.
- **SecretRitualSystem** : détection de rituels, codes secrets, événements mystiques.
- **WebGLOrchestrator** : rendu 3D, mutations visuelles, optimisation GPU.
- **SecurityManager** : chiffrement, anonymisation, contrôle d'accès.

## Flux de données
1. Le Content Script collecte et valide les données utilisateur.
2. Les messages sont envoyés au Background Script via le bus de messages.
3. Le SynapticRouter distribue les messages aux modules concernés.
4. Les modules IA, social, rituels, etc. traitent, stockent, ou renvoient des instructions.
5. Les réponses sont transmises au Content Script ou à la popup pour affichage ou action. 