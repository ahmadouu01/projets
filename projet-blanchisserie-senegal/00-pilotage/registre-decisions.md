# Registre de pilotage du projet

Document vivant. Mis à jour à la fin de **chaque** étape. Source de vérité des décisions prises.

**Dernière mise à jour :** 2026-09-19 — clôture provisoire PHASE 1 (sur profil hypothétique P0)

---

## 1. DÉCISIONS VALIDÉES

| # | Date | Décision | Phase | Conséquences |
|---|------|----------|-------|--------------|
| D-001 | 2026-09-19 | Étudier la création d'une entreprise B2B de location-entretien de linge / services d'hygiène au Sénégal, sans présupposer une copie du modèle Elis | 1 | Le modèle économique reste ouvert (Modèles A→F à comparer en PHASE 8) |
| D-002 | 2026-09-19 | Travail par phases séquentielles avec Go/No-Go, pas de business plan produit d'emblée | 1 | Aucun engagement CAPEX avant jalon J1 (fin PHASE 6) |
| D-003 | 2026-09-19 | Le profil du porteur est provisoirement fixé par le document `01-cadrage/profil-porteur-P0.md` (débutant, apport ~6 M FCFA, sans réseau) | 1 | Toutes les phases suivantes sont calibrées sur ce profil jusqu'à correction |
| D-004 | 2026-09-19 | **Le modèle Elis (location-entretien, usine) est écarté au lancement.** Point d'entrée retenu : opérateur de service avec lavage sous-traité | 1 | PHASE 8 comparera les modèles, mais A-élargi est le scénario de référence |
| D-005 | 2026-09-19 | **Aucun achat de machine de lavage avant validation commerciale** de l'étage 1 | 1 | Les PHASES 12/14 (dimensionnement, machines) sont repoussées après l'étage 1 |
| D-006 | 2026-09-19 | Ajout d'un « étage 0 » d'apprentissage terrain (3-6 mois) avant toute création de structure | 1 | Décale le calendrier C2 ; coût ≈ 0 |

## 2. HYPOTHÈSES ACTUELLES

| # | Hypothèse | Statut | À valider par |
|---|-----------|--------|---------------|
| H-001 | La zone Dakar–Diamniadio–Mbour/Saly concentre l'essentiel de la demande solvable | HYPOTHÈSE DE TRAVAIL | PHASE 3 + PHASE 6 |
| H-002 | Les hôtels et cliniques lavent majoritairement en interne ou via des prestataires peu industrialisés | HYPOTHÈSE DE TRAVAIL | PHASE 2 + PHASE 6 (terrain) |
| H-003 | Le coût et la fiabilité de l'eau et de l'électricité sont des facteurs de viabilité de premier ordre | HYPOTHÈSE DE TRAVAIL | PHASE 15 |
| H-004 | Un modèle de location (propriété du linge par le prestataire) génère un BFR significativement plus lourd qu'un modèle de lavage seul | HYPOTHÈSE DE TRAVAIL (logique économique, à chiffrer) | PHASE 24 |
| H-005 | Profil porteur P0 : apport 3-10 M FCFA (central 6 M), aucune compétence sectorielle, aucun réseau, résidence non déterminée | **HYPOTHÈSE POSÉE PAR LE COPILOTE** — à corriger par le porteur | Immédiat |
| H-006 | Un hôtel de 30 chambres à 60 % d'occupation génère ≈ 2 700 kg de linge/mois (ratio 3-6 kg par nuitée occupée) | HYPOTHÈSE (règle de métier internationale) | PHASE 6 |
| H-007 | Les charges fixes mensuelles de l'étage 1 se situent entre 475 000 et 910 000 FCFA | HYPOTHÈSE DE TRAVAIL | PHASE 23 |
| H-008 | Il existe à Dakar des blanchisseries disposant d'une capacité excédentaire vendable en sous-traitance | **HYPOTHÈSE CRITIQUE — tout l'étage 1 en dépend** | PHASE 5 + PHASE 6 |

## 3. DONNÉES MANQUANTES (bloquantes ou structurantes)

