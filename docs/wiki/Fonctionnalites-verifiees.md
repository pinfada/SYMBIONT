# ✅ Fonctionnalités vérifiées

Synthèse de l'état de vérification de chaque fonctionnalité. Toutes les captures
du wiki sont des **rendus réels** du build courant, obtenus en pilotant le popup
de façon automatisée (navigation + interactions).

## Tableau récapitulatif

| Domaine | Fonctionnalité | Statut | Preuve |
|---|---|---|---|
| Organisme | Rendu fractal WebGL temps réel | ✅ vérifié | [page](Organisme) + tests moteur |
| Organisme | Nutrition (sources, gains, conseils) | ✅ affiché | [page](Organisme) |
| Organisme | Contrôles WebGL | ✅ affiché | [page](Organisme) |
| Réseau | Graphe P2P + nœud « Moi » | ✅ affiché | [page](Reseau) |
| Réseau | Sous-onglets Pairs / Messages / Stats | ✅ affichés | [page](Reseau) |
| Réseau | Connexions P2P live (partage/sync) | 🧪 à valider | nécessite 2 instances connectées |
| Stats | Métriques d'évolution | ✅ affiché | [page](Stats) |
| Rituels | Lancement + progression en direct | ✅ vérifié | [page](Rituels) |
| Rituels | Réaction visuelle de l'organisme | ✅ vérifié | [page](Rituels) |
| Rituels | Dégradation gracieuse (page protégée) | ✅ vérifié | flux headless |
| Rituels | Sous-onglets Actif / Historique / Secrets | ✅ affichés | [page](Rituels) |
| Social | Génération de code auto-porteur | ✅ vérifié | [page](Social) |
| Social | Acceptation **cross-installation** | ✅ vérifié | 2 contextes isolés + tests |
| Social | Héritage + réaction de l'organisme | ✅ vérifié | [page](Social) |
| Social | Sous-onglets Guide / Contacts / Partager | ✅ affichés | [page](Social) |
| Paramètres | Réduire les animations (persisté) | ✅ vérifié | [page](Parametres) + tests |
| Paramètres | Qualité du rendu → supersampling | ✅ vérifié | [page](Parametres) + tests |

## Couverture de tests automatisés

- `OrganismRenderer.test.ts` — moteur de rendu (WebGL2→WebGL1, supersampling,
  alpha prémultiplié, perte de contexte, unicité par ADN).
- `OrganismPreferences.test.ts` — réglages (défauts, persistance, notification,
  mapping qualité).
- `InviteCode.test.ts` — codec d'invitation (round-trip, unicode, rejet des codes
  corrompus/tronqués/expirés, expiration).

## Ce qui reste à valider en conditions réelles

Les **connexions P2P en direct** (partage d'énergie et synchronisation de
conscience entre deux pairs effectivement connectés) demandent deux navigateurs
réels reliés — elles seront validées lors de la QA multi-profils Firefox décrite
dans le dépôt. Tout le reste est vérifié ici.
