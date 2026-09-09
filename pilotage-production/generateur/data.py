# -*- coding: utf-8 -*-
"""Referentiels et jeu de donnees de demonstration (deterministe)."""
import datetime as dt
import random

random.seed(20260105)

MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet",
        "Août", "Septembre", "Octobre", "Novembre", "Décembre"]

LIGNES = ["Ligne 1 - Assemblage", "Ligne 2 - Usinage", "Ligne 3 - Conditionnement"]
EQUIPES = ["Équipe A (matin)", "Équipe B (après-midi)", "Équipe C (nuit)"]
PILOTES = ["DURAND M.", "NGOM A.", "LEROY S.", "BAKARI F.", "PETIT C.",
           "MARCHAND J.", "SOW I.", "GARNIER L."]

# Reference produit : (ref, designation, cadence nominale pcs/min, ppm cible)
PRODUITS = [
    ("REF-1001", "Carter aluminium A20", 15.0, 2000),
    ("REF-1002", "Carter aluminium A30", 12.5, 2000),
    ("REF-2001", "Support moteur S12", 9.0, 1500),
    ("REF-2002", "Support moteur S18", 7.5, 1500),
    ("REF-3001", "Kit conditionné K4", 22.0, 3000),
]

# Causes d'arret : (code, libelle, famille 5M, type, rubrique de saisie)
CAUSES = [
    ("PLA-01", "Pause légale et relève de poste",            "Milieu",       "Planifié", "Arrêts planifiés"),
    ("PLA-02", "Maintenance préventive planifiée",           "Machine",      "Planifié", "Arrêts planifiés"),
    ("PLA-03", "Réunion, formation ou audit planifié",       "Main d'œuvre", "Planifié", "Arrêts planifiés"),
    ("PAN-01", "Panne mécanique",                            "Machine",      "Subi",     "Pannes"),
    ("PAN-02", "Panne électrique ou capteur",                "Machine",      "Subi",     "Pannes"),
    ("PAN-03", "Défaut automatisme / supervision",           "Machine",      "Subi",     "Pannes"),
    ("CDS-01", "Changement de série (outillage)",            "Méthode",      "Subi",     "Changement de série"),
    ("CDS-02", "Attente outillage ou moyen de contrôle",     "Méthode",      "Subi",     "Changement de série"),
    ("REG-01", "Réglage qualité en cours de série",          "Méthode",      "Subi",     "Réglages et micro-arrêts"),
    ("REG-02", "Micro-arrêts, bourrage, purge",              "Machine",      "Subi",     "Réglages et micro-arrêts"),
    ("MAT-01", "Rupture d'approvisionnement matière",        "Matière",      "Subi",     "Manque matière"),
    ("MAT-02", "Matière non conforme (rebut fournisseur)",   "Matière",      "Subi",     "Manque matière"),
    ("PER-01", "Absence non remplacée",                      "Main d'œuvre", "Subi",     "Manque personnel"),
    ("PER-02", "Accompagnement / montée en compétence",      "Main d'œuvre", "Subi",     "Manque personnel"),
    ("LOG-01", "Attente cariste / évacuation en-cours",      "Milieu",       "Subi",     "Autres arrêts subis"),
    ("LOG-02", "Saturation aval / stock plein",              "Milieu",       "Subi",     "Autres arrêts subis"),
    ("ESS-01", "Essai, prototype, série pilote",             "Méthode",      "Subi",     "Autres arrêts subis"),
]

RUBRIQUES = ["Arrêts planifiés", "Pannes", "Changement de série",
             "Réglages et micro-arrêts", "Manque matière", "Manque personnel",
             "Autres arrêts subis"]

POSTES = ["Conduite ligne 1", "Conduite ligne 2", "Conduite ligne 3",
          "Changement de série", "Contrôle qualité", "Retouche",
          "Maintenance 1er niveau", "Cariste / appro", "Emballage",
          "Saisie et reporting", "Animation 5 min", "Formation nouveaux"]
