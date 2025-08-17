🔧 1. INITIALISATION DU PROJET
Ordre	Action
1.1	Créer le dépôt Git et initialiser le projet Node.js + npm
1.2	Ajouter et configurer TypeScript, tsconfig.json
1.3	Configurer Webpack + output manifest V3 compatible
1.4	Générer manifest.json (permissions, scripts, action)
1.5	Structurer l'arborescence (src/background, content, ui, etc.)
1.6	Ajouter ESLint, Prettier, Husky (optionnel)
1.7	Préparer les scripts dev, build, package, test dans package.json

🌐 2. COLLECTE DU COMPORTEMENT UTILISATEUR
Ordre	Action
2.1	Créer ContentObserver.ts pour injecter dans toutes les pages OK
2.2	Détecter : focus onglet, scroll, clicks, temps de lecture OK
2.3	Créer BehaviorCollector.ts pour structurer les événements OK
2.4	Transmettre les comportements au MessageBus OK
2.5	Ajouter logique de throttling et filtrage domaine OK

🔀 3. MESSAGE BUS & OBSERVATEURS
Ordre	Action
3.1	Implémenter MessageBus.ts (pattern pub/sub + typage strict)
3.2	Gérer les canaux behavior, mutation, state, murmur, graines
3.3	Intégrer système de log ou metrics internes pour observer les flux
3.4	Ajouter fallback silencieux si module indisponible

🧠 4. MOTEUR DE COMPORTEMENT
Ordre	Action
4.1	Implémenter BehaviorPredictor.ts (analyse simple)
4.2	Mapper le comportement vers des traits : focus, diversité, rythme
4.3	Générer un hash ADN via DNAInterpreter.ts
4.4	Mettre à jour l'état global de l'organisme

🧬 5. MOTEUR WEBGL DE RENDU VISUEL
Ordre	Action
5.1	Créer le OrganismEngine.ts (canvas, WebGL2, rendu)
5.2	Compiler les organism.vert et organism.frag shaders
5.3	Transmettre paramètres depuis l'ADN (primaryColor, symmetry, etc.)
5.4	Appliquer mutations dynamiques via MutationEngine.ts
5.5	Intégrer dans le DOM via WebGLWrapper.tsx
5.6	Gérer fallback "CSS-only" si WebGL non supporté

💾 6. PERSISTANCE DES DONNÉES
Ordre	Action
6.1	Implémenter SymbiontStorage.ts avec IndexedDB
6.2	Définir schéma de données (behavior logs, visual state, graines)
6.3	Créer un système de migration de version (migration.ts)
6.4	Sauvegarder et restaurer à chaque chargement de l'extension

🗣️ 7. MURMURES (MESSAGES INTROSPECTIFS)
Ordre	Action
7.1	Créer MurmurSystem.ts
7.2	Créer un fichier murmur_templates.json ou un générateur dynamique
7.3	Déclencher un murmure à partir d'un seuil comportemental
7.4	Afficher via Toast, Bubble, Modal (dans UI React ou DOM)
7.5	Ajouter un système anti-répétition + tempo adaptatif

🌱 8. PROPAGATION VIRALE PAR GRAINES
Ordre	Action
8.1	Implémenter GrainesManager.ts
8.2	Générer 3 tokens (UUID ou Hash crypté) à l'installation
8.3	Permettre le partage (copier lien, QR code...)
8.4	Ajouter interface pour saisir une graine dans popup.tsx
8.5	Si graine valide, enregistrer activation + relancer mutation initiale

🖥️ 9. INTERFACE UTILISATEUR
Ordre	Action
9.1	Compléter popup.tsx avec affichage de l'état (actif, mutant, en veille)
9.2	Intégrer DisableButton.tsx pour désactiver temporairement
9.3	Ajouter affichage des graines, derniers murmures, visuel
9.4	Ajouter une timeline visuelle ou un historique simple (optionnel MVP+)

🧪 10. TESTS ET QUALITÉ
Ordre	Action
10.1	Ajouter tests unitaires (jest) pour chaque module
10.2	Ajouter tests d'intégration (vitest ou playwright)
10.3	Vérifier performance : < 1% CPU / < 30MB RAM
10.4	Vérifier stabilité mémoire du moteur WebGL
10.5	Ajouter outil de trace (Stats.js ou metrics.ts) pour observer l'évolution

🚀 11. EMBALLAGE ET PUBLICATION
Ordre	Action
11.1	Générer zip via npm run package
11.2	Tester l'extension sur Chrome via chrome://extensions
11.3	Soumettre sur le Chrome Web Store avec assets visuels
11.4	Préparer la documentation utilisateur (readme, vidéos, guides)
11.5	Publier la documentation sur docs.symbiont.dev OK