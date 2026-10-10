# 06 — Opérations

> Phase 6 — statut : **rédigée en autonomie** (10/10/2026), à relire par
> Ahmadou.
>
> Légende : **[FAIT]** sourcé · **[HYPOTHÈSE]** · **[ESTIMATION]** · **À VÉRIFIER**.
>
> Les paramètres chiffrés de ce document sont repris tels quels dans le
> modèle financier (`finance/modele.xlsx`, onglet « Hypothèses »).

---

## 1. En bref

1. **« 3 machines » doit se lire « 3 laveuses-essoreuses ».** Une
   blanchisserie a aussi besoin de **séchoirs** et d'une **repasseuse à
   rouleaux** (calandre). C'est la calandre qui fixe la capacité réelle pour
   le linge plat.
2. **Capacité : environ 300 kg/jour en 1 équipe et 600 kg/jour en 2
   équipes** [ESTIMATION]. On démarre en 1 équipe ; on ajoute une 2e
   équipe avant d'acheter une 4e machine (c'est le principe lean : mieux
   utiliser l'existant avant d'investir).
3. **L'électricité est le premier coût variable** : environ 60 % des
   consommables par kg [ESTIMATION]. Chauffer les séchoirs et la calandre
   **au gaz** plutôt qu'à l'électricité réduit fortement la facture
   (**À VÉRIFIER** : prix et disponibilité du gaz pour un usage
   professionnel).
