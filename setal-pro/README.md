# Setal Pro — site vitrine

Site institutionnel de **Setal Pro**, entreprise sénégalaise de location-entretien
de vêtements de travail, de linge plat et de solutions d'hygiène pour les
professionnels (modèle de service inspiré des multiservices textiles européens
type Elis, adapté au marché sénégalais).

Site statique en HTML / CSS / JavaScript natif : aucun framework, aucune
dépendance à installer, aucune image externe (tous les visuels sont des SVG et
des dégradés CSS).

## Pages

| Fichier | Contenu |
|---|---|
| `index.html` | Accueil : hero, réassurance, 8 solutions, cycle de service en 5 étapes, secteurs, chiffres clés, argumentaire location vs achat, RSE, témoignages, actualités, appel à l'action. |
| `solutions.html` | Les 8 solutions en détail (ancres `#vetement-travail`, `#linge-plat`, `#hygiene`, `#linge-sante`, `#tapis`, `#essuyage`, `#eau-cafe`, `#3d`) + comparatif achat / location. |
| `secteurs.html` | Les 8 secteurs servis (hôtellerie, santé, industrie, mines, BTP, banques & bureaux, administrations, propreté). |
| `entreprise.html` | Mission, chiffres, histoire, valeurs, carte des implantations, engagement RSE (`#rse`), actualités, recrutement (`#recrutement`). |
| `devis.html` | Demande de devis en 3 étapes avec récapitulatif et validation côté client. |
| `contact.html` | Formulaire de contact, coordonnées, agences (`#agences`), espace client (`#espace-client`), FAQ (`#faq`). |

## Version en un seul fichier

`setal-pro-site-complet.html` contient **tout le site dans un seul fichier**
autonome : les six pages, le CSS, le JavaScript et le favicon y sont intégrés.
Il s'ouvre d'un double-clic, sans serveur, et se transmet par e-mail ou par clé USB.

La navigation s'y fait par des routes de hash : `#/accueil`, `#/solutions`,
`#/solutions/tapis`, `#/secteurs/mines`, `#/entreprise/rse`,
`#/devis?solution=tapis&secteur=hotellerie`, `#/contact/faq`…

Ce fichier est **généré** à partir des six pages : après avoir modifié un fichier
source (`.html`, `css/style.css`, `js/main.js`), il faut le régénérer pour que la
version un-fichier reste à jour. Seules les polices Google (Manrope / Inter) sont
chargées depuis Internet ; hors ligne, le site s'affiche avec les polices système.

## Fonctionnalités

- Méga-menus « Nos solutions » et « Nos secteurs » (survol sur ordinateur, accordéon sur mobile).
- Menu mobile en tiroir, en-tête figé au défilement, bouton retour en haut, bouton WhatsApp flottant.
- Formulaire de devis multi-étapes : validation par étape, récapitulatif automatique, pré-remplissage
  depuis l'URL (`devis.html?solution=tapis&secteur=hotellerie`).
- Formulaires de contact et newsletter validés côté client (e-mail, téléphone au format sénégalais).
- Compteurs animés, apparitions au défilement, carrousel de témoignages, accordéon FAQ.
- Carte du Sénégal en SVG avec les quatre centres de production et les villes desservies.
- Responsive jusqu'à 390 px de large, respect de `prefers-reduced-motion`, navigation au clavier.

## Lancer le site en local

Aucune installation nécessaire : ouvrez `index.html` dans un navigateur, ou

```bash
cd setal-pro
python3 -m http.server 8000
# puis ouvrez http://localhost:8000
```

## Structure

```
index.html  solutions.html  secteurs.html  entreprise.html  devis.html  contact.html
css/style.css     # design system (variables de marque, composants, responsive)
js/main.js        # navigation, animations, carrousel, accordéon, formulaires
assets/favicon.svg
```

## Personnalisation

- **Couleurs et typographies** : variables CSS en tête de `css/style.css`
  (`--green-800` vert de marque, `--gold` accent, polices Manrope / Inter).
- **En-tête et pied de page** : ils sont dupliqués dans chaque fichier `.html`
  (site statique sans moteur de gabarits) — une modification doit être reportée
  dans les six pages.
- **Coordonnées** : téléphone `+221 33 859 01 00`, WhatsApp `+221 77 000 00 00`,
  e-mails `@setalpro.sn` et adresses d'agences sont des valeurs de démonstration
  à remplacer par les vraies. Idem pour le NINEA et le numéro de RC du pied de page.
- **Chiffres clés** (1 200 sites, 350 collaborateurs, 4 usines, 98 % de livraisons
  à l'heure, 70 % d'eau recyclée, 900 m² de solaire) : ce sont des valeurs
  d'illustration, à ajuster à la réalité de l'entreprise avant mise en ligne.
- **Formulaires** : ils fonctionnent côté client uniquement (message de
  confirmation). Pour recevoir les demandes, branchez l'attribut `action` des
  formulaires sur votre back-end, ou un service tiers de collecte.
