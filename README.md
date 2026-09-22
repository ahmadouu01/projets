# ELAN SPORT

Site vitrine + boutique pour une marque de vêtements de sport, en HTML/CSS/JS
natif (aucun framework, aucune dépendance à installer).

## Pages

- `index.html` — Accueil : hero, catégories, meilleures ventes, bannière
  promo, points forts, témoignages, galerie communauté, newsletter.
- `boutique.html` — Catalogue complet avec filtres (catégorie, prix) et tri.
- `contact.html` — Formulaire de contact, coordonnées, FAQ.
- `undercover.html` — Jeu de soirée « Undercover », indépendant du site
  vitrine (voir plus bas).

## Fonctionnalités

- Panier persistant (localStorage) avec tiroir latéral, quantités et total.
- Thème clair / sombre (bouton dans l'en-tête, mémorisé entre les visites).
- Filtres et tri dynamiques sur la boutique, y compris via l'URL
  (`boutique.html?cat=running`).
- Menu mobile, en-tête qui se fige au scroll, animations d'apparition.
- Carrousel de témoignages, accordéon FAQ, formulaires validés côté client.
- Visuels produits générés en CSS/SVG (aucune image externe requise).

## Lancer le site en local

Aucune installation n'est nécessaire : ouvrez `index.html` dans un
navigateur, ou lancez un petit serveur local pour un rendu identique à la
production :

```bash
python3 -m http.server 8000
# puis ouvrez http://localhost:8000
```

## Le jeu Undercover

`undercover.html` est une page autonome (aucune dépendance au reste du site) :
un jeu de mots à jouer entre amis sur un seul appareil que l'on se passe de
main en main.

- **3 à 20 joueurs.** Les civils partagent un mot secret, les undercovers en
  reçoivent un voisin, les Mister White n'ont rien et doivent bluffer.
- **Rôles tirés au sort** à chaque partie. La répartition est proposée
  automatiquement selon le nombre de joueurs (les civils restent toujours
  majoritaires) et reste modifiable à la main.
- **Mots français** piochés dans `js/undercover-words.js`, classés en trois
  niveaux : *facile* (mots très éloignés), *moyen*, *corsé* (quasi-synonymes).
  Le mode « mélangé » tire un niveau au hasard à chaque manche.
- **Déroulement** : distribution des mots carte par carte, ordre de passage
  tiré au sort (un Mister White ne commence jamais la première manche), vote,
  élimination, révélation du rôle. Un Mister White éliminé a droit à une
  tentative pour deviner le mot des civils — s'il réussit, il gagne.
- **Scores cumulés** entre les parties (civil 2 pts, Mister White 6 pts,
  undercover 10 pts), mémorisés dans le navigateur.

Pour ajouter des mots, éditez `js/undercover-words.js` : chaque entrée est une
paire `["mot des civils", "mot des undercovers"]` rangée sous son niveau de
difficulté. L'ordre des deux mots n'a pas d'importance, le jeu tire au sort
lequel revient aux civils.

## Structure

```
index.html
boutique.html
contact.html
undercover.html           # jeu Undercover (page autonome)
css/style.css             # design system (variables, composants, responsive)
css/undercover.css        # style du jeu Undercover
js/products.js            # catalogue produits (données)
js/icons.js               # pictogrammes SVG des vêtements
js/main.js                # panier, filtres, carrousel, formulaires, etc.
js/undercover-words.js    # dictionnaire de paires de mots (3 niveaux)
js/undercover.js          # moteur du jeu Undercover
assets/favicon.svg
assets/undercover.svg
```

## Personnalisation

- Couleurs et typographies : variables CSS en tête de `css/style.css`.
- Catalogue : éditez `js/products.js` (nom, prix, catégorie, tag, couleurs).
- Textes et sections : directement dans les fichiers `.html`.
- Mots du jeu Undercover : `js/undercover-words.js`.