| # | Donnée | Criticité | Moyen d'obtention | Phase |
|---|--------|-----------|-------------------|-------|
| M-001 | Profil du porteur : capital, calendrier, implication, compétences, réseau | **BLOQUANTE** | Questionnaire PHASE 1 | 1 |
| M-002 | Parc hôtelier réel du Sénégal (nombre d'établissements, chambres, taux d'occupation) | Haute | Sources officielles (ANSD, ministère du Tourisme) | 3 |
| M-003 | Nombre et taille des établissements de santé (publics/privés) | Haute | Carte sanitaire / ministère de la Santé | 3 |
| M-004 | Prix actuellement payés pour le lavage externalisé (FCFA/kg ou /pièce) | **Haute** | Entretiens terrain | 6 |
| M-005 | Tarifs eau (SEN'EAU) et électricité (Senelec) — grilles professionnelles en vigueur | Haute | Grilles tarifaires officielles | 15 |
| M-006 | Concurrents industriels existants (capacité, clients, positionnement) | Haute | Terrain + recherche | 5 |
| M-007 | Régime fiscal/douanier applicable aux machines de blanchisserie importées | Moyenne | Tarif extérieur commun CEDEAO / transitaire | 17-19 |
| M-008 | Disponibilité et coût du foncier industriel (Dakar, Diamniadio, Mbour) | Moyenne | Agences / DGPU / terrain | 13 |
| M-009 | **Tarif de sous-traitance du lavage au kg** proposé par les blanchisseries existantes | **BLOQUANTE pour l'étage 1** | Demande de devis directe | 5-6 |
| M-010 | Coût et formalités réels de création d'une SUARL (APIX, greffe, NINEA) | Moyenne | Sources officielles APIX | 19 |
| M-011 | Délais de paiement réellement pratiqués par les hôtels et cliniques au Sénégal | **Haute (trésorerie)** | Entretiens terrain | 6 + 24 |
| M-012 | Saisonnalité réelle du taux d'occupation hôtelier par zone | Haute | ANSD / ministère du Tourisme + terrain | 3 |

## 4. RISQUES IDENTIFIÉS (registre préliminaire — sera formalisé en PHASE 28)

| # | Risque | Prob. | Impact | Criticité | Piste de mitigation |
|---|--------|-------|--------|-----------|---------------------|
| R-001 | Demande réelle trop faible pour l'externalisation (préférence pour le lavage interne) | ? | Critique | À évaluer | Validation terrain avant CAPEX (J1) |
| R-002 | Prix de marché tirés vers le bas par le secteur informel | ? | Élevé | À évaluer | Positionnement sur la fiabilité/hygiène/contrat, pas le prix |
| R-003 | Coupures d'eau / d'électricité dégradant la capacité et les coûts | Élevée | Élevé | Élevée | Stockage eau, groupe électrogène, dimensionnement thermique |
| R-004 | BFR sous-estimé (stock textile + délais de paiement clients B2B longs) | Élevée | Critique | **Élevée** | Modèle de trésorerie mensuel, acomptes, cadrage contractuel |
| R-005 | Impayés / concentration client (dépendance à 1-2 gros comptes) | Moyenne | Élevé | Élevée | Plafond de concentration, garanties, mix de segments |
| R-006 | Dérive du CAPEX (import, installation, génie civil) | Élevée | Élevé | Élevée | Chiffrage en coût rendu site, occasion/leasing, phasage |
| R-007 | Saisonnalité touristique (creux hors saison sur le segment hôtelier) | Élevée | Moyen | Moyenne | Mix segments non saisonniers (santé, industrie, services) |
| R-008 | **Désintermédiation** : le client et le sous-traitant traitent en direct | Élevée | Critique | **Critique** | Housse neutre, contrat, double sourcing, valeur hors lavage, montée à l'étage 2 |
| R-009 | **Déficit de compétence du porteur** (vente B2B et exploitation) | Certaine | Élevé | **Critique** | Étage 0 d'apprentissage ; recruter ou s'associer sur la compétence manquante |
| R-010 | Aucun réseau : coût d'acquisition du premier client élevé et lent | Certaine | Élevé | Élevée | Prospection physique structurée, zone géographique unique et dense |
| R-011 | Le sous-traitant augmente ses prix ou refuse le volume | Moyenne | Critique | Élevée | Grille tarifaire écrite, deux fournisseurs |
| R-012 | Porteur non résident : perte de réactivité opérationnelle | À déterminer | Critique | À évaluer | Associé ou responsable local ; sinon renoncer à l'étage 1 |

## 5. ACTIONS À RÉALISER

| # | Action | Responsable | Échéance | État |
|---|--------|-------------|----------|------|
| A-001 | Répondre au questionnaire de cadrage (`01-cadrage/questionnaire-phase-1.md`) | Porteur | — | ⏳ En attente |
| A-002 | Formaliser les critères de Go/No-Go du jalon J1 | Copilote | après A-001 | ⏳ |

## 6. PROCHAINE ÉTAPE

**PHASE 2 — Analyse du besoin**, calibrée sur le profil P0 et sur le périmètre retenu
(étage 1 : opérateur de service, lavage sous-traité, hôtels 15-60 chambres).

Question directrice de la PHASE 2 : *comment les petits et moyens hôtels sénégalais gèrent-ils
aujourd'hui leur linge, ce que cela leur coûte réellement, et qu'est-ce qui ne fonctionne pas ?*

En parallèle, la recherche documentaire A-004 peut démarrer immédiatement : elle ne dépend
d'aucune décision du porteur.
