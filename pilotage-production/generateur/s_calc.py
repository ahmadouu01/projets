# -*- coding: utf-8 -*-
"""Onglet CALC : moteur de calcul du cockpit (series, Pareto, cascade, historique)."""
from openpyxl.styles import Alignment
from common import *
import data as D

SP = "SAISIE_PROD"
SR, SL = 5, 204                    # plage de donnees SAISIE_PROD
AR_F, AR_L = 5, 404                # plage de donnees ARRETS

JOUR0, JOURN = 12, 42              # serie journaliere
PAR0, PARN = 46, 53                # Pareto (8 rubriques)
CAS0, CASN = 57, 69                # cascade des pertes
LIG0, LIGN = 72, 76                # TRS par ligne
EQU0, EQUN = 79, 83                # TRS par equipe
MOI0, MOIN = 88, 100               # historique 12 mois (+ mois courant)
ACT0, ACTN = 103, 107              # repartition du plan d'actions
CAU0, CAUN = 110, 149              # causes d'arret (referentiel)
TOP0, TOPN = 152, 156              # top 5 des causes

TOT = {                            # ligne du bloc de totaux -> colonne SAISIE_PROD
    8:  ("Temps d'ouverture TO (min)",        "F"),
    9:  ("Arrêts planifiés (min)",            "G"),
    10: ("Pannes (min)",                      "H"),
    11: ("Changement de série (min)",         "I"),
    12: ("Réglages et micro-arrêts (min)",    "J"),
    13: ("Manque matière (min)",              "K"),
    14: ("Manque personnel (min)",            "L"),
    15: ("Autres arrêts subis (min)",         "M"),
    16: ("Perte de cadence (min)",            "AP"),
    17: ("Pertes non-qualité (min)",          "AQ"),
    18: ("Temps requis TR (min)",             "AB"),
    19: ("Temps de marche TF (min)",          "AD"),
    20: ("Temps utile TU (min)",              "AE"),
    22: ("Quantité produite",                 "P"),
    23: ("Quantité conforme 1er passage",     "Q"),
    24: ("Quantité retouchée",                "R"),
    25: ("Quantité demandée",                 "T"),
    26: ("Accidents avec arrêt",              "X"),
    27: ("Nombre de pannes",                  "N"),
    28: ("Effectif prévu (cumul)",            "U"),
    29: ("Effectif présent (cumul)",          "V"),
}

RUBRIQUES = [
    ("Pannes machine",              "H"),
    ("Changement de série",         "I"),
    ("Réglages et micro-arrêts",    "J"),
    ("Manque matière",              "K"),
    ("Manque personnel",            "L"),
    ("Autres arrêts subis",         "M"),
    ("Perte de cadence",            "AP"),
    ("Pertes non-qualité",          "AQ"),
]

CASCADE = [
    ("Temps d'ouverture",          "0",                      "$V$8",  1),
    ("Arrêts planifiés",           "$V$8-$V$9",              "$V$9",  0),
    ("Temps requis",               "0",                      "$V$18", 1),
    ("Pannes machine",             "$V$18-$V$10",            "$V$10", 0),
    ("Changement de série",        "$V$18-SUM($V$10:$V$11)", "$V$11", 0),
    ("Réglages, micro-arrêts",     "$V$18-SUM($V$10:$V$12)", "$V$12", 0),
    ("Manque matière",             "$V$18-SUM($V$10:$V$13)", "$V$13", 0),
    ("Manque personnel",           "$V$18-SUM($V$10:$V$14)", "$V$14", 0),
    ("Autres arrêts subis",        "$V$18-SUM($V$10:$V$15)", "$V$15", 0),
    ("Temps de marche",            "0",                      "$V$19", 1),
    ("Perte de cadence",           "$V$19-$V$16",            "$V$16", 0),
    ("Pertes non-qualité",         "$V$19-SUM($V$16:$V$17)", "$V$17", 0),
    ("Temps utile",                "0",                      "$V$20", 1),
]


