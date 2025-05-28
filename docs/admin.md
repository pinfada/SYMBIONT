# Documentation fonctionnelle – Administration SYMBIONT

## Objectif
Permettre à un administrateur de superviser, auditer et piloter les rituels, la propagation, la sécurité et l’évolution du réseau SYMBIONT.

## Fonctions d’administration

1. **Gestion des rituels**
   - Visualisation et modification des rituels actifs (mutation partagée, réveil collectif, codes secrets).
   - Activation/désactivation de rituels spéciaux.
   - Historique des rituels (date, participants, succès/échec).

2. **Monitoring du réseau**
   - Visualisation du graphe global (transmissions, fusions, mutations collectives).
   - Suivi des seuils collectifs atteints (propagation virale à vague).
   - Statistiques : nombre d’organismes, invitations générées/consommées, mutations, transmissions.

3. **Audit & sécurité**
   - Export de l’historique des invitations, mutations, transmissions (CSV/JSON).
   - Vérification de la non-collecte de données personnelles.
   - Gestion des permissions et logs d’accès admin.

4. **Gestion des seuils collectifs**
   - Configuration des seuils de propagation virale (ajout, modification, suppression).
   - Visualisation des événements déclenchés par seuil.

5. **Outils avancés**
   - Injection de codes secrets ou d’événements spéciaux pour tests.
   - Réinitialisation du réseau ou d’un organisme (usage exceptionnel).

## Bonnes pratiques admin
- Toujours documenter les actions d’administration (logs, historique).
- Ne jamais exposer d’interface d’export ou de reset sans confirmation explicite.
- Respecter la philosophie SYMBIONT : anonymat, sécurité, transmission rituelle.
- Tester chaque évolution sur un environnement isolé avant déploiement. 