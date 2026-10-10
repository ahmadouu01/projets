# 07 — Modèle financier sur 5 ans (notice et résultats)

> Phase 7 — statut : **rédigée en autonomie** (10/10/2026), à relire par
> Ahmadou.
>
> Fichier : **`finance/modele.xlsx`**. Toutes les valeurs sont calculées par
> formules ; les cellules en bleu se modifient. Tous les chiffres de ce
> document sont des **[ESTIMATION]** produites par le modèle, à partir
> d'hypothèses détaillées dans l'onglet « Hypotheses », avec leur statut.
> Montants en FCFA hors taxes.

---

## 1. En bref

1. **Le projet peut être rentable, mais seulement si le prix et le volume
   sont au rendez-vous.**
   - **Scénario central** (700 FCFA/kg, 300 kg/jour au bout de
     18 mois) : l'EBE (le résultat d'exploitation avant amortissements)
     devient positif au **9e mois**, le résultat net est positif dès
     l'année 2, et le **point mort se situe autour de 170 à 210 kg/jour**.
   - **Scénario pessimiste** (550 FCFA/kg, 220 kg/jour) : le projet
     **ne devient jamais rentable**, car le point mort, autour de
     350 kg/jour, dépasse la capacité d'une équipe.
   - **Le prix au kg est donc la donnée qui décide de tout.** C'est le
     critère G3 du go / no-go.
2. **Ton épargne ne suffit pas à financer le plan d'ici fin 2030.**

| Version d'investissement frugale (≈ 46 M FCFA) | Pessimiste | **Central** | Optimiste |
|---|---|---|---|
| Besoin de financement maximal (investissement + pertes de démarrage + BFR + linge) | 145 M | **60 M** | 49 M |
| Plus un coussin de sécurité de 3 mois de charges fixes | 153 M | **68 M** | 55 M |
| Épargne mobilisable à l'ouverture (oct. 2030) | 24 M | **24 M** | 24 M |
| **Écart à financer** | **– 129 M** | **– 43 M** | **– 31 M** |

   Avec la version d'investissement **standard** (≈ 85 M FCFA), l'écart
   central passe à **– 84 M FCFA**.
3. **Pour couvrir l'écart central avec ta seule épargne**, il faudrait :
   - soit épargner **≈ 1 380 € de plus par mois** dès maintenant, soit
     environ 2 400 €/mois au total ;
   - soit **repousser l'ouverture d'environ 66 mois** (5 ans et demi) à
     1 000 €/mois.

   Ni l'un ni l'autre ne semble réaliste. **Un financement complémentaire
   d'environ 30 à 45 M FCFA est donc à prévoir** dans le scénario central
   (leviers au §6).

---

## 2. Structure du classeur

| Onglet | Contenu |
|---|---|
| Lisez-moi | Mode d'emploi, code couleur, simplifications |
| Synthese | Comparaison des 3 scénarios : besoin de financement, écart avec l'épargne, années 1 à 5, épargne nécessaire |
| Hypotheses | ≈ 60 paramètres × 3 scénarios (Pessimiste / Central / Optimiste), avec statut et source. **Cellule D5 : version d'investissement** (1 = frugale, 2 = standard) |
| Investissements | 13 postes, en versions standard et frugale, avec leur durée d'amortissement |
| Epargne | Épargne mois par mois d'octobre 2026 à septembre 2030 : apport, 500 € puis 1 000 €, voyages, déménagement, réserve personnelle |
| Scen_Pessimiste, Scen_Central, Scen_Optimiste | 61 colonnes (mois 0 = septembre 2030, puis octobre 2030 à septembre 2035) : volumes, CA, charges, EBE, BFR, linge, impôts, trésorerie ; synthèse annuelle et indicateurs clés en bas |

---

## 3. Hypothèses principales

Le détail figure dans l'onglet « Hypotheses ».

