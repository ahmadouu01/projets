# PHASE 1 — Synthèse du cadrage et recommandation

Basé sur le profil `profil-porteur-P0.md` (hypothèse de travail à corriger).
Repère de conversion utilisé partout : **1 € = 655,957 FCFA** (parité fixe EUR/XOF).

---

## 1. Verdict de cadrage

**Le modèle Elis n'est pas accessible avec ce profil, et ne le sera pas avant plusieurs années.**

Elis repose sur trois choses que le profil P0 ne possède pas :

| Pilier du modèle Elis | Ce qu'il exige | Situation P0 |
|---|---|---|
| Posséder le linge et le louer | Immobiliser des dizaines de M FCFA en stock textile, renouvelé en permanence | Apport total ≈ 6 M FCFA |
| Une usine à haut taux d'utilisation | CAPEX industriel, eau, vapeur, maintenance, main-d'œuvre encadrée | Aucune compétence industrielle |
| Un portefeuille de contrats pluriannuels | Force de vente B2B, références, capacité à répondre à des appels d'offres | Aucun réseau, aucune référence |

Ce n'est **pas** une raison d'abandonner. C'est une raison de **changer l'ordre des étapes** :
on ne commence pas par l'usine, on commence par le carnet de clients — qui est l'actif rare,
et le seul que l'on puisse construire sans capital.

## 2. L'échelle réaliste

| Étage | Contenu | Enveloppe [HYPOTHÈSE] | Ce qu'il apporte | Condition de passage à l'étage suivant |
|---|---|---|---|---|
| **0 — Apprentissage** | Travailler ou observer dans une lingerie d'hôtel / une blanchisserie existante. Réaliser 25-30 entretiens clients. Aucune structure créée | ~0 (temps, 3-6 mois) | Comprendre le métier, connaître les prix réels, se constituer un réseau | 25+ entretiens faits, prix de marché connus |
| **1 — Opérateur de service sans usine** ⭐ | Vendre le service (collecte, lavage, livraison, garantie de délai), **sous-traiter le lavage** à une blanchisserie existante | **3-8 M FCFA** | Vrais clients, vrai CA, volumes mesurés, apprentissage du métier payé par le marché | 6-10 clients récurrents, marge brute prouvée, tonnage connu |
| **2 — Micro-atelier** | Internaliser le lavage : 2-3 laveuses pro 15-25 kg, séchoirs, finition | **25-60 M FCFA** | Maîtrise du coût/kg et de la qualité, marge multipliée | Atelier saturé, clients en attente |
| **3 — Petite unité industrielle** | Tunnel ou parc de laveuses, calandre, chaudière, traitement d'eau, flotte | **100-250 M FCFA** | Coût/kg compétitif, capacité de servir les gros comptes | Financement bancaire obtenu sur 2-3 ans de comptes |
| **4 — Location-entretien (modèle Elis)** | Le linge vous appartient, le client loue | Stock textile en plus du reste | Récurrence, rétention, barrière à l'entrée | Trésorerie capable d'absorber le BFR |

**L'étage 1 est le seul point d'entrée cohérent avec le profil P0.** Les étages 2 à 4 ne
sont pas des promesses, ce sont des portes qui s'ouvrent uniquement si l'étage précédent
est validé par des chiffres.

## 3. Économie de l'étage 1 — modèle paramétrique

Aucun prix de marché sénégalais n'est vérifié à ce stade. Le modèle est donc écrit en
variables, à remplir en PHASE 6 (terrain).

```
P = prix facturé au client            (FCFA/kg)   [DONNÉE À VÉRIFIER — M-004]
C = coût de sous-traitance du lavage  (FCFA/kg)   [DONNÉE À VÉRIFIER — M-009]
m = P - C = marge brute unitaire      (FCFA/kg)
F = charges fixes mensuelles          (FCFA/mois)

Volume d'équilibre  =  F / m   (kg/mois)
```

### Charges fixes mensuelles de l'étage 1 — [HYPOTHÈSE DE TRAVAIL]