4. **Continuité de service :** un groupe électrogène et une cuve d'eau de
   10 m³ (environ 3 jours d'autonomie). Les coupures ont baissé de 511 en
   2023 à 312 en 2024, mais elles sont revenues en septembre 2026 [S4].
5. **Le local** : 150 à 250 m², en zone d'activités, avec du courant
   triphasé, un raccordement à l'eau et à l'assainissement, et une
   séparation entre la zone « sale » et la zone « propre ».
6. **Personnel au régime de croisière : 6 salariés**, plus toi comme
   gérant.
7. **Investissement de départ ≈ 80 M FCFA** en version standard, ou
   **≈ 50 M FCFA** en version frugale (machines d'occasion, véhicule
   d'occasion, groupe plus petit) [ESTIMATION, détail en §9]. **C'est
   nettement plus que ton épargne projetée** : voir la phase 7.

---

## 2. Process : le flux du linge (marche en avant)

```
 CLIENT                         ATELIER SETAL PRO                                  CLIENT
┌──────────┐   ┌──────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Collecte │──►│Réception │►│  Tri   │►│ Lavage │►│Séchage │►│Repassage │►│ Contrôle │►│Livraison │
│ comptage │   │  pesée   │ │par type│ │        │ │        │ │ ou pliage│ │condition-│ │ comptage │
│ contra-  │   │ (zone    │ │ client │ │        │ │        │ │ (calandre│ │ nement   │ │ bon signé│
│ dictoire │   │  SALE)   │ │programme│ │        │ │        │ │  / table)│ │(zone     │ │          │
└──────────┘   └──────────┘ └────────┘ └────────┘ └────────┘ └──────────┘ │ PROPRE)  │ └──────────┘
                                                                           └──────────┘
        ◄────────── zone sale ──────────►  │cloison│  ◄──────────── zone propre ────────────►
```

| Étape | Standard (à écrire en fiche de poste) | Point de contrôle |
|---|---|---|
| Collecte | Sacs de couleur : **blanc** = linge plat, **bleu** = vêtements, **rouge** = linge contaminé (clinique). Comptage devant le client, bon signé (papier ou application) | Écart entre le compte du client et celui de Setal Pro |
| Réception | Pesée par client ; étiquette de lot (client, date, type) | kg reçus, comparés au contrat |
| Tri | Par client, par type de linge, par degré de salissure et par couleur. Pièces abîmées mises de côté (clause de remplacement) | Pièces hors d'usage signalées |
| Lavage | Programme standard par type : température, durée, produits. Le linge contaminé est lavé **sans être déballé** (sac hydrosoluble) dans la machine dédiée | Enregistrement du cycle (n° de programme, heure) |
| Séchage | Séchoir au gaz ; linge plat **pré-séché** puis passé humide à la calandre | Taux d'humidité, absence de surchauffe |
| Repassage ou pliage | Calandre pour le linge plat ; pliage manuel pour les éponges et les vêtements | Pièces repassées par heure |
| Contrôle | Contrôle visuel de 100 % des pièces : taches, trous, pliage ; retour au lavage si défaut | Taux de reprise (objectif ≤ 2 %) |
| Conditionnement | Paquets par client et par type ; filmés ou mis en sac propre ; étiquette | Exactitude de la préparation |
| Livraison | Tournée planifiée, créneau fixe, comptage, bon signé | Ponctualité (objectif ≥ 98 %) |

**Hygiène (inspirée de la méthode RABC, norme EN 14065)** : le linge propre
ne croise jamais le linge sale. Il y a une entrée « sale », une sortie
« propre », un lavage des mains et un changement de blouse entre les deux
zones, et un nettoyage quotidien. Les chariots sont de couleurs
différentes selon la zone.

---

## 3. Équipements et capacité

### 3.1 Configuration proposée [HYPOTHÈSE]

| Équipement | Proposition | Rôle |
|---|---|---|
| Laveuse-essoreuse n°1 | 25 kg, super-essorage | gros volumes de linge plat |
| Laveuse-essoreuse n°2 | 20 kg, super-essorage | linge plat et éponges |
| Laveuse-essoreuse n°3 | 12 kg | petits lots, vêtements, **linge contaminé** (machine dédiée), dépannage si une autre machine tombe en panne |
| Séchoirs | 2 × 25 kg, chauffage au gaz | éponges, vêtements, pré-séchage |
| Calandre-sécheuse | rouleau de 2,5 m, chauffage au gaz | draps, housses, nappes |
| Annexes | adoucisseur d'eau (dureté **À VÉRIFIER**), cuve de 10 m³ et surpresseur, dosage automatique des lessives, balance, chariots, tables de pliage, rayonnages | — |

Trois tailles de machines plutôt que trois machines identiques : on
gagne en flexibilité (petits lots sans gaspillage) et en **redondance**
(une panne n'arrête pas tout). C'est important quand les pièces détachées
peuvent mettre des semaines à arriver.

### 3.2 Calcul de capacité [ESTIMATION]

| Poste | Hypothèse | Capacité pour 7,5 h productives |
|---|---|---|
| **Lavage** | 57 kg nominaux × 80 % de remplissage = 45,6 kg par tour ; cycle de 60 min avec chargement ; 7 tours | **≈ 320 kg/jour** |
| **Séchage** | 2 × 25 kg × 80 % = 40 kg par cycle de 50 min ; 9 cycles. Seuls environ 40 % du linge passent au séchoir (le reste va humide à la calandre) | ≈ 360 kg/jour de capacité pour ≈ 130 kg/jour de besoin : **non limitant** |
| **Calandre** | 40 à 50 kg/h [HYPOTHÈSE à confirmer auprès du fabricant] ; environ 60 % du volume est du linge plat | 300 à 375 kg de linge plat par jour (40 à 50 kg/h × 7,5 h), ce qui couvre un volume total d'environ 500 à 620 kg/jour : **non limitant en 1 équipe** |
| **Pliage et contrôle** | ≈ 50 kg par personne et par heure [HYPOTHÈSE] | 2 personnes : ≈ 750 kg/jour |
| **Goulot en 1 équipe** | **le lavage** | **≈ 300 à 320 kg/jour** |
| **En 2 équipes** (15 h) | lavage × 2 | **≈ 600 kg/jour** |

**Takt time** (le rythme imposé par la demande) au volume cible de
300 kg/jour : 300 kg ÷ 7,5 h = **40 kg/h**. Chaque poste doit tenir ce
rythme, sinon il devient le goulot.

**Règle de décision :**
- au-delà de **85 % de charge** pendant 2 mois en 1 équipe, ouvrir une 2e
  équipe ;
- au-delà de 85 % en 2 équipes, investir dans une 4e laveuse (plus de
  500 kg/jour).

---

## 4. Énergie, eau et consommables

| Poste | Hypothèse par kg de linge | Prix unitaire | Coût par kg |
|---|---|---|---|
| **Eau** | 10 L/kg ; les machines traditionnelles consomment 9 à 12 L/kg [S6] | ≈ 850 FCFA/m³ : tranche haute de SEN'EAU pour les ménages, entre 779 et 878 FCFA/m³ selon la zone [S3]. Tarif non domestique **À VÉRIFIER** | **≈ 9 FCFA** |
| **Électricité** (moteurs, chauffage de l'eau de lavage, éclairage) | 0,6 kWh/kg [HYPOTHÈSE, chauffage des séchoirs et de la calandre au gaz] | **≈ 210 FCFA/kWh** : tarif professionnel basse tension, 3e tranche = 208,63 FCFA/kWh hors taxes depuis le 1er janvier 2026 [S1][S2] | **≈ 126 FCFA** |
| **Gaz** (séchoirs, calandre) | ≈ 0,08 kg de gaz par kg de linge [HYPOTHÈSE] | prix du gaz butane professionnel **À VÉRIFIER** ; hypothèse de 650 FCFA/kg | **≈ 50 FCFA** |
| **Lessives et produits** | dosage automatique | [HYPOTHÈSE] | **≈ 30 FCFA** |
| **Emballages** (film, sacs, étiquettes) | — | [HYPOTHÈSE] | **≈ 10 FCFA** |
| **Groupe électrogène** (surcoût pendant les coupures) | 5 % des kWh produits par le groupe, surcoût de 50 % | [HYPOTHÈSE] | **≈ 3 FCFA** |
| **Total des consommables** | | | **≈ 230 FCFA/kg** [ESTIMATION] |

**Moyenne tension :** le tarif général moyenne tension (111,91 FCFA/kWh
hors pointe [S2]) est moins cher, mais il demande un poste de
transformation et une prime fixe par kW. Il ne devient intéressant
qu'à fort volume. **À étudier en année 3 ou plus.**

**Pistes lean pour réduire ces coûts :**
- récupérer l'eau du dernier rinçage pour le prélavage suivant (gain
  possible de 20 à 30 % d'eau, [HYPOTHÈSE]) ;
- installer un chauffe-eau solaire pour préchauffer l'eau de lavage, car
  l'ensoleillement de Dakar est un atout [HYPOTHÈSE] ;
- toujours charger les machines à plus de 80 %.

---

## 5. Continuité de service : eau et électricité

| Risque | Parade | Dimensionnement [HYPOTHÈSE] |
|---|---|---|
| Coupure d'électricité (fréquente selon les périodes [S4]) | Groupe électrogène avec inverseur automatique | ≈ 60 kVA (laveuses, éclairage, ventilation des séchoirs, calandre) ; à affiner selon les fiches techniques |
| Coupure ou baisse de pression d'eau | Cuve tampon et surpresseur | 10 m³, soit environ 3 jours à 300 kg/jour |
| Panne d'une machine | 3 tailles de machines (redondance) ; contrat de maintenance ; **stock de pièces critiques** (courroies, joints, électrovannes, cartes) | Budget pièces détachées : 1 à 2 % de l'investissement par an |
| Retard client lié à une coupure | Stock tampon chez le client (dotation de 3 à 4 jeux) | Phase 4 |

---

## 6. Traitement des eaux usées

Les eaux de blanchisserie contiennent des lessives (tensioactifs,
phosphates), des fibres et un pH élevé. Les obligations sont listées en
phase 5 : norme NS 05-061, Code de l'assainissement.

**Chaîne minimale proposée** [HYPOTHÈSE, à valider avec la DEEC et
l'ONAS] :
1. Filtre à fibres en sortie des machines.
2. Fosse de dégrillage et de décantation (3 à 5 m³).
3. Neutralisation du pH.
4. Regard de prélèvement pour les contrôles.
5. Rejet vers le réseau de l'ONAS, ou vers une installation autonome si la
   zone n'est pas raccordée.

Budget : ≈ 2 M FCFA [HYPOTHÈSE]. Choisir des **lessives sans phosphates**
pour réduire la charge polluante.

---

## 7. Choix du local et de la zone

### 7.1 Cahier des charges du local

| Critère | Exigence |
|---|---|
| Surface | 150 à 250 m² au sol (atelier ≈ 120 m², stock de linge propre, bureau, vestiaires, sanitaires) |
| Électricité | **triphasé**, puissance souscrite de ≈ 40 à 60 kVA (**À VÉRIFIER** avec la Senelec) |
| Eau | raccordement au réseau SEN'EAU, avec un débit suffisant ; un forage est une option (**autorisation À VÉRIFIER**) |
| Assainissement | raccordement au réseau de l'ONAS de préférence |
| Accès | stationnement et chargement d'un fourgon ; hors des rues inondables pendant l'hivernage (la saison des pluies) |
| Statut | zone d'activités ou zone mixte autorisant une activité artisanale ou industrielle légère ; à plus de 500 m de lieux sensibles si l'installation est classée en 1re classe (phase 5) |
| Loyer | **≈ 1 500 à 3 000 FCFA/m²/mois** [HYPOTHÈSE : aucune donnée publique trouvée pour les locaux d'activité] |

### 7.2 Zones candidates [HYPOTHÈSE, à départager avec le terrain]

| Zone | Avantages | Inconvénients |
|---|---|---|
| **Hann, Bel-Air, zone industrielle (Dakar)** | centrale ; zone d'activités ; proche du Plateau, de Fann et de Mermoz ; industrie à proximité | loyers ? ; circulation sur la VDN et la route de Rufisque |
| **Yoff, Grand Yoff, Ngor-Ouest Foire** | proche du pôle hôtelier des Almadies, de Ngor et de Yoff | zone surtout résidentielle : vérifier que l'activité y est autorisée |
| **Pikine, Thiaroye, Keur Massar** | loyers a priori plus bas ; proche des cliniques de banlieue | loin des hôtels ; inondations |
| **Diamniadio, Sébikotane** | zones économiques spéciales ; nouveaux hôtels ; industrie | à 30-40 km de Dakar : 1 h de trajet ou plus aux heures de pointe pour servir Dakar |

**Méthode de choix** (au voyage 2) : on place sur une carte les clients
ayant signé une lettre d'intention, pondérés par leurs kg/jour. On calcule
le **barycentre** de la grappe, puis on mesure les temps de trajet réels
aux heures de tournée. On choisit le local qui **minimise le temps de
tournée pondéré** parmi les locaux conformes au cahier des charges.

---

## 8. Logistique et traçabilité

### 8.1 Tournées [HYPOTHÈSE]

- **1 fourgon utilitaire** (environ 10 à 12 m³), d'occasion récente, avec
  un chauffeur-livreur.
- **2 tournées par jour** : matin de 6 h 30 à 10 h 30, pour livrer les
  hôtels avant les départs des clients et collecter le linge sale ; après-midi
  de 14 h à 17 h, pour les cliniques et les restaurants.
- Capacité d'environ 600 à 800 kg de linge par tournée en volume : **non
  limitant** à 300 kg/jour. Le facteur limitant est **le temps de trajet**.
- **Heijunka** (lissage de la charge) : répartir les collectes sur 6 jours
  pour lisser la charge de l'atelier (éviter le pic du lundi).

### 8.2 Traçabilité en 2 temps

| Étape | Outil | Ce que l'on trace |
|---|---|---|
| **An 1-2** (linge du client surtout) | Marquage par client (étiquette thermocollée avec un code), bons de collecte et de livraison sur une application mobile ou un tableur partagé, pesée par lot | kg et pièces par client et par jour ; écarts ; délais ; défauts |
| **An 3 et plus** (parc en location supérieur à environ 5 000 pièces [HYPOTHÈSE]) | **Puces RFID UHF** cousues dans le linge Setal Pro, lecture en tunnel à l'entrée et à la sortie | Nombre de lavages par pièce (durée de vie réelle) ; pertes par client ; inventaire automatique |

Le passage au RFID sera décidé avec un **calcul de retour sur
investissement** : coût des puces et des lecteurs, comparé aux pertes
évitées et au temps de comptage gagné.

---

## 9. Investissements de départ [ESTIMATION]

Prix observés en France et en Chine (hors transport et droits de douane)
convertis en FCFA, sinon hypothèses. **Tous à confirmer par des devis**
(fournisseurs de Dakar et fabricants européens, au voyage 2).

| Poste | Version standard (FCFA) | Version frugale (FCFA) | Base |
|---|---|---|---|
| 3 laveuses-essoreuses (25 + 20 + 12 kg) | 15 000 000 | 7 000 000 | Laveuse industrielle de 25 kg fabriquée en Chine : 2 250 à 5 800 $ en prix de gros [S7] ; marque européenne neuve : hypothèse. Frugal : machines d'occasion reconditionnées ou chinoises |
| 2 séchoirs de 25 kg au gaz | 9 600 000 | 4 800 000 | Séchoir professionnel de 25 kg ≈ 7 300 € en France [S8] ; frugal : 1 séchoir |
| Calandre-sécheuse de 2,5 m | 11 000 000 | 6 000 000 | [HYPOTHÈSE] ; frugal : occasion |
| Transport, dédouanement, installation | 9 000 000 | 4 500 000 | ≈ 25 % du prix des machines [HYPOTHÈSE] ; réductible avec l'agrément au Code des investissements (phase 5) |
| Groupe électrogène et inverseur | 8 000 000 | 5 000 000 | [HYPOTHÈSE] 60 kVA ; frugal : 40 kVA d'occasion |
| Cuve d'eau, surpresseur, adoucisseur | 2 500 000 | 1 500 000 | [HYPOTHÈSE] |
| Prétraitement des eaux | 2 000 000 | 1 500 000 | [HYPOTHÈSE] |
| Aménagement du local (électricité triphasée, plomberie, sols, cloison) | 8 000 000 | 5 000 000 | [HYPOTHÈSE] |
| Chariots, tables, rayonnages, balance | 2 500 000 | 1 500 000 | [HYPOTHÈSE] |
| Véhicule utilitaire | 12 000 000 | 6 000 000 | [HYPOTHÈSE] occasion ; frugal : plus ancien, ou tricycle cargo au départ |
| Informatique, téléphones, étiqueteuse, logiciel | 1 500 000 | 800 000 | [HYPOTHÈSE] |
| Dépôt de garantie du local (3 mois) | 1 350 000 | 1 050 000 | 200 m² × 2 250 FCFA × 3 (standard) ; 175 m² × 2 000 FCFA × 3 (frugal) |
| Création, études, environnement, conseil | 2 500 000 | 1 800 000 | phase 5 |
| **Total** | **≈ 85 M FCFA** | **≈ 46 M FCFA** | |

**À ajouter :**
- le **stock de linge** pour la location (progressif grâce à la clause de
  remplacement) ;
- le **BFR** (l'argent immobilisé entre les dépenses et l'encaissement des
  factures) ;
- les **pertes des premiers mois**.

Ces trois postes sont calculés dans le modèle financier (phase 7).

---

## 10. Personnel

| Poste | An 1 (montée en charge) | Croisière (≈ 300 kg/jour, 1 équipe) | Salaire brut mensuel [HYPOTHÈSE] |
|---|---|---|---|
| Gérant (toi) : commercial, méthodes, finances | 1 | 1 | **0** (pas de salaire avant ~4 ans) |
| Chef d'atelier, polyvalent sur toutes les machines | 1 | 1 | 200 000 FCFA |
| Opérateurs de lavage et de séchage | 1 | 1 | 110 000 FCFA |
| Opérateurs calandre, pliage, contrôle | 1 | 2 | 100 000 FCFA |
| Réception, tri, préparation | 0 (fait par les autres) | 1 | 100 000 FCFA |
| Chauffeur-livreur | 1 | 1 | 130 000 FCFA |
| **Total des salariés** | **4** | **6** | |

Les salaires sont des hypothèses : le salaire minimum est d'environ
75 000 FCFA (**À VÉRIFIER**), et la convention collective est à vérifier
(phase 5). Charges sociales et CFCE : **+22 %** (phase 5).

**Productivité cible** : 300 kg ÷ 6 personnes ≈ **50 kg par salarié et
par jour**, à suivre chaque mois.

---

## 11. Lean et amélioration continue : le système de management

| Outil | Application chez Setal Pro |
|---|---|
| **VSM** (cartographie du flux de valeur) | Avant le démarrage, sur le flux type d'un hôtel : identifier les attentes, les stocks et les allers-retours |
| **5S** (trier, ranger, nettoyer, standardiser, maintenir) | Dès l'aménagement : zones peintes au sol, chariots à emplacements fixes, tableaux d'ombres pour les outils |
| **Standards de travail** | Fiches visuelles par poste (programmes de lavage, pliage, contrôle) en français et en wolof, avec photos |
| **Poka-yoke** (détrompeurs) | Sacs et chariots de couleur ; machine dédiée au linge contaminé ; programmes verrouillés par type de linge |
| **TPM** (maintenance productive) | Entretien quotidien par l'opérateur (nettoyage des filtres, contrôle des joints), maintenance préventive mensuelle, suivi des pannes |
| **Kanban** | Stock tampon chez chaque client ; réapprovisionnement de la tournée selon le niveau constaté |
| **Heijunka** | Lissage des collectes sur 6 jours |
| **Management visuel et PDCA** | Réunion de 10 minutes chaque jour devant un tableau d'indicateurs ; revue hebdomadaire des écarts ; un chantier d'amélioration par mois |

**Tableau d'indicateurs (revu chaque jour et chaque semaine)**

| Indicateur | Cible |
|---|---|
| kg traités par jour / capacité | 70 à 85 % |
| Ponctualité des livraisons | ≥ 98 % |
| Taux de reprise (défauts) | ≤ 2 % |
| Écarts de comptage, pertes | ≤ 0,5 % des pièces |
| kWh, L d'eau et kg de gaz par kg de linge | ≤ 0,6 kWh / 10 L / 0,08 kg |
| kg par salarié et par jour | ≥ 50 |
| Pannes : heures d'arrêt par mois | < 4 h |
| Réclamations clients | < 2 par mois |
| Délai moyen de paiement des clients | ≤ 45 jours |

---

## 12. Hypothèses et points à confirmer

**Choix par défaut** (mode autonome) :
- 3 laveuses de tailles différentes, 2 séchoirs au gaz et 1 calandre ;
- 1 équipe au démarrage ;
- 1 fourgon ;
- 6 salariés en croisière ;
- version frugale de l'investissement retenue comme **scénario de base du
  financement** : voir la phase 7.

**À vérifier en priorité** (voyages 1 et 2) :
1. Devis de machines : distributeurs de Dakar (service après-vente,
   pièces) et fabricants européens ou chinois. Comparer le **coût total de
   possession** (prix + pannes + pièces), pas seulement le prix d'achat.
2. Prix et disponibilité du gaz professionnel ; puissance électrique
   triphasée disponible dans la zone.
3. Tarif non domestique de SEN'EAU ; dureté de l'eau de Dakar.
4. Loyers des locaux d'activité dans les 4 zones candidates.
5. Salaires du marché pour des opérateurs de blanchisserie (offres
   d'emploi, IWASH, hôtels).

---

## 13. Sources

| # | Source | Lien | Consultée le |
|---|---|---|---|
| S1 | Le Soleil, AllAfrica — baisse des tarifs d'électricité au 1er janvier 2026 | https://lesoleil.sn/actualites/economie/energie-baisse-des-tarifs-delectricite-des-le-1er-janvier-2026/ · https://fr.allafrica.com/stories/202601010064.html | 10/10/2026 |
| S2 | CRSE (le régulateur) — grilles tarifaires de la Senelec applicables au 1er janvier 2026 (décision n° 2025-140) | https://www.crse.sn/wp-content/uploads/2025/12/Grilles-tarifaires-Senelec-et-CER-applicables-a-compter-du-1er-janvier-2026.pdf | 10/10/2026 |
| S3 | SNV / pS-Eau — état des lieux de la tarification de l'eau au Sénégal (2020) ; Senego — audit de la facturation de SEN'EAU | https://www.pseau.org/outils/ouvrages/snv_rapport_d_etat_des_lieux_en_vue_de_l_elaboration_du_plaidoyer_pour_une_tarification_de_l_eau_transparente_juste_et_equitable_2020.pdf · https://senego.com/sen-eau-la-sones-audite-le-systeme-de-facturation_1412369.html | 10/10/2026 |
| S4 | Le360 — retour des coupures d'électricité (09/2026) ; AllAfrica — postes haute tension à Dakar (02/2026) | https://afrique.le360.ma/societe/senegal-revoila-les-coupures-delectricite-que-lon-pensait-eteintes-a-jamais_D2XQ6W2ETRHX3LST62JVPJGC7Q/ · https://fr.allafrica.com/stories/202602050188.html | 10/10/2026 |
| S5 | Ecolab — répartition type des coûts d'une buanderie (main-d'œuvre ≈ 50 %, linge ≈ 20 %, énergie et eau ≈ 10 %, lessives ≈ 5 %) | https://en-fr.ecolab.com/-/media/Widen/Institutional/On-Premise-Laundry/AQUANOMIC_Brochure_FR_FR_pdf.pdf | 10/10/2026 |
| S6 | Electrolux Professional — 9 à 12 L d'eau par kg pour une machine traditionnelle | https://www.electroluxprofessional.com/fr/blanchisserie-plus-durable/ | 10/10/2026 |
| S7 | Accio — prix de gros des laveuses industrielles de 25 kg | https://fr.accio.com/plp/industrial-wash-machine-25-kg | 10/10/2026 |
| S8 | Hellopro — prix des séchoirs professionnels (25 kg ≈ 7 300 €) | https://conseils.hellopro.fr/combien-coute-une-machine-de-laverie-automatique-5669.html | 10/10/2026 |
| S9 | ARS PACA — fiche sur la blanchisserie (hygiène, marche en avant) | https://paca.ars.sante.fr/system/files/2024-07/Blanchisserie.pdf | 10/10/2026 |
