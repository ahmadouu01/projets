# -*- coding: utf-8 -*-
"""Onglets LISEZ-MOI et GLOSSAIRE."""
from openpyxl.styles import Alignment, Border, Side
from common import *

ARCHI = [
    ("COCKPIT", "Tableau de bord de la revue de performance : 12 indicateurs, 7 graphiques, top 5 des causes.",
     "Quotidienne (lecture)", "Superviseur", "Aucune saisie sauf les filtres et le bloc de décisions"),
    ("SAISIE_PROD", "Journal de production : une ligne par jour, par équipe et par ligne. Calcule le TRS et ses composantes.",
     "Quotidienne (5 min)", "Superviseur de poste", "Colonnes jaunes uniquement"),
    ("ARRETS", "Journal événementiel des arrêts : horaire, durée, code cause, famille 5M. Base de l'analyse de Pareto.",
     "À chaque arrêt", "Chef d'équipe", "Colonnes jaunes uniquement"),
    ("PLAN_ACTIONS", "Plan d'actions structuré : fait mesuré, cotation de criticité, cause racine, pilote, vérification d'efficacité.",
     "À chaque écart", "Superviseur / pilotes", "Colonnes jaunes uniquement"),
    ("POLYVALENCE", "Matrice de compétences ILUO et couverture des postes : risque de mono-compétence, plan de formation.",
     "Mensuelle", "Responsable de production", "Niveaux 0 à 4 et informations collaborateur"),
    ("AUDIT_5S", "Grille d'audit 5S pondérée : 25 critères, score par domaine, comparaison à l'audit précédent, historique.",
     "Mensuelle", "Auditeur désigné", "Pondérations, notes, constats et actions"),
    ("PRISE_DE_POSTE", "Standard de prise de poste et de passation SQCDP, matrice d'escalade et visa.",
     "À chaque relève", "Superviseur entrant / sortant", "Statuts, constats, actions et passation"),
    ("PARAMETRES", "Référentiels du site : objectifs et seuils, lignes, équipes, produits, causes d'arrêt, postes, listes de choix.",
     "À la mise en service, puis à chaque évolution", "Responsable de production", "Toutes les cellules bleues"),
    ("GLOSSAIRE", "Définition, formule et interprétation de chaque indicateur ; règles de gestion du classeur.",
     "Référence", "—", "Aucune"),
    ("CALC", "Moteur de calcul : agrégations filtrées, séries journalières, Pareto, cascade, historique 13 mois.",
     "Automatique", "—", "Aucune — ne pas modifier"),
]

LEGENDE = [
    (INPUT_BG, "0000FF", "Cellule à saisir", "Fond jaune, texte bleu : donnée saisie par l'utilisateur."),
    (CALC_BG, "1A1A1A", "Cellule calculée", "Fond bleu clair, texte noir : formule, ne pas écraser."),
    (REF_BG, "1E7B34", "Lien vers un référentiel", "Fond vert clair, texte vert : valeur reprise de l'onglet PARAMETRES."),
    (GREEN_BG, GREEN, "Objectif atteint", "La valeur est au niveau de la cible ou au-delà."),
    (AMBER_BG, AMBER, "Vigilance", "La valeur est entre la cible et le seuil d'alerte."),
    (RED_BG, RED, "Alerte", "La valeur a franchi le seuil d'alerte : action requise le jour même."),
]

RITUEL = [
    ("Chaque fin de poste", "5 min", "Saisir la ligne du jour dans SAISIE_PROD et les arrêts dans ARRETS ; vérifier la colonne de contrôle de cohérence."),
    ("Chaque matin", "5 min", "Lire le COCKPIT devant l'équipe : une carte rouge = une action ouverte le jour même dans PLAN_ACTIONS."),
    ("Chaque semaine", "30 min", "Revue du Pareto et de la cascade des pertes : choisir le chantier prioritaire, vérifier l'avancement des actions."),
    ("Chaque mois", "60 min", "Revue de performance : tendance 13 mois, audit 5S, matrice de polyvalence, efficacité des actions soldées."),
    ("Chaque trimestre", "—", "Révision des objectifs et des seuils d'alerte dans PARAMETRES au regard des résultats obtenus."),
]