POSTES_CRIT = [3, 3, 2, 3, 3, 2, 3, 2, 1, 2, 2, 1]
POSTES_CIBLE = [3, 3, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2]

FAM5M = ["Machine", "Main d'œuvre", "Matière", "Méthode", "Milieu"]
SOURCES = ["Écart quotidien", "Sécurité", "Qualité client", "Analyse Pareto TRS",
           "Audit 5S", "Idée opérateur", "Réclamation client", "Audit interne"]
NATURES = ["Curative (D3)", "Corrective (D5)", "Préventive (D7)", "Amélioration"]
STATUTS = ["À lancer", "En cours", "En attente", "Terminée", "Abandonnée"]
EFFICACITE = ["Oui", "Non", "En attente"]
OUINON = ["Oui", "Non", "S.O."]
OKNOK = ["OK", "NOK", "S.O."]
SQCDP = ["Sécurité", "Qualité", "Coût", "Délai", "Personnel"]

# (libellé affiché dans le sélecteur du cockpit, code objectif de PARAMETRES)
INDICATEURS = [
    ("TRS", "TRS"),
    ("Disponibilité", "DISPO"),
    ("Performance", "PERF"),
    ("Qualité au premier passage", "QUAL"),
    ("TRG", "TRG"),
    ("Taux de service", "SERVICE"),
    ("Taux de présence", "PRESENCE"),
]

OBJECTIFS = [
    # code, indicateur, unite, cible, alerte, sens(1=plus haut mieux), source
    ("TRS",      "Taux de rendement synthétique (TRS / OEE)", "%",   0.75, 0.70,  1, "Objectif budget 2026 — direction industrielle"),
    ("DISPO",    "Taux de disponibilité",                     "%",   0.90, 0.85,  1, "Dérivé de l'objectif TRS"),
    ("PERF",     "Taux de performance (cadence)",             "%",   0.95, 0.90,  1, "Dérivé de l'objectif TRS"),
    ("QUAL",     "Taux de qualité au premier passage (RFT)",  "%",   0.99, 0.98,  1, "Engagement client / plan qualité"),
    ("TRG",      "Taux de rendement global (TRG)",            "%",   0.60, 0.55,  1, "Suivi capacitaire"),
    ("SERVICE",  "Taux de service (quantité programmée)",     "%",   0.95, 0.90,  1, "Contrat de service logistique"),
    ("PPM",      "Non-conformités internes",                  "ppm", 2000, 5000, -1, "Plan qualité 2026"),
    ("PRESENCE", "Taux de présence",                          "%",   0.95, 0.92,  1, "Ressources humaines"),
    ("ACCIDENT", "Accidents avec arrêt (cumul mois)",         "nb",  0,    0,    -1, "Politique santé-sécurité"),
    ("RETARD",   "Actions correctives en retard",             "nb",  0,    2,    -1, "Règle d'animation QRQC"),
    ("MTTR",     "Temps moyen de réparation (MTTR)",          "min", 30,   45,   -1, "Contrat de maintenance"),
    ("MTBF",     "Temps moyen entre pannes (MTBF)",           "min", 240,  180,   1, "Contrat de maintenance"),
    ("AUDIT5S",  "Score d'audit 5S",                          "%",   0.80, 0.70,  1, "Standard 5S du site"),
    ("POLYV",    "Taux de polyvalence de l'équipe",           "%",   0.70, 0.60,  1, "Plan de compétences"),
]

# --------------------------------------------------------------------------
# Jeu de demonstration : janvier 2026, 2 lignes, evenements d'arret coherents
# --------------------------------------------------------------------------
FERIES = {dt.date(2026, 1, 1)}


def jours_ouvres(annee, mois):
    d = dt.date(annee, mois, 1)
    out = []
    while d.month == mois:
        if d.weekday() < 5 and d not in FERIES:
            out.append(d)
        d += dt.timedelta(days=1)
    return out


PROFIL = {
    "Ligne 1 - Assemblage":     {"prod": ["REF-1001", "REF-1002"], "eff": 12, "to": 480},
    "Ligne 2 - Usinage":        {"prod": ["REF-2001", "REF-2002"], "eff": 8,  "to": 480},
}

