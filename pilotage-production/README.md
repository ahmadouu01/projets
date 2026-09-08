# Pilotage de la production — classeur superviseur

Classeur Excel de pilotage opérationnel pour un superviseur de production :
saisie quotidienne, calcul normalisé du TRS, analyse des pertes et animation
du plan d'actions.

## Contenu

| Onglet | Rôle |
|---|---|
| `LISEZ-MOI` | Architecture, légende des couleurs, rituel de management, procédure de mise en service |
| `COCKPIT` | 12 cartes d'indicateurs, 7 graphiques, top 5 des causes, bloc de décisions |
| `SAISIE_PROD` | Journal de production (200 lignes), 18 indicateurs calculés, contrôle de cohérence |
| `ARRETS` | Journal événementiel des arrêts (400 lignes), codification 5M |
| `PLAN_ACTIONS` | Résolution de problème structurée : criticité IPR, cause racine, efficacité vérifiée |
| `POLYVALENCE` | Matrice ILUO, couverture des postes, risque de mono-compétence |
| `AUDIT_5S` | Grille pondérée 25 critères, scoring par domaine, comparaison à l'audit précédent |
| `PRISE_DE_POSTE` | Standard SQCDP, passation écrite, matrice d'escalade |
| `PARAMETRES` | Objectifs et seuils, référentiels lignes / produits / causes / postes, listes de choix |
| `GLOSSAIRE` | Définition, formule et interprétation de chaque indicateur, règles de gestion |
| `CALC` | Moteur de calcul : agrégations filtrées, Pareto, cascade, historique 13 mois |

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

Le classeur a été contrôlé par évaluation complète des formules (18 066 cellules,
moteur `formulas`) : aucune erreur de calcul. Les 33 `#N/A` résiduels sont
volontaires — ils se trouvent dans les colonnes de CALC dédiées aux graphiques
(`E`, `R`, `S`) et servent à interrompre les courbes sur les périodes, lignes ou
équipes sans production, plutôt que d'y afficher un zéro trompeur.

Les indicateurs agrégés ont été recoupés avec un calcul Python indépendant à
partir des données brutes (TRS, disponibilité, performance, qualité, TRG, taux de
service, PPM, MTBF, MTTR) : correspondance exacte, filtres du cockpit compris.