DEMARRAGE = [
    "1.  Ouvrir l'onglet PARAMETRES et renseigner l'identification du site (cellules bleues).",
    "2.  Ajuster les objectifs et les seuils d'alerte au contrat de performance de l'entité.",
    "3.  Saisir les lignes de production, les équipes, les pilotes et les postes de travail.",
    "4.  Compléter le référentiel produits : chaque référence doit porter sa cadence nominale en pièces/minute, "
    "sans laquelle le taux de performance ne peut pas être calculé.",
    "5.  Adapter si besoin le référentiel des causes d'arrêt : conserver la colonne « Rubrique de saisie », "
    "qui relie chaque code à la colonne correspondante de SAISIE_PROD.",
    "6.  Supprimer le jeu de démonstration : sélectionner les lignes 5 à 46 de SAISIE_PROD, les lignes 5 à 203 de ARRETS "
    "et les lignes 9 à 16 de PLAN_ACTIONS, puis effacer uniquement le contenu des colonnes jaunes (touche Suppr). "
    "Ne jamais supprimer les lignes elles-mêmes : les formules des colonnes calculées seraient perdues.",
    "7.  Dans le COCKPIT, positionner l'année et le mois de travail, puis démarrer la saisie quotidienne.",
]

GLOSSAIRE = [
    ("TRS", "Taux de rendement synthétique (OEE)",
     "Disponibilité × Performance × Qualité, soit Temps utile ÷ Temps requis",
     "%", "SAISIE_PROD colonnes AB, AE",
     "Part du temps requis réellement transformée en production bonne. Indicateur de synthèse de la performance d'un moyen.",
     "NF E60-182"),
    ("Disponibilité", "Taux de disponibilité opérationnelle",
     "Temps de marche ÷ Temps requis", "%", "SAISIE_PROD colonnes AD, AB",
     "Mesure les arrêts subis. Un écart signale des pannes, des changements de série longs ou des ruptures d'approvisionnement.",
     "NF E60-182"),
    ("Performance", "Taux de performance ou tenue de cadence",
     "(Quantité produite ÷ Cadence nominale) ÷ Temps de marche", "%", "SAISIE_PROD colonnes P, O, AD",
     "Mesure les pertes de vitesse et les micro-arrêts non déclarés. Dépend de la fiabilité de la cadence nominale du référentiel.",
     "NF E60-182"),
    ("Qualité RFT", "Taux de qualité au premier passage (Right First Time)",
     "Quantité conforme au premier passage ÷ Quantité produite", "%", "SAISIE_PROD colonnes Q, P",
     "Exclut volontairement les pièces retouchées : une retouche consomme du temps et masque un défaut de procédé.",
     "IATF 16949 §9.1"),
    ("TRG", "Taux de rendement global",
     "Temps utile ÷ Temps d'ouverture", "%", "SAISIE_PROD colonnes AE, F",
     "Intègre les arrêts planifiés. Indicateur de capacité : il répond à la question « que puis-je encore charger ? ».",
     "NF E60-182"),
    ("Taux de service", "Respect du programme de production",
     "(Conforme + Retouché) ÷ Quantité demandée", "%", "SAISIE_PROD colonnes Q, R, T",
     "Mesure la tenue de l'engagement logistique. À distinguer du TRS : une ligne peut être performante et servir en retard.",
     "Contrat de service interne"),
    ("PPM", "Non-conformités internes en parties par million",
     "(Produite − Conforme) ÷ Produite × 1 000 000", "ppm", "SAISIE_PROD colonnes P, Q",
     "Unité de référence des plans qualité. Permet de comparer des volumes de production hétérogènes.",
     "IATF 16949"),
    ("MTBF", "Temps moyen de bon fonctionnement entre deux pannes",
     "Temps de marche ÷ Nombre de pannes", "min", "SAISIE_PROD colonnes AD, N",
     "Mesure la fiabilité du moyen. Un MTBF qui se dégrade annonce une défaillance de fond avant qu'elle ne devienne bloquante.",
     "NF EN 13306"),
    ("MTTR", "Temps moyen de réparation",
     "Minutes de panne ÷ Nombre de pannes", "min", "SAISIE_PROD colonnes H, N",
     "Mesure la maintenabilité et la réactivité de la maintenance : diagnostic, pièces de rechange, procédure d'intervention.",
     "NF EN 13306"),
    ("Taux de présence", "Présentéisme de l'effectif de production",
     "Effectif présent ÷ Effectif prévu", "%", "SAISIE_PROD colonnes V, U",
     "Contextualise les pertes de temps liées au manque de personnel et le recours aux heures supplémentaires.",
     "Suivi RH"),
    ("Criticité (IPR)", "Indice de priorité du risque d'une action",
     "Gravité × Fréquence × Détection (échelle 1 à 5)", "sans unité", "PLAN_ACTIONS colonnes F, G, H",
     "Hiérarchise les actions. Un IPR ≥ 30 impose un traitement prioritaire et une vérification d'efficacité tracée.",
     "Méthode AMDEC"),
    ("Respect des délais", "Tenue des engagements du plan d'actions",
     "Actions terminées sans retard ÷ Actions terminées", "%", "PLAN_ACTIONS colonnes Q, S",
     "Mesure la crédibilité du plan d'actions. Un taux faible traduit un surengagement plutôt qu'un manque de moyens.",
     "Règle d'animation QRQC"),
    ("Taux de polyvalence", "Niveau de maîtrise moyen de l'équipe",
     "Somme des niveaux ÷ (4 × nombre de postes × effectif)", "%", "POLYVALENCE colonnes E à P",
     "Mesure la flexibilité de l'équipe. À lire avec la couverture par poste : une moyenne correcte peut masquer un poste tenu par une seule personne.",
     "Échelle ILUO"),
    ("Mono-compétence", "Poste tenu par une seule personne autonome",
     "Effectif de niveau ≥ 3 sur le poste ≤ 1", "oui / non", "POLYVALENCE ligne de synthèse",
     "Risque majeur de rupture d'activité en cas d'absence. Doit déclencher un plan de formation daté.",
     "Analyse de risque compétences"),
    ("Score 5S", "Niveau de tenue de la zone",
     "Somme des notes pondérées ÷ Somme des notes pondérées maximales", "%", "AUDIT_5S colonnes D à F",
     "La pondération permet d'accorder plus de poids aux critères critiques pour la zone auditée qu'aux critères de confort.",
     "Standard 5S du site"),
    ("Limites de contrôle", "Bornes de variation courante du procédé",
     "Moyenne des TRS journaliers ± 2 écarts-types", "%", "CALC colonnes V4 à V7",
     "Un point hors limite signale une cause spéciale à investiguer ; à l'intérieur, la variation est courante et ne justifie pas de réaction ponctuelle.",
     "Maîtrise statistique des procédés"),
]