CAUSE_BY_CODE = {c[0]: c for c in CAUSES}
SUBIS = [c for c in CAUSES if c[3] == "Subi"]


def generer():
    """Retourne (lignes_saisie, evenements_arret) internement coherents."""
    saisie, arrets = [], []
    jours = jours_ouvres(2026, 1)
    for j, date in enumerate(jours):
        for li, ligne in enumerate(PROFIL):
            p = PROFIL[ligne]
            equipe = EQUIPES[(j + li) % 2]
            ref = p["prod"][j % len(p["prod"])]
            cad = next(x[2] for x in PRODUITS if x[0] == ref)
            to = p["to"]

            # --- evenements planifies
            evts = [("PLA-01", 40)]
            if j % 5 == 2:
                evts.append(("PLA-02", 60))
            if j % 10 == 6:
                evts.append(("PLA-03", 45))

            # --- evenements subis
            n_subis = 2 + (j * 3 + li) % 4
            for k in range(n_subis):
                code = SUBIS[(j * 7 + k * 3 + li * 5) % len(SUBIS)][0]
                base = {"PAN": 36, "CDS": 26, "REG": 10, "MAT": 20, "PER": 22,
                        "LOG": 14, "ESS": 16}[code[:3]]
                duree = max(5, int(base * (0.5 + random.random())))
                if j in (7, 15) and code.startswith("PAN"):
                    duree += 65          # deux derives visibles dans le mois
                evts.append((code, duree))

            # horodatage sequentiel a partir de 06:00
            t = dt.datetime.combine(date, dt.time(6, 0))
            t += dt.timedelta(minutes=25)
            for code, duree in evts:
                deb = t + dt.timedelta(minutes=random.randint(10, 45))
                fin = deb + dt.timedelta(minutes=duree)
                c = CAUSE_BY_CODE[code]
                arrets.append(dict(date=date, equipe=equipe, ligne=ligne,
                                   machine=ligne.split(" - ")[0], debut=deb.time(),
                                   fin=fin.time(), code=code, duree=duree))
                t = fin

            par_rub = {r: 0 for r in RUBRIQUES}
            for code, duree in evts:
                par_rub[CAUSE_BY_CODE[code][4]] += duree
            n_pannes = sum(1 for code, _ in evts if code.startswith("PAN"))

            planifie = par_rub["Arrêts planifiés"]
            subi = sum(par_rub[r] for r in RUBRIQUES if r != "Arrêts planifiés")
            tr = to - planifie
            tf = tr - subi
            perf = 0.86 + ((j * 13 + li * 7) % 11) / 100.0     # 0.86 .. 0.96
            produite = int(tf * cad * perf)
            taux_rft = 0.982 + ((j * 5 + li * 3) % 14) / 1000.0
            conforme = int(produite * taux_rft)
            retouche = int((produite - conforme) * 0.45)
            rebut = produite - conforme - retouche
            demande = int((conforme + retouche) / (0.92 + ((j * 7 + li) % 9) / 100.0))
            eff_prev = p["eff"]
            eff_pres = eff_prev - (1 if (j * 3 + li) % 7 == 0 else 0)
            hsup = 4 if (j + li) % 6 == 0 else 0
            acc = 1 if (j == 12 and li == 0) else 0
            presq = 1 if (j * 2 + li) % 9 == 0 else 0
            code_princ = max(((c, d) for c, d in evts if not c.startswith("PLA")),
                            key=lambda x: x[1])[0]
            top = CAUSE_BY_CODE[code_princ][1] + " — " + ligne.split(" - ")[1]

            saisie.append(dict(
                date=date, equipe=equipe, ligne=ligne,
                of="OF-%s%03d" % (date.strftime("%m"), j * 2 + li + 1), ref=ref,
                to=to, planifie=planifie,
                pannes=par_rub["Pannes"], cds=par_rub["Changement de série"],
                reglages=par_rub["Réglages et micro-arrêts"],
                matiere=par_rub["Manque matière"],
                personnel=par_rub["Manque personnel"],
                autres=par_rub["Autres arrêts subis"],
                n_pannes=n_pannes, produite=produite, conforme=conforme,
                retouche=retouche, rebut=rebut, demande=demande,
                eff_prev=eff_prev, eff_pres=eff_pres, hsup=hsup,
                acc=acc, presq=presq, code=code_princ, top=top))
    return saisie, arrets


