# SYMBIONT – Organisme Numérique Évolutif

## 🌱 Vision
SYMBIONT transforme votre navigateur en un écosystème d’organismes numériques évolutifs, sociaux et immersifs. Chaque utilisateur héberge un organisme qui apprend, mute, interagit et participe à des rituels collectifs, tout en garantissant sécurité, anonymat et performance.

## 🏗️ Architecture
- **Content Script** : collecte, validation et envoi des données comportementales.
- **Background Script** : cœur de l’IA, gestion mémoire, social, rituels, rendu 3D, sécurité.
- **Modules principaux** :
  - `NeuralCoreEngine` : IA comportementale, apprentissage, mutation, prédiction.
  - `OrganismMemoryBank` : stockage persistant, consolidation, chiffrement.
  - `SocialNetworkManager` : invitations, mutations partagées, intelligence collective.
  - `SecretRitualSystem` : détection de rituels, codes secrets, événements mystiques.
  - `WebGLOrchestrator` : rendu 3D, mutations visuelles, optimisation GPU.
  - `SecurityManager` : chiffrement, anonymisation, contrôle d’accès.

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

## 🚀 Installation & Build
1. **Cloner le repo**
2. `npm install`
3. `npm run build` (Webpack)
4. Charger le dossier `dist/` comme extension non empaquetée dans Chrome (chrome://extensions)

## 🧪 Tests
- Lancer tous les tests unitaires :
  ```bash
  npm test
  ```
- Les tests couvrent la mémoire, la sécurité, le social, etc.

## 🛠️ Utilisation de l’API de messages
Envoyer un message depuis le Content Script :
```ts
chrome.runtime.sendMessage({
  type: 'EVOLVE_ORGANISM',
  payload: { behaviorData: [...] }
}, (response) => {
  console.log('Réponse SYMBIONT :', response)
})
```
Types de messages supportés : `CREATE_ORGANISM`, `EVOLVE_ORGANISM`, `PREDICT_ACTION`, `GENERATE_INVITATION`, `SHARED_MUTATION`, `TRIGGER_RITUAL`, `APPLY_VISUAL_MUTATION`, etc.

## 🔒 Sécurité & RGPD
- Toutes les données sont chiffrées côté client.
- Aucune donnée personnelle n’est transmise à l’extérieur sans consentement.
- Anonymisation systématique des échanges sociaux.

## 🧬 Contribution
- Code TypeScript strict, modulaire, commenté.
- Tests unitaires obligatoires pour toute nouvelle fonctionnalité.
- Respecter l’architecture et la philosophie du projet.

## 📚 Pour aller plus loin
- Voir le dossier `src/` pour l’architecture détaillée.
- Les hooks d’optimisation et de monitoring sont prêts à être enrichis.
- Les rituels et événements mystiques sont extensibles.

---

**SYMBIONT** – Pour une navigation vivante, éthique et évolutive.