REGLES = [
    ("Unité de temps", "Toutes les durées sont saisies en minutes entières. Le classeur ne convertit pas les heures."),
    ("Granularité", "Une ligne de SAISIE_PROD par couple (jour, ligne, équipe). Un enregistrement de ARRETS par arrêt élémentaire."),
    ("Cohérence des quantités", "Quantité produite = conforme au premier passage + retouchée + rebutée. "
                                "La colonne de contrôle de SAISIE_PROD signale tout écart."),
    ("Cohérence des temps", "Temps d'ouverture = arrêts planifiés + arrêts subis + temps de marche. "
                            "La somme des arrêts ne peut pas dépasser le temps requis."),
    ("Arrêts planifiés", "Pauses, maintenance préventive et réunions planifiées sont exclues du temps requis : "
                         "elles n'affectent pas le TRS mais pèsent sur le TRG."),
    ("Cadence nominale", "Elle provient du référentiel produits et non d'une saisie de poste : "
                         "c'est la référence contractuelle qui rend les taux de performance comparables entre eux."),
    ("Arrêt de nuit", "Un arrêt dont l'heure de fin est antérieure à l'heure de début est traité comme un franchissement de minuit."),
    ("Périmètre du cockpit", "Les filtres Ligne et Équipe s'appliquent aux cartes d'indicateurs, au suivi journalier, "
                             "au Pareto, à la cascade des pertes et à l'historique. Les graphiques de comparaison "
                             "« TRS par ligne » et « TRS par équipe » restent volontairement hors filtre pour permettre "
                             "la comparaison ; le plan d'actions et l'audit 5S sont suivis globalement."),
    ("Historique", "Le classeur conserve 200 lignes de saisie et 400 arrêts, soit environ 5 mois d'exploitation "
                   "sur deux lignes. Au-delà, archiver une copie du fichier par exercice."),
    ("Confidentialité", "La matrice de polyvalence contient des données nominatives : "
                        "en restreindre la diffusion au responsable de production et à la fonction RH."),
]