COLLABORATEURS = [
    ("M-1042", "DUPONT Marie",    "Équipe A (matin)",        "CDI"),
    ("M-1078", "NGOM Abdoulaye",  "Équipe A (matin)",        "CDI"),
    ("M-1103", "LEROY Sophie",    "Équipe A (matin)",        "CDI"),
    ("M-1156", "BAKARI Fatou",    "Équipe A (matin)",        "CDI"),
    ("M-1201", "PETIT Camille",   "Équipe A (matin)",        "Intérim"),
    ("M-1233", "MARCHAND Julien", "Équipe B (après-midi)",   "CDI"),
    ("M-1245", "SOW Ibrahima",    "Équipe B (après-midi)",   "CDI"),
    ("M-1290", "GARNIER Louis",   "Équipe B (après-midi)",   "CDI"),
    ("M-1312", "ROUX Émilie",     "Équipe B (après-midi)",   "CDD"),
    ("M-1355", "FAYE Moussa",     "Équipe B (après-midi)",   "CDI"),
    ("M-1401", "BERNARD Alice",   "Équipe C (nuit)",         "CDI"),
    ("M-1433", "DIALLO Aminata",  "Équipe C (nuit)",         "CDI"),
]
NIVEAUX = [
    [4, 3, 2, 4, 3, 2, 3, 1, 3, 3, 4, 3],
    [3, 4, 2, 3, 2, 1, 4, 2, 2, 1, 2, 1],
    [2, 3, 3, 2, 4, 3, 1, 1, 3, 4, 3, 2],
    [3, 2, 1, 3, 3, 4, 2, 3, 2, 1, 1, 0],
    [1, 1, 2, 0, 2, 2, 0, 3, 3, 0, 0, 0],
    [4, 3, 3, 4, 2, 2, 3, 2, 3, 3, 3, 2],
    [2, 4, 2, 3, 3, 1, 2, 4, 2, 1, 1, 1],
    [3, 2, 3, 2, 3, 3, 1, 2, 4, 2, 2, 1],
    [1, 2, 1, 1, 2, 3, 0, 1, 3, 0, 0, 0],
    [3, 3, 2, 3, 1, 2, 3, 3, 2, 2, 2, 1],
    [2, 2, 4, 2, 3, 2, 2, 2, 3, 3, 1, 1],
    [1, 1, 3, 1, 2, 3, 1, 2, 2, 1, 0, 0],
]

