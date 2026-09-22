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
- **Rôles tirés au sort** à chaque partie via `crypto.getRandomValues`
  (mélange de Fisher-Yates, tirage sans biais de modulo) : personne n'a plus
  de chances qu'un autre d'être undercover ou Mister White.
- **Trois répartitions** : *Conseillée* (selon le nombre de joueurs),
  *Aléatoire* (le nombre d'imposteurs est lui aussi tiré au sort et reste
  caché jusqu'à la fin) et *Manuelle*. Dans tous les cas les civils restent
  majoritaires.
- **300 paires de mots français** dans `js/undercover-words.js`, classées en
  trois niveaux de 100 : *facile* (mots très éloignés), *moyen*, *corsé*
  (quasi-synonymes). Le mode « mélangé » tire un niveau au hasard à chaque
  partie.
- **Déroulement** : distribution des mots carte par carte, premier à parler
  tiré au sort à chaque manche parmi les joueurs encore en jeu (Mister White
  compris), vote,
  élimination, révélation du rôle. Un Mister White éliminé a droit à une
  tentative pour deviner le mot des civils — s'il réussit, il gagne.
- **Scores cumulés** entre les parties (civil 2 pts, Mister White 6 pts,
  undercover 10 pts), mémorisés dans le navigateur.
- **Dictionnaire consultable** depuis l'écran de préparation : les paires
  rangées par niveau, avec un filtre. Le bouton n'existe que sur cet écran,
  donc les mots sont hors d'atteinte dès que les rôles sont distribués — et
  la modale refuse de s'ouvrir si une partie est en cours.

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
