# Contenu du wiki SYMBIONT

Ce dossier contient les pages du wiki GitHub, **prêtes à publier**. Les images
sont dans `images/` et référencées en chemins relatifs, donc ces pages
s'affichent correctement **à la fois** ici (dans le dépôt) et une fois copiées
dans le wiki (qui est un dépôt Git séparé).

## Pages

| Fichier | Page wiki |
|---|---|
| `Home.md` | Accueil |
| `Organisme.md` | Page Organisme |
| `Reseau.md` | Page Réseau |
| `Stats.md` | Page Stats |
| `Rituels.md` | Page Rituels |
| `Social.md` | Page Social |
| `Parametres.md` | Page Paramètres |
| `Fonctionnalites-verifiees.md` | Fonctionnalités vérifiées |
| `Navigateurs-et-installation.md` | Navigateurs & installation |
| `_Sidebar.md` | Barre latérale de navigation |
| `images/` | Toutes les captures (chemins relatifs) |

## Publier sur le wiki GitHub

Le wiki d'un dépôt est lui-même un dépôt Git (`<repo>.wiki.git`). Pour le
peupler avec ce contenu :

1. **Activer le wiki** : sur GitHub → `Settings` → `Features` → cocher **Wikis**.
   Puis créer une première page (bouton **Create the first page** → **Save**)
   pour initialiser le dépôt wiki.

2. **Publier depuis votre machine** :
   ```bash
   git clone https://github.com/pinfada/SYMBIONT.wiki.git
   cp -r docs/wiki/* SYMBIONT.wiki/     # depuis la racine du dépôt principal
   cd SYMBIONT.wiki
   git add .
   git commit -m "Wiki: présentation de l'extension SYMBIONT"
   git push
   ```

3. Le wiki est en ligne : `https://github.com/pinfada/SYMBIONT/wiki`.

> Les images étant en chemins relatifs (`images/…`), elles s'affichent dans le
> wiki sans configuration supplémentaire.