| Poste | Fourchette (FCFA/mois) |
|---|---|
| Carburant + entretien véhicule | 120 000 – 250 000 |
| Assurance véhicule | 15 000 – 30 000 |
| Téléphone / internet / outils | 20 000 – 40 000 |
| Comptabilité | 40 000 – 80 000 |
| Consommables (sacs, housses, étiquettes) | 30 000 – 60 000 |
| Prélèvement minimal du porteur | 200 000 – 350 000 |
| Divers / imprévus | 50 000 – 100 000 |
| **Total F** | **475 000 – 910 000** |

### Lecture du seuil

| Si marge brute m = | 100 F/kg | 200 F/kg | 300 F/kg |
|---|---|---|---|
| Volume d'équilibre à F = 500 000 | 5 000 kg/mois | 2 500 kg/mois | 1 667 kg/mois |
| Volume d'équilibre à F = 900 000 | 9 000 kg/mois | 4 500 kg/mois | 3 000 kg/mois |

### Ordre de grandeur d'un client hôtelier — [HYPOTHÈSE DE TRAVAIL]

Ratio usuel du secteur : **3 à 6 kg de linge par nuitée occupée** (draps, taies, serviettes,
tapis de bain). *Règle de métier internationale, à confirmer sur le terrain sénégalais.*

> Hôtel de 30 chambres à 60 % d'occupation
> = 30 × 0,60 × 30 jours = **540 nuitées/mois** × 5 kg ≈ **2 700 kg/mois**

**Conclusion provisoire : un seul hôtel moyen bien géré peut suffire à atteindre l'équilibre
de l'étage 1.** C'est ce qui rend cet étage crédible — et c'est aussi ce qui rend la
dépendance à un client unique dangereuse (risque R-005).

### CAPEX de démarrage de l'étage 1 — [HYPOTHÈSE DE TRAVAIL]

| Poste | Option économe | Option confortable | Classement |
|---|---|---|---|
| Moyen de transport | Tricycle motorisé ou location mensuelle : 1 000 000 – 1 500 000 | Fourgon d'occasion : 2 500 000 – 4 500 000 | INDISPENSABLE |
| Bacs, sacs, housses, chariot | 250 000 | 500 000 | INDISPENSABLE |
| Balance homologuée | 80 000 | 200 000 | INDISPENSABLE |
| Création de société (SUARL) + formalités | 150 000 | 350 000 | INDISPENSABLE — [À VÉRIFIER : coûts APIX] |
| Identité visuelle, plaquette, marquage véhicule | 150 000 | 400 000 | UTILE |
| Petit local de transit / tri | 0 (domicile) | 600 000 (6 mois de caution + loyer) | PLUS TARD |
| Logiciel / suivi | 0 (tableur) | 200 000 | PLUS TARD |
| **Fonds de roulement 3 mois** | 1 500 000 | 3 000 000 | **INDISPENSABLE** |
| **Total** | **≈ 3,1 M FCFA** | **≈ 9,8 M FCFA** | |

Compatible avec l'apport hypothétique de 6 M FCFA — **en option économe et sans dérapage**.

## 4. Le risque n°1 de l'étage 1 : la désintermédiation

Vous êtes un intermédiaire entre un client et une blanchisserie. Les deux peuvent se passer
de vous dès qu'ils se connaissent. C'est le risque structurel du modèle, pas un détail.

| Mitigation | Effet | Classement |
|---|---|---|
| Ne jamais livrer le client et le sous-traitant l'un à l'autre (linge en housse neutre, votre marque seule visible) | Élevé | INDISPENSABLE |
| Contrat client avec durée, préavis et volume minimum | Moyen | INDISPENSABLE |
| Deux sous-traitants minimum dès que possible | Élevé (dépendance + continuité) | INDISPENSABLE |
| Vendre ce que le sous-traitant ne vend pas : délai garanti, comptage, remplacement du linge perdu, facture unique, régularité | Élevé | INDISPENSABLE |
| Passer à l'étage 2 dès que le volume le justifie | Définitif | PLUS TARD |

Autrement dit : votre produit n'est pas le lavage. **Votre produit est la garantie que le
linge propre est là à l'heure, en quantité juste, toutes les semaines, sans que le client
ait à y penser.** Le lavage est un intrant que vous achetez.

