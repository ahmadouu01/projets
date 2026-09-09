# Pilotage de la production — classeur superviseur

Classeur Excel de pilotage opérationnel pour un superviseur de production :
saisie quotidienne, calcul normalisé du TRS, analyse des pertes et animation
du plan d'actions.

## Contenu

| Onglet | Rôle |
|---|---|
| `LISEZ-MOI` | Architecture, légende des couleurs, rituel de management, procédure de mise en service |
| `ANIMATION` | Board de management visuel du point 5 minutes, imprimable en A3 : grille SQCDP jour par jour, jauges, compteur sécurité, où part le temps, trois actions prioritaires |
| `COCKPIT` | 12 cartes d'indicateurs à code couleur automatique, 8 graphiques, décisions de la revue |
| `SAISIE_PROD` | Journal de production (200 lignes), 18 indicateurs calculés, contrôle de cohérence |
| `ARRETS` | Journal événementiel des arrêts (400 lignes), codification 5M |
| `PLAN_ACTIONS` | Résolution de problème structurée : criticité IPR, cause racine, efficacité vérifiée |
| `POLYVALENCE` | Matrice ILUO, couverture des postes, risque de mono-compétence |
| `AUDIT_5S` | Grille pondérée 25 critères, scoring par domaine, comparaison à l'audit précédent |
| `PRISE_DE_POSTE` | Standard SQCDP, passation écrite, matrice d'escalade |
| `PARAMETRES` | Objectifs et seuils, référentiels lignes / produits / causes / postes, listes de choix |
| `GLOSSAIRE` | Définition, formule et interprétation de chaque indicateur, règles de gestion |
| `CALC` | Moteur de calcul : agrégations filtrées, Pareto, cascade, historique 13 mois |

## Management visuel

Le classeur privilégie la lecture visuelle sur la lecture tabulaire :

- **grille SQCDP** — 5 axes × 31 jours, une case colorée par jour, calculée à partir
  des seuils de `PARAMETRES` ; c'est le board d'atelier classique, mis à jour tout seul ;
- **jauges** en demi-cercle pour le TRS, la qualité et le taux de service ;
- **compteur « jours sans accident avec arrêt »** en très gros caractères ;
- **cartes d'indicateurs** qui basculent en vert, orange ou rouge selon la cible et
  le seuil d'alerte, avec la tendance contre le mois précédent (▲ ▼) ;
- **10 graphiques** : suivi journalier avec moyenne mobile et limites de variation
  courante, Pareto avec courbe de cumul, cascade des pertes de temps, tendance
  13 mois, comparaison entre lignes et entre équipes, causes d'arrêt, radar 5S,
  couverture des postes, avancement des actions ;
- **barres de données et jeux d'icônes** dans les onglets de travail (TRS de la
  journée, avancement et criticité des actions, taux de maîtrise, score 5S), pour
  que les tableaux de saisie se lisent eux aussi d'un coup d'œil.

Les onglets de saisie (`SAISIE_PROD`, `ARRETS`, `PLAN_ACTIONS`) et de référence
(`PARAMETRES`, `GLOSSAIRE`) restent tabulaires : ce sont des journaux et des
référentiels, la restitution se fait ailleurs.

## Le cockpit interactif

L'onglet `COCKPIT` tient sur un seul écran : les douze indicateurs en bandeau,
puis huit graphiques visibles simultanément (suivi journalier, Pareto, cascade
des pertes, tendance 13 mois, comparaison des lignes, comparaison des équipes,
top 5 des causes, avancement du plan d'actions).

Cinq menus déroulants le pilotent : **année**, **mois**, **ligne**, **équipe** et
**indicateur suivi**. Ce dernier est le levier d'interaction principal — choisir
« Qualité au premier passage » plutôt que « TRS » change d'un coup le suivi
journalier, la tendance sur 13 mois, les deux comparaisons et jusqu'aux titres
des graphiques. Le cockpit se lit donc de la même façon quel que soit
l'indicateur analysé.

## Dashboard web

`dashboard.html` est la version web du cockpit, publiée comme page interactive :
filtres cliquables, infobulles au survol de chaque point, graphiques en SVG,
grille SQCDP cliquable qui épingle une journée sur le suivi journalier.

### Charger ses propres extractions ERP

La page accepte trois jeux de données, déposés en `.xlsx`, `.xls`, `.csv`, `.txt`,
ou simplement collés depuis Excel :

| Jeu | Ce qu'il alimente | Champs obligatoires |
|---|---|---|
| Production journalière | TRS et ses composantes, SQCDP, Pareto, cascade | date, ligne, temps d'ouverture, quantité produite, quantité conforme |
| Journal des arrêts | causes d'arrêt, familles 5M | date, ligne, code cause, durée |
| Ordres de fabrication | encours, retards, charge, ordonnancement | n° d'OF, ligne, quantité, début prévu, fin prévue |

Le jeu de données est reconnu automatiquement d'après les en-têtes, et chaque
colonne est associée au champ correspondant — l'association reste modifiable
avant le chargement. Les formats français sont pris en charge : `1 234,56`,
`31/01/2026`, ainsi que les dates sérielles d'Excel.

Les données chargées restent dans le navigateur (`localStorage`) : elles ne
partent sur aucun serveur et sont retrouvées à la réouverture de la page.

### Fichiers d'exemple

Le dossier `exemples-erp/` contient trois extractions complètes et cohérentes
(462 lignes de production sur quatre mois, 2 137 arrêts, 188 ordres de
fabrication), en `.xlsx` et en `.csv`. Leurs en-têtes sont des intitulés d'ERP
volontairement différents des noms internes du tableau de bord ; les trois
fichiers sont reconnus et appariés à 100 % sans intervention.

### Date de référence

Encours, retards et charge se calculent par rapport à une **date de référence**,
réglable dans le bandeau de filtres et positionnée par défaut sur la donnée la
plus récente du jeu chargé. C'est elle qui détermine ce qui est en retard, ce qui
est en cours et ce qui reste à planifier — et c'est aussi elle qui fixe le mois
analysé par les indicateurs, la grille SQCDP et le suivi journalier. Un jeu
couvrant plusieurs mois se parcourt donc en déplaçant cette seule date.

### Régénérer le jeu de démonstration

```bash
cd generateur && python3 export_json.py
```

puis réassembler `dashboard.html` à partir des données mises à jour.

## Régénérer le classeur

```bash
pip install openpyxl
cd generateur
python3 build.py ../Pilotage_Production_Superviseur.xlsx
```

Le dossier `generateur/` contient un module par onglet ; `data.py` regroupe les
référentiels et le jeu de démonstration (janvier 2026, deux lignes), généré de
façon déterministe et cohérent entre le journal des arrêts et la saisie
quotidienne.

## Vérification

Le classeur a été contrôlé par évaluation complète des formules (18 916 cellules,
moteur `formulas`) : aucune erreur de calcul. Les 33 `#N/A` résiduels sont
volontaires — ils se trouvent dans les colonnes de CALC dédiées aux graphiques
(`E`, `R`, `S`) et servent à interrompre les courbes sur les périodes, lignes ou
équipes sans production, plutôt que d'y afficher un zéro trompeur.

Les indicateurs agrégés ont été recoupés avec un calcul Python indépendant à
partir des données brutes (TRS, disponibilité, performance, qualité, TRG, taux de
service, PPM, MTBF, MTTR) : correspondance exacte, filtres du cockpit compris.