| Hypothèse | Pessimiste | Central | Optimiste | Statut |
|---|---|---|---|---|
| Volume au 1er mois → en fin de montée en charge | 40 → 220 kg/jour | 60 → 300 kg/jour | 80 → 320 kg/jour | [HYPOTHÈSE] |
| Durée de la montée en charge | 24 mois | 18 mois | 12 mois | [HYPOTHÈSE] |
| 2e équipe | jamais | mois 30 | mois 20 | [HYPOTHÈSE] |
| Prix Setal Entretien | 550 FCFA/kg | **700 FCFA/kg** | 850 FCFA/kg | **[HYPOTHÈSE] aucun prix trouvé** |
| Prix Setal Location | 950 FCFA/kg | 1 100 FCFA/kg | 1 250 FCFA/kg | [HYPOTHÈSE] |
| Part de location au mois 48 | 25 % | 50 % | 60 % | [HYPOTHÈSE] |
| Consommables | ≈ 265 FCFA/kg | ≈ 230 FCFA/kg | ≈ 175 FCFA/kg | électricité [FAIT] (CRSE 2026) ; le reste [HYPOTHÈSE] |
| Personnel | 4 salariés au démarrage, 6 en croisière, + 4 en 2e équipe, + 1 chauffeur au-delà de 350 à 400 kg/jour | | | [HYPOTHÈSE] |
| Charges sociales + CFCE | 25 % | 22 % | 21 % | [ESTIMATION] (CLEISS 2026) |
| Délai de paiement des clients | 60 jours | 45 jours | 30 jours | [HYPOTHÈSE] |
| Impôts | IS 30 % ; minimum forfaitaire de 0,5 % du CA (plancher 500 000 FCFA) | | | [FAIT] CGI 2012, **À VÉRIFIER** dans le CGI 2025 |
| Salaire du gérant | **0** | | | choix du porteur |

**Épargne** (onglet Epargne) :
- 10 M FCFA aujourd'hui ;
- 500 €/mois jusqu'en décembre 2027, puis 1 000 €/mois [HYPOTHÈSE sur la
  date] ;
- moins les voyages (2 + 1,5 + 2 M FCFA) et le déménagement (2,5 M) ;
- soit **≈ 28,6 M FCFA en septembre 2030**. On garde une **réserve
  personnelle de 12 mois × 350 000 FCFA** pour vivre sans salaire
  [HYPOTHÈSE à adapter à ta situation familiale]. Restent **≈ 24,4 M FCFA
  (≈ 37 000 €) mobilisables pour Setal Pro**.

---

## 4. Résultats du scénario central (version frugale)

| | Année 1 | Année 2 | Année 3 | Année 4 | Année 5 |
|---|---|---|---|---|---|
| Volume moyen (kg/jour) | 138 | 290 | 352 | 422 | 482 |
| Chiffre d'affaires (M FCFA) | 31,3 | 70,2 | 90,8 | 115,6 | 135,5 |
| EBE (M FCFA) | – 7,9 | 19,4 | 30,5 | 40,1 | 54,0 |
| Résultat net (M FCFA) | – 15,5 | 11,8 | 17,2 | 22,9 | 32,5 |
| Trésorerie de fin d'année après apport (M FCFA) | – 35,7 | – 21,6 | 3,8 | 26,6 | 68,1 |
| Point mort (kg/jour) | 169 | 173 | 183 | 214 | 211 |

La trésorerie est négative en années 1 et 2 : c'est l'écart à financer.

**Lecture :**
- L'EBE devient positif dès que le volume dépasse environ 170 kg/jour,
  c'est-à-dire environ 10 à 12 clients moyens.
- Le creux de trésorerie est atteint en **octobre 2031** (mois 13), quand
  se cumulent les pertes de démarrage, le BFR et le premier impôt minimum.
- Ensuite, la société génère environ 1,5 à 4,5 M FCFA de trésorerie par
  mois. **Elle pourrait commencer à rembourser ton compte courant
  d'associé vers l'année 3 ou 4**, ce qui est cohérent avec ton horizon
  « pas de salaire avant ~4 ans ».

**Prudence sur le scénario optimiste :** sa marge d'EBE dépasse 60 % à
partir de l'année 3 (contre ≈ 35 % pour Elis). Il suppose à la fois des
prix hauts, des machines pleines en 2 équipes et des coûts bas. Prends-le
comme une **borne haute**, pas comme un objectif.

---

## 5. Sensibilités clés

Ordres de grandeur tirés des écarts entre scénarios. Pour des
sensibilités précises, modifier une seule hypothèse à la fois dans la
colonne « Central ».