ACTIONS_DEMO = [
    dict(d="2026-01-08", src="Analyse Pareto TRS", zone="Ligne 1 - Assemblage",
         pb="Arrêts répétés du convoyeur d'alimentation : 185 min perdues sur la semaine 2",
         g=3, fr=4, de=3, fam="Machine",
         cause="Capteur de position encrassé par les copeaux ; nettoyage absent du plan de maintenance préventive",
         act="Ajouter le nettoyage hebdomadaire du capteur au plan préventif et former les deux équipes",
         nat="Préventive (D7)", pil="DURAND M.", cible="2026-01-22", av=0.6,
         st="En cours", fait="", eff="En attente", verif="", std="Oui", gain=14000,
         com="Vérifier l'absence de récidive sur 4 semaines glissantes"),
    dict(d="2026-01-09", src="Qualité client", zone="Ligne 2 - Usinage",
         pb="Réclamation client : cote de perçage hors tolérance sur le lot OF-01018 (12 pièces)",
         g=5, fr=2, de=4, fam="Méthode",
         cause="Absence de contrôle de la première pièce après changement d'outil coupant",
         act="Rendre bloquante la validation première pièce après tout changement d'outil (autocontrôle + visa)",
         nat="Corrective (D5)", pil="LEROY S.", cible="2026-01-16", av=1.0,
         st="Terminée", fait="2026-01-15", eff="Oui", verif="2026-02-13", std="Oui",
         gain=22000, com="Standard de poste et gamme de contrôle mis à jour"),
    dict(d="2026-01-13", src="Sécurité", zone="Ligne 1 - Assemblage",
         pb="Accident avec arrêt : coupure à la main lors de l'évacuation des chutes",
         g=5, fr=1, de=3, fam="Milieu",
         cause="Bac d'évacuation des chutes sans protection, gants inadaptés au risque de coupure",
         act="Installer un bac fermé et déployer des gants anti-coupure niveau C sur les deux lignes",
         nat="Corrective (D5)", pil="BAKARI F.", cible="2026-01-20", av=1.0,
         st="Terminée", fait="2026-01-19", eff="Oui", verif="2026-02-19", std="Oui",
         gain=0, com="Analyse d'accident diffusée aux trois équipes"),
    dict(d="2026-01-14", src="Écart quotidien", zone="Ligne 2 - Usinage",
         pb="Temps de changement de série moyen de 38 min contre 25 min au standard",
         g=3, fr=5, de=2, fam="Méthode",
         cause="Outillage et moyens de contrôle non préparés avant l'arrêt machine (pas de séparation interne/externe)",
         act="Déployer un chantier SMED : préparation externe systématique et chariot de changement dédié",
         nat="Amélioration", pil="MARCHAND J.", cible="2026-02-13", av=0.35,
         st="En cours", fait="", eff="En attente", verif="", std="Non", gain=31000,
         com="Chantier de fond n°1 — objectif 20 min"),
    dict(d="2026-01-16", src="Audit 5S", zone="Ligne 3 - Conditionnement",
         pb="Zone de conditionnement notée 2,1/4 : allées encombrées par les en-cours",
         g=2, fr=4, de=1, fam="Milieu",
         cause="Limite d'en-cours non définie et non matérialisée au sol",
         act="Définir un plafond d'en-cours, marquer les emplacements au sol et afficher la règle",
         nat="Corrective (D5)", pil="SOW I.", cible="2026-01-30", av=0.5,
         st="En cours", fait="", eff="En attente", verif="", std="Non", gain=0,
         com="Recontrôle au prochain audit 5S"),
    dict(d="2026-01-19", src="Idée opérateur", zone="Ligne 1 - Assemblage",
         pb="Recherche d'outillage au poste d'assemblage : 5 à 8 min perdues par poste",
         g=1, fr=5, de=2, fam="Milieu",
         cause="Aucun emplacement dédié aux outils de réglage",
         act="Réaliser un panneau d'ombres (shadow board) au poste d'assemblage",
         nat="Amélioration", pil="PETIT C.", cible="2026-02-06", av=0.2,
         st="En cours", fait="", eff="En attente", verif="", std="Non", gain=6000,
         com="Proposée par l'équipe A lors du point 5 minutes"),
    dict(d="2026-01-20", src="Écart quotidien", zone="Ligne 2 - Usinage",
         pb="Rupture matière sur REF-2002 : 55 min d'arrêt le 20/01",
         g=3, fr=3, de=3, fam="Matière",
         cause="Seuil de réapprovisionnement calculé sans tenir compte du délai fournisseur réel (8 j au lieu de 5 j)",
         act="Recalculer les points de commande sur la base des délais réels et alerter à J-3",
         nat="Préventive (D7)", pil="NGOM A.", cible="2026-02-03", av=0.0,
         st="À lancer", fait="", eff="En attente", verif="", std="Non", gain=9000,
         com="À traiter avec le service approvisionnement"),
    dict(d="2026-01-22", src="Analyse Pareto TRS", zone="Ligne 1 - Assemblage",
         pb="Micro-arrêts récurrents en fin de poste (bourrage évacuation)",
         g=2, fr=4, de=4, fam="Machine",
         cause="Guide d'évacuation déréglé, aucun standard de contrôle en fin de poste",
         act="Régler le guide et ajouter le point au standard de fin de poste",
         nat="Corrective (D5)", pil="GARNIER L.", cible="2026-01-28", av=0.8,
         st="En cours", fait="", eff="En attente", verif="", std="Oui", gain=7500,
         com="Suivi quotidien du nombre de micro-arrêts"),
]

