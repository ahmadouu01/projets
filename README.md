# ELAN SPORT

Site vitrine + boutique pour une marque de vêtements de sport, en HTML/CSS/JS
natif (aucun framework, aucune dépendance à installer).

## Pages

- `index.html` — Accueil : hero, catégories, meilleures ventes, bannière
  promo, points forts, témoignages, galerie communauté, newsletter.
- `boutique.html` — Catalogue complet avec filtres (catégorie, prix) et tri.
- `contact.html` — Formulaire de contact, coordonnées, FAQ.

## Jeux de société (`jeux/`)

Deux jeux à jouer à plusieurs sur un seul appareil (on se passe le
téléphone). Ouvrez `jeux/index.html`.

- `jeux/imposteur.html` — **L'Imposteur** (3 à 20 joueurs) : tout le monde
  reçoit le même mot secret, sauf les Infiltrés (un mot proche) et Mr. Blanc
  (aucun mot). Indices, débat chronométré, vote, score cumulé.
- `jeux/grotte-du-dragon.html` — **La Grotte du Dragon** (2 à 6 joueurs) :
  course au trésor en « stop ou encore » sur un plateau aléatoire. Relancez
  le dé tant que vous osez : si le dragon sort, vous perdez votre tour !
  Coffres surprises, pièges, boutique, bousculades et colère du dragon.

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

## Structure

```
index.html
boutique.html
contact.html
css/style.css       # design system (variables, composants, responsive)
js/products.js       # catalogue produits (données)
js/icons.js           # pictogrammes SVG des vêtements
js/main.js            # panier, filtres, carrousel, formulaires, etc.
assets/favicon.svg
```

## Personnalisation

- Couleurs et typographies : variables CSS en tête de `css/style.css`.
- Catalogue : éditez `js/products.js` (nom, prix, catégorie, tag, couleurs).
- Textes et sections : directement dans les fichiers `.html`.