def lisezmoi(wb):
    ws = wb.create_sheet("LISEZ-MOI")
    ws.sheet_view.showGridLines = False
    ws.sheet_properties.tabColor = "0F2A44"
    NC = 12
    title_band(ws, 1, NC, "PILOTAGE DE LA PRODUCTION  —  MODE D'EMPLOI",
               "Classeur de pilotage opérationnel destiné au superviseur de production : "
               "saisie quotidienne, calcul normalisé du TRS, analyse des pertes et animation du plan d'actions.")

    band(ws, 4, 1, NC, "1.  ARCHITECTURE DU CLASSEUR")
    header_row(ws, 5, ["Onglet", "Rôle", "Fréquence", "Responsable", "Ce qui est saisi",
                       "", "", "", "", "", "", ""], height=26)
    for j, (c1, c2) in enumerate([(1, 1), (2, 6), (7, 8), (9, 10), (11, 12)]):
        ws.merge_cells(start_row=5, start_column=c1, end_row=5, end_column=c2)
    for i, ligne in enumerate(ARCHI):
        r = 6 + i
        for j, (c1, c2) in enumerate([(1, 1), (2, 6), (7, 8), (9, 10), (11, 12)]):
            ws.merge_cells(start_row=r, start_column=c1, end_row=r, end_column=c2)
            c = ws.cell(row=r, column=c1, value=ligne[j])
            c.font = f(9, j == 0, STEEL if j == 0 else "1A1A1A")
            c.alignment = Alignment(horizontal="left", vertical="center", indent=1, wrap_text=True)
            for k in range(c1, c2 + 1):
                ws.cell(row=r, column=k).border = BOX
                ws.cell(row=r, column=k).fill = fill(WHITE if i % 2 == 0 else ROWALT)
        ws.row_dimensions[r].height = 26

    r0 = 6 + len(ARCHI) + 1
    band(ws, r0, 1, NC, "2.  LÉGENDE DES COULEURS")
    for i, (bg, fg, titre, txt) in enumerate(LEGENDE):
        r = r0 + 1 + i
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=1)
        c = ws.cell(row=r, column=1, value="  ")
        c.fill = fill(bg)
        c.border = BOX
        ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=4)
        c = ws.cell(row=r, column=2, value=titre)
        c.font = f(9, True, fg)
        c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
        ws.merge_cells(start_row=r, start_column=5, end_row=r, end_column=12)
        c = ws.cell(row=r, column=5, value=txt)
        c.font = f(9)
        c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
        for k in range(1, 13):
            ws.cell(row=r, column=k).border = BOX
        ws.row_dimensions[r].height = 18

    r0 = r0 + len(LEGENDE) + 2
    band(ws, r0, 1, NC, "3.  RITUEL DE MANAGEMENT")
    header_row(ws, r0 + 1, ["Échéance", "Durée", "Contenu", "", "", "", "", "", "", "", "", ""],
               height=22)
    for j, (c1, c2) in enumerate([(1, 2), (3, 3), (4, 12)]):
        ws.merge_cells(start_row=r0 + 1, start_column=c1, end_row=r0 + 1, end_column=c2)
    for i, ligne in enumerate(RITUEL):
        r = r0 + 2 + i
        for j, (c1, c2) in enumerate([(1, 2), (3, 3), (4, 12)]):
            ws.merge_cells(start_row=r, start_column=c1, end_row=r, end_column=c2)
            c = ws.cell(row=r, column=c1, value=ligne[j])
            c.font = f(9, j == 0, STEEL if j == 0 else "1A1A1A")
            c.alignment = Alignment(horizontal="left", vertical="center", indent=1, wrap_text=True)
            for k in range(c1, c2 + 1):
                ws.cell(row=r, column=k).border = BOX
        ws.row_dimensions[r].height = 24

    r0 = r0 + len(RITUEL) + 3
    band(ws, r0, 1, NC, "4.  MISE EN SERVICE  —  à réaliser avant la première saisie")
    for i, txt in enumerate(DEMARRAGE):
        r = r0 + 1 + i
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=12)
        c = ws.cell(row=r, column=1, value=txt)
        c.font = f(9.5)
        c.alignment = Alignment(horizontal="left", vertical="center", indent=1, wrap_text=True)
        ws.row_dimensions[r].height = 30 if len(txt) > 130 else 18

    r0 = r0 + len(DEMARRAGE) + 2
    band(ws, r0, 1, NC, "5.  JEU DE DÉMONSTRATION LIVRÉ AVEC LE CLASSEUR", tone="FFF3D6", color="9C6500")
    demo = ("Le classeur est livré avec un mois complet de données fictives (janvier 2026, deux lignes de production, "
            "42 journées de production, 199 arrêts horodatés, 8 actions correctives, 12 collaborateurs et un audit 5S). "
            "Ces données sont cohérentes entre elles — les arrêts du journal alimentent exactement les rubriques de perte de la saisie — "
            "afin que le cockpit soit immédiatement lisible et que chaque calcul puisse être vérifié. "
            "Elles n'ont aucune valeur métier et doivent être effacées avant la mise en service réelle (voir étape 6 ci-dessus). "
            "Le compteur « actions en retard » se calcule par rapport à la date du jour : les actions de démonstration, "
            "datées de janvier 2026, apparaissent donc en retard dès que le fichier est ouvert plus tard dans l'année.")
    ws.merge_cells(start_row=r0 + 1, start_column=1, end_row=r0 + 3, end_column=12)
    c = ws.cell(row=r0 + 1, column=1, value=demo)
    c.font = f(9.5)
    c.alignment = Alignment(horizontal="left", vertical="top", indent=1, wrap_text=True)
    c.fill = fill("FFF9E8")
    for r in range(r0 + 1, r0 + 4):
        for k in range(1, 13):
            ws.cell(row=r, column=k).fill = fill("FFF9E8")
            ws.cell(row=r, column=k).border = BOX

    widths(ws, {"A": 16, "B": 13, "C": 11, "D": 11, "E": 11, "F": 11, "G": 11, "H": 11,
                "I": 11, "J": 11, "K": 11, "L": 13})
    page(ws, "portrait")
    return ws