AUDIT_5S = [
    ("1S Débarrasser", 1, "Aucun objet, pièce ou en-cours inutile dans la zone", 2, 3, 2),
    ("1S Débarrasser", 2, "Les en-cours ne dépassent pas la limite définie et affichée", 3, 2, 2),
    ("1S Débarrasser", 3, "Aucun document obsolète affiché (version et date visibles)", 1, 3, 3),
    ("1S Débarrasser", 4, "Les objets sans propriétaire sont identifiés et traités (zone rouge)", 1, 2, 1),
    ("1S Débarrasser", 5, "Allées, accès machines et issues de secours totalement dégagés", 3, 3, 3),
    ("2S Ranger", 1, "Chaque outil dispose d'un emplacement unique et identifié", 3, 2, 2),
    ("2S Ranger", 2, "Marquage au sol présent, lisible et respecté", 2, 3, 2),
    ("2S Ranger", 3, "EPI rangés, disponibles et à portée immédiate", 3, 4, 3),
    ("2S Ranger", 4, "Stock au poste borné visuellement (mini / maxi)", 2, 2, 1),
    ("2S Ranger", 5, "Un nouvel arrivant trouve un outil en moins de 30 secondes", 2, 2, 2),
    ("3S Nettoyer", 1, "Sols, machines et postes propres en fin de poste", 2, 3, 3),
    ("3S Nettoyer", 2, "Aucune fuite (huile, air, fluide) non traitée ou non signalée", 3, 3, 2),
    ("3S Nettoyer", 3, "Matériel de nettoyage disponible, complet et en bon état", 1, 4, 3),
    ("3S Nettoyer", 4, "Le nettoyage sert d'inspection : les anomalies sont remontées", 3, 2, 1),
    ("3S Nettoyer", 5, "Les sources de salissure sont traitées à la source", 3, 1, 1),
    ("4S Standardiser", 1, "Standard 5S écrit, illustré et affiché dans la zone", 2, 3, 2),
    ("4S Standardiser", 2, "Responsabilités de nettoyage nommées et planifiées", 2, 2, 2),
    ("4S Standardiser", 3, "Management visuel à jour (moins de 24 h)", 3, 2, 1),
    ("4S Standardiser", 4, "Standards de travail accessibles et lisibles au poste", 3, 3, 3),
    ("4S Standardiser", 5, "Les écarts au standard sont visibles de tous", 2, 2, 2),
    ("5S Progresser", 1, "Audit réalisé au rythme prévu, sans exception", 2, 3, 3),
    ("5S Progresser", 2, "Actions des audits précédents soldées dans les délais", 3, 2, 1),
    ("5S Progresser", 3, "Les opérateurs proposent et mettent en œuvre des améliorations", 3, 2, 2),
    ("5S Progresser", 4, "Le score progresse ou se maintient sur 3 audits", 2, 2, 2),
    ("5S Progresser", 5, "Le management reconnaît les progrès sur le terrain", 1, 3, 3),
]