def _sumifs(col, crit_date):
    """SUMIFS sur SAISIE_PROD avec filtre cockpit."""
    return ("SUMIFS({s}!${c}${f}:${c}${l},{s}!$A${f}:$A${l},{d},"
            "{s}!$AS${f}:$AS${l},1)").format(s=SP, c=col, f=SR, l=SL, d=crit_date)


def _sumifs_periode(col):
    return ('SUMIFS({s}!${c}${f}:${c}${l},{s}!$A${f}:$A${l},">="&$B$7,'
            '{s}!$A${f}:$A${l},"<="&$B$8,{s}!$AS${f}:$AS${l},1)').format(
        s=SP, c=col, f=SR, l=SL)


def build(wb):
    ws = wb.create_sheet("CALC")
    ws.sheet_view.showGridLines = False
    ws.sheet_properties.tabColor = "8A9AA8"

    title_band(ws, 1, 20, "MOTEUR DE CALCUL  —  feuille technique, ne pas modifier",
               "Cette feuille agrège les données de saisie selon les filtres du cockpit et alimente l'ensemble des graphiques. "
               "Toute modification manuelle fausse le tableau de bord.")

    def h(ref, txt, size=9.5):
        label(ws, ref, txt, bold=True, size=size, color=STEEL)

    def cell(ref, value, fmt=None, bold=False, color="1A1A1A"):
        c = ws[ref]
        c.value = value
        c.font = f(9, bold, color)
        if fmt:
            c.number_format = fmt
        c.alignment = Alignment(horizontal="center", vertical="center")
        return c

    # ---------------------------------------------------- filtres resolus
    h("A3", "PÉRIMÈTRE RÉSOLU")
    lignes = [("Année", "=COCKPIT!$B$4", "0"), ("Mois", "=COCKPIT!$D$4", "0"),
              ("Ligne", "=COCKPIT!$H$4", None), ("Équipe", "=COCKPIT!$K$4", None),
              ("Début de période", "=DATE($B$3,$B$4,1)", DATE),
              ("Fin de période", "=EOMONTH($B$7,0)", DATE),
              ("Jours de production saisis", "=COUNT($M$%d:$M$%d)" % (JOUR0, JOURN), "0")]
    for i, (lab, formule, fmt) in enumerate(lignes):
        r = 3 + i
        label(ws, "A%d" % r, lab, bold=False, size=9)
        cell("B%d" % r, formule, fmt)

    # ---------------------------------------------------- reperes statistiques
    h("U2", "REPÈRES STATISTIQUES  (colonne V)")
    reperes = [
        ("Cible TRS", '=INDEX(PARAMETRES!$D$16:$D$29,MATCH("TRS",PARAMETRES!$A$16:$A$29,0))', PCT),
        ("Moyenne des TRS journaliers", '=IFERROR(AVERAGE($M$%d:$M$%d),"")' % (JOUR0, JOURN), PCT),
        ("Écart-type des TRS journaliers", '=IFERROR(STDEV($M$%d:$M$%d),"")' % (JOUR0, JOURN), PCT),
        ("Limite de contrôle supérieure (moy. + 2σ)", '=IFERROR(MIN(1,$V$4+2*$V$5),"")', PCT),
        ("Limite de contrôle inférieure (moy. - 2σ)", '=IFERROR(MAX(0,$V$4-2*$V$5),"")', PCT),
    ]
    for i, (lab, formule, fmt) in enumerate(reperes):
        r = 3 + i
        label(ws, "U%d" % r, lab, bold=False, size=9)
        cell("V%d" % r, formule, fmt)

    # ---------------------------------------------------- totaux de periode
    for r, (lab, col) in TOT.items():
        label(ws, "U%d" % r, lab, bold=False, size=9)
        cell("V%d" % r, "=" + _sumifs_periode(col), NUM)
    label(ws, "U21", "— (réservé) —", bold=False, size=9, color=GREY)

    # ---------------------------------------------------- serie journaliere
    band(ws, JOUR0 - 2, 1, 19, "SÉRIE JOURNALIÈRE DU MOIS SÉLECTIONNÉ")
    entetes = ["Jour", "Date", "Temps utile", "Temps requis", "Temps de marche",
               "Temps d'ouverture", "Qté produite", "Qté conforme", "Qté retouchée",
               "Qté demandée", "Accidents", "Arrêts subis", "TRS", "Cible",
               "Moyenne mobile 7 j", "LCS", "LCI", "TRS (graphique)",
               "Moyenne mobile (graphique)"]
    header_row(ws, JOUR0 - 1, entetes, height=34)
    for i in range(JOURN - JOUR0 + 1):
        r = JOUR0 + i
        d = "$B%d" % r
        ws["A%d" % r] = i + 1
        ws["B%d" % r] = '=IF($A%d>DAY($B$8),"",DATE($B$3,$B$4,$A%d))' % (r, r)
        for col, src in (("C", "AE"), ("D", "AB"), ("E", "AD"), ("F", "F"), ("G", "P"),
                         ("H", "Q"), ("I", "R"), ("J", "T"), ("K", "X"), ("L", "AC")):
            ws["%s%d" % (col, r)] = '=IF(%s="","",%s)' % (d, _sumifs(src, d))
        ws["M%d" % r] = '=IF(OR($B%d="",$D%d=0),"",$C%d/$D%d)' % (r, r, r, r)
        ws["N%d" % r] = '=IF($B%d="",NA(),$V$3)' % r
        s = max(JOUR0, r - 6)
        ws["O%d" % r] = '=IF(COUNT($M%d:$M%d)<3,"",AVERAGE($M%d:$M%d))' % (s, r, s, r)
        ws["P%d" % r] = '=IF(OR($B%d="",$V$5=""),NA(),$V$6)' % r
        ws["Q%d" % r] = '=IF(OR($B%d="",$V$5=""),NA(),$V$7)' % r
        ws["R%d" % r] = '=IF($M%d="",NA(),$M%d)' % (r, r)
        ws["S%d" % r] = '=IF($O%d="",NA(),$O%d)' % (r, r)
        for col in "ABCDEFGHIJKLMNOPQRS":
            c = ws["%s%d" % (col, r)]
            c.font = f(9)
            c.alignment = Alignment(horizontal="center", vertical="center")
            c.border = BOX
            if col == "B":
                c.number_format = DATE
            elif col in "MNOPQRS":
                c.number_format = PCT
            elif col != "A":
                c.number_format = NUM
        ws.row_dimensions[r].height = 14

    # ---------------------------------------------------- Pareto
    band(ws, PAR0 - 2, 1, 12, "PARETO DES PERTES DE TEMPS SUBIES  (hors arrêts planifiés)")
    header_row(ws, PAR0 - 1, ["Rubrique de perte", "Minutes perdues", "Valeur départagée",
                              "Rang", "", "Rubrique classée", "Minutes", "Part",
                              "Part cumulée", "", "", ""], height=28)
    tot_par = "SUM($B$%d:$B$%d)" % (PAR0, PARN)
    for i, (lib, col) in enumerate(RUBRIQUES):
        r = PAR0 + i
        ws["A%d" % r] = lib
        ws["B%d" % r] = "=" + _sumifs_periode(col)
        ws["C%d" % r] = '=$B%d+(%d-ROW())/100000' % (r, PARN + 1)
        ws["D%d" % r] = '=RANK($C%d,$C$%d:$C$%d)' % (r, PAR0, PARN)
        k = i + 1
        ws["F%d" % r] = ('=INDEX($A$%d:$A$%d,MATCH(LARGE($C$%d:$C$%d,%d),$C$%d:$C$%d,0))'
                         % (PAR0, PARN, PAR0, PARN, k, PAR0, PARN))
        ws["G%d" % r] = ('=INDEX($B$%d:$B$%d,MATCH(LARGE($C$%d:$C$%d,%d),$C$%d:$C$%d,0))'
                         % (PAR0, PARN, PAR0, PARN, k, PAR0, PARN))
        ws["H%d" % r] = '=IFERROR($G%d/%s,"")' % (r, tot_par)
        ws["I%d" % r] = '=IFERROR(SUM($G$%d:$G%d)/%s,"")' % (PAR0, r, tot_par)
        for col2, fmt in (("A", None), ("B", NUM), ("C", "0.00000"), ("D", "0"),
                          ("F", None), ("G", NUM), ("H", PCT), ("I", PCT)):
            c = ws["%s%d" % (col2, r)]
            c.font = f(9)
            c.border = BOX
            c.number_format = fmt or "General"
            c.alignment = Alignment(horizontal="left" if fmt is None else "center",
                                    vertical="center", indent=1)
        ws.row_dimensions[r].height = 14

    # ---------------------------------------------------- cascade des pertes
    band(ws, CAS0 - 2, 1, 12, "CASCADE DES PERTES DE TEMPS  (du temps d'ouverture au temps utile)")
    header_row(ws, CAS0 - 1, ["Étape", "Socle (invisible)", "Valeur affichée",
                              "Jalon", "", "", "", "", "", "", "", ""], height=26)
    for i, (lib, base, val, jalon) in enumerate(CASCADE):
        r = CAS0 + i
        ws["A%d" % r] = lib
        ws["B%d" % r] = "=" + base if base != "0" else 0
        ws["C%d" % r] = "=" + val
        ws["D%d" % r] = jalon
        for col2 in "ABCD":
            c = ws["%s%d" % (col2, r)]
            c.font = f(9, bool(jalon))
            c.border = BOX
            c.number_format = NUM if col2 in "BC" else "General"
            c.alignment = Alignment(horizontal="left" if col2 == "A" else "center",
                                    vertical="center", indent=1)
        ws.row_dimensions[r].height = 14

    # ---------------------------------------------------- TRS par ligne / equipe
    def bloc_axe(r0, rn, titre, ref_col, saisie_col, param_col):
        band(ws, r0 - 2, 1, 12, titre)
        header_row(ws, r0 - 1, ["Libellé", "Temps utile", "Temps requis", "TRS",
                                "TRS (graphique)", "", "", "", "", "", "", ""], height=26)
        for i in range(rn - r0 + 1):
            r = r0 + i
            ws["A%d" % r] = ('=IF(PARAMETRES!${p}{pr}="","",PARAMETRES!${p}{pr})'
                             .format(p=param_col, pr=7 + i))
            for col, src in (("B", "AE"), ("C", "AB")):
                ws["%s%d" % (col, r)] = (
                    '=IF($A{r}="","",SUMIFS({s}!${c}${f}:${c}${l},{s}!$A${f}:$A${l},">="&$B$7,'
                    '{s}!$A${f}:$A${l},"<="&$B$8,{s}!${x}${f}:${x}${l},$A{r}))'
                ).format(r=r, s=SP, c=src, f=SR, l=SL, x=saisie_col)
            ws["D%d" % r] = '=IF(OR($A{r}="",$C{r}=0),"",$B{r}/$C{r})'.format(r=r)
            ws["E%d" % r] = '=IF($D{r}="",NA(),$D{r})'.format(r=r)
            for col2, fmt in (("A", None), ("B", NUM), ("C", NUM), ("D", PCT), ("E", PCT)):
                c = ws["%s%d" % (col2, r)]
                c.font = f(9)
                c.border = BOX
                c.number_format = fmt or "General"
                c.alignment = Alignment(horizontal="left" if fmt is None else "center",
                                        vertical="center", indent=1)
            ws.row_dimensions[r].height = 14

    bloc_axe(LIG0, LIGN, "TRS PAR LIGNE DE PRODUCTION  (mois sélectionné — comparaison entre lignes, hors filtres du cockpit)", "I", "C", "I")
    bloc_axe(EQU0, EQUN, "TRS PAR ÉQUIPE  (mois sélectionné — comparaison entre équipes, hors filtres du cockpit)", "J", "B", "J")

    # ---------------------------------------------------- historique mensuel
    band(ws, MOI0 - 2, 1, 19, "HISTORIQUE SUR 13 MOIS GLISSANTS  (même périmètre de filtrage)")
    header_row(ws, MOI0 - 1, ["Mois", "Date de début", "Temps utile", "Temps requis",
                              "Temps de marche", "Temps d'ouverture", "Qté produite",
                              "Qté conforme", "Qté retouchée", "Qté demandée", "Accidents",
                              "TRS", "Disponibilité", "Performance", "Qualité RFT", "TRG",
                              "Taux de service", "TRS (graphique)", "Cible (graphique)"],
               height=32)
    for i in range(MOIN - MOI0 + 1):
        r = MOI0 + i
        k = r - MOIN
        ws["B%d" % r] = '=EDATE($B$7,%d)' % k
        ws["A%d" % r] = ('=INDEX(PARAMETRES!$AM$7:$AM$18,MONTH($B{r}))&" "&TEXT(YEAR($B{r}),"0000")'
                         .format(r=r))
        for col, src in (("C", "AE"), ("D", "AB"), ("E", "AD"), ("F", "F"), ("G", "P"),
                         ("H", "Q"), ("I", "R"), ("J", "T"), ("K", "X")):
            ws["%s%d" % (col, r)] = (
                '=SUMIFS({s}!${c}${f}:${c}${l},{s}!$A${f}:$A${l},">="&$B{r},'
                '{s}!$A${f}:$A${l},"<"&EDATE($B{r},1),{s}!$AS${f}:$AS${l},1)'
            ).format(s=SP, c=src, f=SR, l=SL, r=r)
        ws["L%d" % r] = '=IFERROR($C{r}/$D{r},"")'.format(r=r)
        ws["M%d" % r] = '=IFERROR($E{r}/$D{r},"")'.format(r=r)
        ws["N%d" % r] = '=IFERROR($C{r}*($G{r}/$H{r})/$E{r},"")'.format(r=r)
        ws["O%d" % r] = '=IFERROR($H{r}/$G{r},"")'.format(r=r)
        ws["P%d" % r] = '=IFERROR($C{r}/$F{r},"")'.format(r=r)
        ws["Q%d" % r] = '=IFERROR(($H{r}+$I{r})/$J{r},"")'.format(r=r)
        ws["R%d" % r] = '=IF($L{r}="",NA(),$L{r})'.format(r=r)
        ws["S%d" % r] = '=$V$3'
        for col2 in "ABCDEFGHIJKLMNOPQRS":
            c = ws["%s%d" % (col2, r)]
            c.font = f(9, k == 0)
            c.border = BOX
            c.alignment = Alignment(horizontal="center", vertical="center")
            if col2 == "B":
                c.number_format = "mmm yyyy"
            elif col2 in "LMNOPQRS":
                c.number_format = PCT
            elif col2 != "A":
                c.number_format = NUM
        ws["A%d" % r].alignment = Alignment(horizontal="left", vertical="center", indent=1)
        ws.row_dimensions[r].height = 14

    # ---------------------------------------------------- plan d'actions
    band(ws, ACT0 - 2, 1, 12, "RÉPARTITION DU PLAN D'ACTIONS PAR STATUT")
    header_row(ws, ACT0 - 1, ["Statut", "Nombre d'actions", "", "", "", "", "", "", "", "", "", ""],
               height=24)
    for i, st in enumerate(D.STATUTS):
        r = ACT0 + i
        ws["A%d" % r] = st
        ws["B%d" % r] = '=COUNTIF(PLAN_ACTIONS!$Q$9:$Q$128,$A%d)' % r
        for col2 in "AB":
            c = ws["%s%d" % (col2, r)]
            c.font = f(9)
            c.border = BOX
            c.alignment = Alignment(horizontal="left" if col2 == "A" else "center",
                                    vertical="center", indent=1)
        ws.row_dimensions[r].height = 14

    # ---------------------------------------------------- causes d'arret
    band(ws, CAU0 - 2, 1, 12, "ANALYSE DES CAUSES D'ARRÊT SUBI  (source : onglet ARRETS, hors arrêts planifiés)")
    header_row(ws, CAU0 - 1, ["Code", "Libellé", "Minutes", "Occurrences", "Durée moyenne",
                              "Valeur départagée", "", "", "", "", "", ""], height=26)
    for i in range(CAUN - CAU0 + 1):
        r = CAU0 + i
        ws["A%d" % r] = '=IF(PARAMETRES!$R%d="","",PARAMETRES!$R%d)' % (7 + i, 7 + i)
        ws["B%d" % r] = '=IF($A{r}="","",PARAMETRES!$S{p})'.format(r=r, p=7 + i)
        ws["C%d" % r] = ('=IF($A{r}="",0,SUMIFS(ARRETS!$G${f}:$G${l},ARRETS!$A${f}:$A${l},">="&$B$7,'
                         'ARRETS!$A${f}:$A${l},"<="&$B$8,ARRETS!$H${f}:$H${l},$A{r},'
                         'ARRETS!$Q${f}:$Q${l},1,ARRETS!$K${f}:$K${l},"<>Planifié"))').format(r=r, f=AR_F, l=AR_L)
        ws["D%d" % r] = ('=IF($A{r}="",0,COUNTIFS(ARRETS!$A${f}:$A${l},">="&$B$7,'
                         'ARRETS!$A${f}:$A${l},"<="&$B$8,ARRETS!$H${f}:$H${l},$A{r},'
                         'ARRETS!$Q${f}:$Q${l},1,ARRETS!$K${f}:$K${l},"<>Planifié"))').format(r=r, f=AR_F, l=AR_L)
        ws["E%d" % r] = '=IFERROR($C{r}/$D{r},"")'.format(r=r)
        ws["F%d" % r] = '=$C{r}+({n}-ROW())/100000'.format(r=r, n=CAUN + 1)
        for col2, fmt in (("A", None), ("B", None), ("C", NUM), ("D", NUM), ("E", NUM1),
                          ("F", "0.00000")):
            c = ws["%s%d" % (col2, r)]
            c.font = f(9)
            c.border = BOX
            c.number_format = fmt or "General"
            c.alignment = Alignment(horizontal="left" if fmt is None else "center",
                                    vertical="center", indent=1)
        ws.row_dimensions[r].height = 14

    band(ws, TOP0 - 2, 1, 12, "TOP 5 DES CAUSES D'ARRÊT SUBI DE LA PÉRIODE")
    header_row(ws, TOP0 - 1, ["Rang", "Code", "Libellé de la cause", "Minutes perdues",
                              "Occurrences", "Durée moyenne", "Part des arrêts", "",
                              "", "", "", ""], height=26)
    for i in range(TOPN - TOP0 + 1):
        r = TOP0 + i
        k = i + 1
        m = 'MATCH(LARGE($F$%d:$F$%d,%d),$F$%d:$F$%d,0)' % (CAU0, CAUN, k, CAU0, CAUN)
        ws["A%d" % r] = k
        ws["B%d" % r] = '=IFERROR(INDEX($A$%d:$A$%d,%s),"")' % (CAU0, CAUN, m)
        ws["C%d" % r] = '=IFERROR(INDEX($B$%d:$B$%d,%s),"")' % (CAU0, CAUN, m)
        ws["D%d" % r] = '=IFERROR(INDEX($C$%d:$C$%d,%s),"")' % (CAU0, CAUN, m)
        ws["E%d" % r] = '=IFERROR(INDEX($D$%d:$D$%d,%s),"")' % (CAU0, CAUN, m)
        ws["F%d" % r] = '=IFERROR($D%d/$E%d,"")' % (r, r)
        ws["G%d" % r] = '=IFERROR($D%d/SUM($C$%d:$C$%d),"")' % (r, CAU0, CAUN)
        for col2, fmt in (("A", "0"), ("B", None), ("C", None), ("D", NUM), ("E", NUM),
                          ("F", NUM1), ("G", PCT)):
            c = ws["%s%d" % (col2, r)]
            c.font = f(9)
            c.border = BOX
            c.number_format = fmt or "General"
            c.alignment = Alignment(horizontal="left" if fmt is None else "center",
                                    vertical="center", indent=1)
        ws.row_dimensions[r].height = 14

    widths(ws, {"A": 30, "B": 14, "C": 13, "D": 13, "E": 14, "F": 26, "G": 13, "H": 12,
                "I": 13, "J": 13, "K": 11, "L": 13, "M": 11, "N": 11, "O": 15, "P": 10,
                "Q": 10, "R": 14, "S": 16, "U": 30, "V": 14, "X": 32})
    page(ws)
    return ws
