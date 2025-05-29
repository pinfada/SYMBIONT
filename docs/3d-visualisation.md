# Visualisation 3D et mutations visuelles SYMBIONT

> **Note (2024 - Phase 1)** : L'architecture SYMBIONT intègre désormais une couche de résilience (Service Worker persistant, Message Bus tolérant aux pannes, stockage hybride). Les états et mutations visuelles sont sauvegardés et restaurés automatiquement, même en cas de crash ou de coupure réseau.

## Sommaire
- Architecture du rendu 3D
- Shaders personnalisés
- Mutations visuelles
- Optimisation GPU

## Architecture du rendu 3D
- WebGLOrchestrator : gestion du contexte, file de rendu
- Synchronisation avec l'état de l'organisme

## Shaders personnalisés
- Organism Shader : déformations dynamiques
- Mutation Shader : effets de transition
- Network Shader : visualisation des connexions sociales
- Mystique Shader : effets pour les événements secrets

## Mutations visuelles
- Application de mutations sur les traits visuels
- Animation et feedback immersif

## Optimisation GPU
- LOD, batching, culling, monitoring de la VRAM 