POSTE_CHECK = [
    ("1. Avant la prise de poste", "T-20 min", "Délai", "Lire la passation écrite du poste précédent et le carnet de consignes", "Oui"),
    ("1. Avant la prise de poste", "T-20 min", "Délai", "Vérifier le programme du jour, les priorités clients et les urgences", "Oui"),
    ("1. Avant la prise de poste", "T-15 min", "Personnel", "Contrôler l'effectif présent et couvrir les absences (matrice de polyvalence)", "Oui"),
    ("1. Avant la prise de poste", "T-15 min", "Qualité", "Vérifier la disponibilité matière, outillage et moyens de contrôle", "Oui"),
    ("1. Avant la prise de poste", "T-10 min", "Délai", "Vérifier les interventions de maintenance planifiées sur le poste", "Non"),
    ("2. Passation croisée", "T-10 min", "Sécurité", "Passation orale avec le superviseur sortant (5 min, sur le terrain)", "Oui"),
    ("2. Passation croisée", "T-5 min", "Qualité", "Faire le point sur les aléas non résolus et les dérogations en cours", "Oui"),
    ("3. Animation 5 minutes", "T0", "Sécurité", "Point sécurité : accident, presqu'accident, situation dangereuse de la veille", "Oui"),
    ("3. Animation 5 minutes", "T0", "Qualité", "Résultat de la veille : TRS, qualité, service — écart et cause principale", "Oui"),
    ("3. Animation 5 minutes", "T0", "Délai", "Objectif du jour chiffré et affectation nominative aux postes", "Oui"),
    ("3. Animation 5 minutes", "T0", "Personnel", "Annoncer les aléas connus et les besoins d'entraide", "Non"),
    ("4. Démarrage", "T+10 min", "Sécurité", "Contrôler le port des EPI et l'état des protections machines", "Oui"),
    ("4. Démarrage", "T+10 min", "Sécurité", "Vérifier les consignations (LOTO) levées et tracées", "Oui"),
    ("4. Démarrage", "T+15 min", "Qualité", "Valider la première pièce conforme avant lancement de série", "Oui"),
    ("4. Démarrage", "T+20 min", "Coût", "Confirmer les réglages et la cadence nominale du produit lancé", "Non"),
    ("5. Pendant le poste", "Toutes les 2 h", "Qualité", "Tour de terrain : 1 poste observé, 3 questions ouvertes aux opérateurs", "Non"),
    ("5. Pendant le poste", "Continu", "Délai", "Être présent sur tout arrêt de plus de 15 min et déclencher l'escalade", "Oui"),
    ("5. Pendant le poste", "Toutes les heures", "Délai", "Mettre à jour le suivi heure par heure (réalisé / objectif / écart)", "Oui"),
    ("5. Pendant le poste", "Continu", "Sécurité", "Escalader immédiatement tout écart sécurité ou qualité client", "Oui"),
    ("5. Pendant le poste", "Continu", "Coût", "Enregistrer chaque arrêt dans l'onglet ARRÊTS (heure, durée, code cause)", "Oui"),
    ("6. Fin de poste", "T-30 min", "Coût", "Saisir la ligne du jour dans l'onglet SAISIE_PROD et contrôler la cohérence", "Oui"),
    ("6. Fin de poste", "T-25 min", "Qualité", "Déclarer le problème principal dans le PLAN_ACTIONS (cause racine amorcée)", "Oui"),
    ("6. Fin de poste", "T-20 min", "Sécurité", "Contrôler le rangement, le 5S et l'état de propreté des postes", "Oui"),
    ("6. Fin de poste", "T-15 min", "Personnel", "Valider les heures, les absences et les besoins de remplacement", "Non"),
    ("6. Fin de poste", "T-10 min", "Délai", "Rédiger la passation écrite ci-dessous et la faire viser", "Oui"),
]

ESCALADE = [
    ("Niveau 1", "Arrêt ou écart traité par l'équipe au poste", "Immédiat", "Opérateur et chef d'équipe", "Face à face au poste", "Onglet ARRÊTS"),
    ("Niveau 2", "Arrêt supérieur à 15 min ou écart qualité interne", "Sous 15 min", "Superviseur de production", "Appel radio / téléphone", "Onglet ARRÊTS + PLAN_ACTIONS"),
    ("Niveau 3", "Arrêt supérieur à 60 min, non-conformité client, risque de rupture", "Sous 30 min", "Responsable de production et qualité", "Appel + message écrit", "PLAN_ACTIONS (criticité ≥ 30)"),
    ("Niveau 4", "Accident avec arrêt, arrêt de ligne supérieur à 4 h, arrêt client", "Immédiat", "Direction de site et HSE", "Appel direct", "Analyse d'accident / 8D"),
]