## 5. RED TEAM — pourquoi ce projet peut échouer

*Posture : investisseur sceptique. Sept objections, par ordre de gravité.*

1. **« Vous n'avez aucune preuve que quelqu'un veut acheter ça. »** Le projet naît d'un modèle
   observé en Europe, pas d'un client qui s'est plaint. Tant que 25 entretiens n'ont pas été
   faits, la demande est une croyance. → *Test : PHASE 6, avant toute dépense.*
2. **« Vous ne connaissez pas le métier, et vous voulez le vendre. »** Un directeur d'hôtel
   détecte en cinq minutes un interlocuteur qui n'a jamais vu une lingerie. → *Test : étage 0,
   passer du temps dans une vraie lingerie avant la première visite commerciale.*
3. **« Votre marge appartient à votre sous-traitant. »** S'il augmente ses prix ou refuse le
   volume, votre modèle s'effondre. → *Test : négocier une grille écrite avec deux
   blanchisseries avant de signer le premier client.*
4. **« Vous serez battu sur le prix par l'informel. »** Des lavandières et petits pressings
   travaillent sans charges. Vous êtes déclaré (ligne rouge L2). → *Réponse : ne jamais vendre
   le prix. Vendre la fiabilité, le comptage, la facture, la continuité. Si le client
   n'achète que le prix, ce n'est pas votre client.*
5. **« La trésorerie va vous tuer avant la rentabilité. »** Le sous-traitant se paie vite, le
   client B2B paie à 30-60 jours. Chaque nouveau client creuse le trou. → *Test : plan de
   trésorerie hebdomadaire, paiement à la livraison ou à 15 jours sur les premiers contrats.*
6. **« Vous dépendrez d'un seul hôtel. »** Un client = l'équilibre, mais aussi la mort en cas
   de perte. La saison touristique amplifie le problème. → *Réponse : plafond de 35 % du CA
   par client une fois 5 clients atteints ; mélanger saisonnier et non-saisonnier.*
7. **« Si vous n'êtes pas sur place, ça ne marche pas. »** Ce métier se joue sur la présence
   quotidienne et la réaction en deux heures quand une livraison manque. → *Décision requise
   du porteur (D1).*

**Aucune de ces sept objections ne coûte d'argent à tester.** C'est le principal argument en
faveur d'un lancement par l'étage 0 puis l'étage 1.

## 6. Recommandation

| Élément | Recommandation |
|---|---|
| Modèle | **Modèle A élargi** (service de lavage externalisé + logistique + garantie de service) — pas le modèle B/C (location) au lancement |
| Étage d'entrée | **Étage 1**, précédé d'un étage 0 de 3 à 6 mois |
| CAPEX au lancement | ≤ 4 M FCFA, dont ≥ 1,5 M de fonds de roulement intact |
| Segments prioritaires | Hôtels 15-60 chambres, puis restaurants et spas dans le même périmètre de tournée |
| Géographie | Une seule zone dense à choisir en PHASE 13. Candidates : axe Almadies-Ngor-Yoff (Dakar) ou Saly-Mbour. **Principe : densité avant nombre** |
| Dépense interdite au lancement | **Toute machine.** Aucun achat d'équipement de lavage avant validation de l'étage 1 |
| Décision reportée | Location du linge (modèle Elis) : à réexaminer à l'étage 2, pas avant |

## 7. Ce que je ne peux pas décider à votre place

Cinq informations changent les conclusions ci-dessus et n'appartiennent qu'à vous :

1. **Le montant réel de l'apport** (B1) — sous 3 M FCFA, même l'étage 1 devient fragile.
2. **Résidez-vous au Sénégal ?** (D1) — si non, l'étage 1 est très difficile sans associé sur place.
3. **Devez-vous vivre de ce projet, et sous combien de mois ?** (B6) — détermine s'il faut un
   revenu parallèle pendant l'amorçage.
4. **Acceptez-vous de passer 3 à 6 mois en apprentissage terrain avant d'investir ?** (J2, étage 0)
5. **Êtes-vous prêt à vendre en porte-à-porte ?** — l'étage 1 est un métier de vente avant
   d'être un métier de linge.
