# -*- coding: utf-8 -*-
"""Adresses des filtres du cockpit, référencées par tous les autres onglets."""

F_ANNEE  = "COCKPIT!$A$5"
F_MOIS   = "COCKPIT!$D$5"      # nom du mois, converti en numéro dans CALC
F_LIGNE  = "COCKPIT!$I$5"
F_EQUIPE = "COCKPIT!$N$5"
F_INDIC  = "COCKPIT!$S$5"

# bloc technique du cockpit (colonnes masquées) : une ligne par carte
STATUT0 = 7                    # première ligne du bloc, colonne AE
CARTE_ROW = {code: STATUT0 + i for i, code in enumerate(
    ["TRS", "DISPO", "PERF", "QUAL", "TRG", "SERVICE",
     "PPM", "PRESENCE", "ACCIDENT", "MTBF", "MTTR", "RETARD"])}