def glossaire(wb):
    ws = wb.create_sheet("GLOSSAIRE")
    ws.sheet_view.showGridLines = False
    ws.sheet_properties.tabColor = "7F8C9A"
    NC = 7
    title_band(ws, 1, NC, "GLOSSAIRE DES INDICATEURS ET RÈGLES DE GESTION",
               "Définition, formule appliquée et interprétation de chaque indicateur produit par le classeur. "
               "Document de référence pour l'harmonisation des calculs entre ateliers.")

    band(ws, 4, 1, NC, "1.  INDICATEURS DE PERFORMANCE")
    header_row(ws, 5, ["Indicateur", "Intitulé complet", "Formule appliquée", "Unité",
                       "Données sources", "Interprétation et limites", "Référence"], height=32)
    for i, ligne in enumerate(GLOSSAIRE):
        r = 6 + i
        for j, v in enumerate(ligne):
            c = ws.cell(row=r, column=1 + j, value=v)
            c.font = f(9, j == 0, STEEL if j == 0 else "1A1A1A")
            c.alignment = Alignment(horizontal="left", vertical="top", indent=1, wrap_text=True)
            c.border = BOX
            c.fill = fill(WHITE if i % 2 == 0 else ROWALT)
        ws.row_dimensions[r].height = 40

    r0 = 6 + len(GLOSSAIRE) + 1
    band(ws, r0, 1, NC, "2.  CASCADE DES TEMPS  —  décomposition normalisée")
    cascade = [
        ("Temps d'ouverture (TO)", "Temps pendant lequel le moyen est mis à disposition de la production."),
        ("− Arrêts planifiés", "Pauses légales, maintenance préventive planifiée, réunions et formations programmées."),
        ("= Temps requis (TR)", "Temps pendant lequel la production est attendue. Dénominateur du TRS."),
        ("− Arrêts subis", "Pannes, changements de série, réglages et micro-arrêts, manque matière, manque personnel, autres aléas."),
        ("= Temps de marche (TF)", "Temps pendant lequel le moyen produit effectivement. TF ÷ TR = disponibilité."),
        ("− Perte de cadence", "Écart entre la production réelle et la production théorique à la cadence nominale."),
        ("− Pertes de non-qualité", "Temps consommé à produire les pièces non conformes au premier passage."),
        ("= Temps utile (TU)", "Temps équivalent de production bonne à cadence nominale. TU ÷ TR = TRS."),
    ]
    for i, (etape, txt) in enumerate(cascade):
        r = r0 + 1 + i
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=2)
        c = ws.cell(row=r, column=1, value=etape)
        if etape.startswith("="):
            c.data_type = "s"          # libelle textuel, pas une formule
        jalon = etape.startswith("=") or etape.startswith("Temps d'ouverture")
        c.font = f(9.5, jalon, NAVY if jalon else "1A1A1A")
        c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
        ws.merge_cells(start_row=r, start_column=3, end_row=r, end_column=7)
        c2 = ws.cell(row=r, column=3, value=txt)
        c2.font = f(9)
        c2.alignment = Alignment(horizontal="left", vertical="center", indent=1, wrap_text=True)
        for k in range(1, 8):
            ws.cell(row=r, column=k).border = BOX
            ws.cell(row=r, column=k).fill = fill(LIGHT if jalon else WHITE)
        ws.row_dimensions[r].height = 20

    r0 = r0 + len(cascade) + 2
    band(ws, r0, 1, NC, "3.  RÈGLES DE GESTION DU CLASSEUR")
    for i, (titre, txt) in enumerate(REGLES):
        r = r0 + 1 + i
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=2)
        c = ws.cell(row=r, column=1, value=titre)
        c.font = f(9, True, STEEL)
        c.alignment = Alignment(horizontal="left", vertical="top", indent=1, wrap_text=True)
        ws.merge_cells(start_row=r, start_column=3, end_row=r, end_column=7)
        c2 = ws.cell(row=r, column=3, value=txt)
        c2.font = f(9)
        c2.alignment = Alignment(horizontal="left", vertical="top", indent=1, wrap_text=True)
        for k in range(1, 8):
            ws.cell(row=r, column=k).border = BOX
            ws.cell(row=r, column=k).fill = fill(WHITE if i % 2 == 0 else ROWALT)
        ws.row_dimensions[r].height = 30

    widths(ws, {"A": 18, "B": 30, "C": 40, "D": 10, "E": 26, "F": 56, "G": 22})
    ws.freeze_panes = "A6"
    page(ws, "landscape", title_rows="5:5")
    return ws