| Si… (une seule hypothèse modifiée) | Besoin de financement | Écart avec l'épargne | Point mort (années 1 → 5) |
|---|---|---|---|
| **Scénario central (référence)** | 60,4 M | – 43,3 M | 169 → 211 kg/jour |
| Prix d'entretien à 550 FCFA/kg au lieu de 700 | 66,8 M | – 49,6 M | **235 → 239 kg/jour** |
| Montée en charge en 24 mois au lieu de 18 | 62,1 M | – 44,9 M | 166 → 211 kg/jour |
| Clients payant à 60 jours au lieu de 45 | 62,7 M | – 45,5 M | inchangé |
| Investissement en version standard (85 M) | **100,5 M** | **– 83,7 M** | 178 → 218 kg/jour |

**Lecture :**
- **Le prix est le paramètre le plus sensible pour la rentabilité.** À
  550 FCFA/kg, il faut environ 40 % de volume en plus pour être à
  l'équilibre.
- **Le niveau d'investissement est le paramètre le plus sensible pour le
  financement.**
- Le scénario pessimiste cumule plusieurs facteurs défavorables (prix bas,
  volumes faibles, coûts hauts) : c'est ce cumul qui le rend non viable.

---

## 6. Comment combler l'écart : leviers, du moins risqué au plus risqué

| Levier | Effet estimé sur l'écart central (– 43 M) | Conditions et risques |
|---|---|---|
| **1. Investissement frugal poussé plus loin** : 2 laveuses au départ, calandre d'occasion, tricycle cargo au lieu d'un fourgon | 5 à 10 M | Moins de redondance ; risque de panne |
| **2. Crédit-bail (leasing) sur les machines et le véhicule** | 10 à 20 M | Suppose un dossier solide (lettres d'intention, apport) ; offres de leasing au Sénégal **À VÉRIFIER** |
| **3. Apports de la famille en compte courant d'associé**, cohérents avec le projet d'entreprise familiale | Variable | Convention écrite, remboursement planifié |
| **4. Prêt bancaire ou dispositif public** (fonds de garantie FONGIP, Délégation à l'entrepreneuriat rapide, financements de la diaspora) | 10 à 30 M | Relation bancaire à construire dès 2027 ; dispositifs **À VÉRIFIER** |
| **5. Réduire le BFR** : dépôt de garantie sur le linge loué, paiement à 30 jours, mobile money | 2 à 5 M | Négociation commerciale |
| **6. Augmenter l'épargne** (par exemple +500 €/mois dès 2027) | ≈ 15 M sur 4 ans | Dépend de tes revenus |
| **7. Ouvrir plus tard** (2031 ou 2032) | 8 M par an à 1 000 €/mois | Retarde le projet ; le marché peut évoluer |

**Recommandation [HYPOTHÈSE] :**
- combiner les leviers **1, 2, 5 et 6** ;
- préparer **4** (prêt) dès 2027 en ouvrant un compte au Sénégal et en
  présentant le projet à une banque au voyage 2 ;
- objectif : réduire l'écart central à moins de 10 M FCFA à fin 2029,
  puis le combler par un prêt ou un apport familial.

---

## 7. Limites du modèle

- Aucun prix réel : **les résultats dépendent avant tout de l'hypothèse de
  prix au kg**. À mettre à jour dès le premier entretien terrain.
- TVA non modélisée. Années d'exploitation décalées par rapport aux
  exercices civils.
- La croissance au-delà de 2 équipes ne déclenche pas d'investissement
  supplémentaire (4e machine) dans l'horizon des 5 ans.
- Pas d'inflation des prix ni des salaires.
- Le gérant n'est pas payé, mais sa subsistance est provisionnée dans
  l'onglet Epargne (réserve de 12 mois).

---

## 8. Choix par défaut et points à confirmer

**Choix retenus par défaut** (mode autonome) :
- version d'investissement frugale ;
- passage à 1 000 €/mois d'épargne en janvier 2028 ;
- réserve personnelle de 12 mois à 350 000 FCFA ;
- coussin de sécurité de 3 mois de charges fixes.

**À me confirmer :**
1. La date réaliste du passage à 1 000 €/mois.
2. Tes besoins personnels mensuels à Dakar (famille ?).
3. Es-tu ouvert à un **crédit-bail ou à un prêt bancaire** une fois
   l'activité prouvée ? Ou à des apports familiaux ? Sans l'un de ces
   leviers, le plan n'est pas finançable à fin 2030 dans le scénario
   central.
