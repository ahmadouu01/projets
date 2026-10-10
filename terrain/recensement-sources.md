# Recensement des prospects : état et sources

> Amorcé le 10/10/2026 par recherche web. **50 établissements** ont été saisis
> dans `suivi-prospects.csv` : 29 hôtels et résidences, 21 cliniques.
>
> **Limites :**
> - Données issues d'annuaires et de sites de réservation, parfois anciennes
>   (2020 à 2025) : noms, capacités et téléphones **à vérifier**.
> - Les annuaires PDF les plus riches (dont le répertoire officiel du
>   ministère de la Santé) n'étaient **pas lisibles** depuis mon
>   environnement. Seuls des extraits ont été repris.
> - La plateforme OpenStreetMap était bloquée elle aussi.
>
> **Pour compléter** jusqu'à l'objectif de 200 à 300 prospects : ouvrir les
> sources ci-dessous, puis Google Maps (recherches « hôtel », « résidence »,
> « clinique », « restaurant » par quartier).

## Sources utilisées (colonne `source` du CSV)

| Code | Source | Lien |
|---|---|---|
| R1 | Climate Chance — liste des hôtels de Dakar avec catégorie et nombre de chambres (2022) | https://www.climate-chance.org/wp-content/uploads/2022/08/liste-des-hotels-.pdf · https://www.climate-chance.org/wp-content/uploads/2022/06/liste-des-hotels-hotels-1.pdf |
| R2 | hotelsdakar.com — fiches d'hôtels | https://le-lodge-des-almadies.hotelsdakar.com/en/ · https://almadies-2.hotelsdakar.com/en/ |
| R3 | Kayak — fiches d'hôtels | https://www.kayak.com/Ngor-Hotels-Yaas-Hotel-Dakar-Almadies.2843701.ksp |
| R4 | dakar-hotels-sn.com | https://www.dakar-hotels-sn.com/en/ |
| R5 | Voyage avec nous — où dormir à Dakar | https://www.voyageavecnous.fr/ou-dormir-a-dakar/ |
| R6 | Au-Sénégal — hôtels, résidences, meublés de Dakar | https://www.au-senegal.com/dakar-hotels-residences-meubles-auberges,076.html |
| R7 | Yonder — extension du Terrou-Bi (2026) | https://www.yonder.fr/news/hotels/a-dakar-le-terrou-bi-fete-ses-40-ans-et-s-agrandit-avant-les-joj-2026 |
| R8 | Liste des hôtels de Dakar (NED, 2018) | https://www.movedemocracy.org/wp-content/uploads/2018/02/Additional-Hotels-NED-final.pdf |
| R9 | Recherche Google Hotels | https://www.google.com/travel/hotels/dakar-hotels |
| R10 | Au-Sénégal — Diamniadio, Lac Rose et environs ; Trip.com — hôtels de Rufisque | https://www.au-senegal.com/lac-rose-diamnadio-hotel-campements-et-residences,077.html · https://au.trip.com/hotels/rufisque-hotels-list-649042 |
| R11 | Annuaire des hôtels du département de Rufisque (Synara) | https://synara.ar/en/business-directory/senegal/rufisque-department/hotel |
| R12 | Ministère de la Santé, portail d'information sanitaire — liste non exhaustive des professionnels de santé (régions de Dakar et Thiès) | https://informationsanitaire.sec.gouv.sn/dataset/32d13292-c024-439d-bd46-593ec005c1a5/resource/4e025547-9061-437b-984b-8421ff7f890c/download/liste-non-exhaustive-des-professionnels-de-sante-au-senegal-region-dakar-et-thies.pdf |
| R13 | BCEAO — liste de médecins et cliniques | https://www.bceao.int/sites/default/files/inline-files/Liste_medecins_A4.pdf |
| R14 | Sénégal Online — cliniques et hôpitaux de Dakar | https://www.senegal-online.com/adresses-utiles/cliniques-et-hopitaux-de-dakar/ |
| R15 | Listes de prestataires d'assureurs santé : IPM (2024), Transvie (2025), GGA (2024) | https://www.ipmse.sn/wp-content/uploads/2024/11/CLINQUES-ET-CABINETS-MEDICAUX-DE-DAKAR.pdf · https://www.transvie.sn/LISTE%20PRESTATAIRES%20TRANSVIE%202025%20DAKAR%20ET%20HORS%20DE%20DAKAR%20avril%202025.pdf · https://gga-sn.com/wp-content/uploads/2024/06/RS.Reseau-de-soins-GGA-SENEGAL-V22-03-2024.pdf |

## Sources à exploiter en priorité pour compléter

1. **Répertoire officiel des structures de santé privées** (ministère de la
   Santé) : https://www.sante.gouv.sn/sites/default/files/repertoire%20structures%20privees.pdf
   (copie : https://www.esante.sn/app/uploads/repertoire-structures-de-sante-privees-senegal.pdf).
   Filtrer : région de Dakar, type « clinique ». C'est la seule liste
   officielle, et elle permet de vérifier les « cliniques légalement
   constituées ».
2. **Listes de prestataires des assureurs** (R15) : ces cliniques sont
   conventionnées, donc a priori solvables et en règle.
3. **Liste Climate Chance** (R1) : nombre de chambres par hôtel.
4. **Google Maps** : restaurants, entreprises industrielles (Hann, Bel-Air,
   Diamniadio), sociétés de sécurité, entreprises du BTP. Ces segments ne
   sont pas encore recensés.

## Répartition actuelle

| Département | Hôtels et résidences | Cliniques |
|---|---|---|
| Dakar | 17 | 11 |
| Pikine | 0 | 2 |
| Guédiawaye | 0 | 1 |
| Keur Massar | 0 | 3 |
| Rufisque (dont Diamniadio et Lac Rose) | 12 | 3 |
| **Total** | **29** | **21** |
