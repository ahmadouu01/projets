# ELAN SPORT

Site vitrine + boutique pour une marque de vêtements de sport, en HTML/CSS/JS
natif (aucun framework, aucune dépendance à installer).

## Pages

- `index.html` — Accueil : hero, catégories, meilleures ventes, bannière
  promo, points forts, témoignages, galerie communauté, newsletter.
- `boutique.html` — Catalogue complet avec filtres (catégorie, prix) et tri.
- `contact.html` — Formulaire de contact, coordonnées, FAQ.

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
