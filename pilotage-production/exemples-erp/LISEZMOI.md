# Extractions ERP d'exemple

Trois fichiers complets, cohérents entre eux, à importer dans le dashboard
(bouton **Importer mes extractions**). Chaque jeu existe en `.xlsx` et en `.csv`
(séparateur point-virgule, UTF-8) : prenez l'un ou l'autre.

| Fichier | Lignes | Contenu |
|---|---:|---|
| `01_production_journaliere` | 462 | Une ligne par jour, centre de charge et équipe, d'octobre 2025 à janvier 2026 |
| `02_journal_arrets` | 2 137 | Un enregistrement par arrêt, horodaté, avec code motif |
| `03_ordres_fabrication` | 188 | Ordres soldés, en cours, en retard et planifiés, de juillet 2025 à mars 2026 |

Les en-têtes reprennent volontairement des intitulés d'ERP (« Centre de charge »,
« Qté bonne 1er passage », « Nb interventions maintenance », « Date fin prévue »,
« Statut OF ») différents des noms internes du tableau de bord : c'est
l'appariement automatique des colonnes qui fait le lien. Les trois fichiers sont
reconnus et associés à 100 % sans intervention.

Les données sont cohérentes : les arrêts du journal alimentent exactement les
rubriques de perte de la production journalière, et les ordres de fabrication
reprennent les mêmes centres de charge, articles et cadences.

Site fictif « Usine de Vernon » : 3 centres de charge, jusqu'à 3 équipes,
6 articles, 7 clients, un arrêt annuel du 22 décembre au 2 janvier, un accident
avec arrêt le 18 novembre 2025.

Régénérer : `cd ../generateur && python3 exemples_erp.py`
