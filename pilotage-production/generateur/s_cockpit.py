# -*- coding: utf-8 -*-
"""Onglet COCKPIT : tableau de bord interactif sur un seul écran."""
from openpyxl.styles import Alignment, Border, Side, Font
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule
from openpyxl.chart import LineChart, BarChart, DoughnutChart, Reference
from openpyxl.chart.series import SeriesLabel
from openpyxl.chart.shapes import GraphicalProperties
from openpyxl.chart.marker import Marker
from openpyxl.chart.title import Title
from openpyxl.chart.text import Text
from openpyxl.chart.data_source import StrRef
from openpyxl.chart.label import DataLabelList
from openpyxl.drawing.line import LineProperties
from openpyxl.utils import get_column_letter as gcl
from common import *
import refs as R
import s_calc as C

NC = 24
CIBLE = 'INDEX(PARAMETRES!$D$16:$D$29,MATCH("{c}",PARAMETRES!$A$16:$A$29,0))'
ALERTE = 'INDEX(PARAMETRES!$E$16:$E$29,MATCH("{c}",PARAMETRES!$A$16:$A$29,0))'
SENS = 'INDEX(PARAMETRES!$F$16:$F$29,MATCH("{c}",PARAMETRES!$A$16:$A$29,0))'

# (code, libellé court, formule, format cellule, format TEXT, suffixe, colonne M-1)
CARTES = [
    ("TRS",      "TRS",              '=IFERROR(CALC!$AC$20/CALC!$AC$18,"")', PCT, '0.0%', "", "L"),
    ("DISPO",    "Disponibilité",    '=IFERROR(CALC!$AC$19/CALC!$AC$18,"")', PCT, '0.0%', "", "M"),
    ("PERF",     "Performance",      '=IFERROR((CALC!$AC$19-CALC!$AC$16)/CALC!$AC$19,"")', PCT, '0.0%', "", "N"),
    ("QUAL",     "Qualité 1er passage", '=IFERROR(CALC!$AC$23/CALC!$AC$22,"")', PCT, '0.0%', "", "O"),
    ("TRG",      "TRG",              '=IFERROR(CALC!$AC$20/CALC!$AC$8,"")', PCT, '0.0%', "", "P"),
    ("SERVICE",  "Taux de service",  '=IFERROR((CALC!$AC$23+CALC!$AC$24)/CALC!$AC$25,"")', PCT, '0.0%', "", "Q"),
    ("PPM",      "Non-conformités",  '=IFERROR((CALC!$AC$22-CALC!$AC$23)/CALC!$AC$22*1000000,"")', PPM, '#,##0', " ppm", None),
    ("PRESENCE", "Taux de présence", '=IFERROR(CALC!$AC$29/CALC!$AC$28,"")', PCT, '0.0%', "", None),
    ("ACCIDENT", "Accidents",        '=CALC!$AC$26', NUM, '0', "", None),
    ("MTBF",     "MTBF",             '=IFERROR(CALC!$AC$19/CALC!$AC$27,"")', MIN, '#,##0', " min", None),
    ("MTTR",     "MTTR",             '=IFERROR(CALC!$AC$10/CALC!$AC$27,"")', MIN, '#,##0', " min", None),
    ("RETARD",   "Actions en retard", '=PLAN_ACTIONS!$D$6', NUM, '0', "", None),
]

FILTRES = [
    ("Année",             1,  3,  2026,     "0",  None),
    ("Mois",              4,  8,  "Janvier", None, "LST_MOIS"),
    ("Ligne",             9,  13, "Toutes",  None, "LST_F_LIGNES"),
    ("Équipe",            14, 18, "Toutes",  None, "LST_F_EQUIPES"),
    ("Indicateur suivi",  19, 24, "TRS",     None, "LST_INDICATEURS"),
]

# lignes d'ancrage des trois rangées de graphiques
GA, GB, GC = 12, 28, 42


def _titre(ref):
    return Title(tx=Text(strRef=StrRef(f=ref)))


def build(wb):
    ws = wb.create_sheet("COCKPIT")
    ws.sheet_view.showGridLines = False
    ws.sheet_properties.tabColor = "0F2A44"
    for col in range(1, NC + 1):
        ws.column_dimensions[gcl(col)].width = 5.8

    title_band(ws, 1, NC, "COCKPIT DE PILOTAGE DE LA PRODUCTION",
               '=PARAMETRES!$C$5&"   |   "&PARAMETRES!$C$6&"   |   "&CALC!$AC$48&'
               '"   |   Édition du "&TEXT(TODAY(),"dd/mm/yyyy")', height=32)
    ws["A1"].font = Font(name=FONT, size=17, bold=True, color=WHITE)
    ws["A2"].font = f(9, False, "4A5A6A", italic=True)
    ws.row_dimensions[3].height = 6

    # ---------------------------------------------------------- barre de filtres
    for lib, c1, c2, defaut, fmt, liste in FILTRES:
        ws.merge_cells(start_row=4, start_column=c1, end_row=4, end_column=c2)
        lab = ws.cell(row=4, column=c1, value=lib.upper())
        lab.font = f(7.5, True, GREY)
        lab.alignment = Alignment(horizontal="center", vertical="bottom")
        ws.merge_cells(start_row=5, start_column=c1, end_row=5, end_column=c2)
        v = ws.cell(row=5, column=c1, value=defaut)
        v.font = f(11, True, "0000FF")
        v.alignment = Alignment(horizontal="center", vertical="center")
        if fmt:
            v.number_format = fmt
        for k in range(c1, c2 + 1):
            ws.cell(row=4, column=k).fill = fill(LIGHT)
            cc = ws.cell(row=5, column=k)
            cc.fill = fill(INPUT_BG)
            cc.border = Border(top=Side(style="thin", color=BORDERCOL),
                               bottom=Side(style="medium", color=STEEL),
                               left=Side(style="thin", color=BORDERCOL) if k == c1 else None,
                               right=Side(style="thin", color=BORDERCOL) if k == c2 else None)
        if liste:
            dv = DataValidation(type="list", formula1=liste, allow_blank=False,
                                showErrorMessage=True, errorTitle="Valeur hors liste",
                                error="Choisir une valeur proposée dans le menu déroulant.")
            ws.add_data_validation(dv)
            dv.add("%s5" % gcl(c1))
    ws.row_dimensions[4].height = 13
    ws.row_dimensions[5].height = 24
    ws.row_dimensions[6].height = 6

    # ---------------------------------------------------------- bandeau d'indicateurs
    for i, (code, lib, formule, fmt, tfmt, suffixe, m1) in enumerate(CARTES):
        rl = 7 if i < 6 else 9
        rv = rl + 1
        c1 = 1 + (i % 6) * 4
        c2 = c1 + 3
        hr = R.STATUT0 + i
        suf = ('&"%s"' % suffixe) if suffixe else ""

        ws.merge_cells(start_row=rl, start_column=c1, end_row=rl, end_column=c2)
        lab = ws.cell(row=rl, column=c1,
                      value='="%s   ·   cible "&TEXT($AB$%d,"%s")%s' % (lib, hr, tfmt, suf))
        lab.font = f(8, True, WHITE)
        lab.alignment = Alignment(horizontal="center", vertical="center")
        for k in range(c1, c2 + 1):
            ws.cell(row=rl, column=k).fill = fill(STEEL)

        ws.merge_cells(start_row=rv, start_column=c1, end_row=rv, end_column=c2)
        v = ws.cell(row=rv, column=c1, value=formule)
        v.font = Font(name=FONT, size=17, bold=True, color=NAVY)
        v.number_format = fmt
        v.alignment = Alignment(horizontal="center", vertical="center")
        for k in range(c1, c2 + 1):
            cc = ws.cell(row=rv, column=k)
            cc.fill = fill(WHITE)
            cc.border = Border(bottom=Side(style="thin", color=BORDERCOL),
                               left=Side(style="thin", color=BORDERCOL) if k == c1 else None,
                               right=Side(style="thin", color=BORDERCOL) if k == c2 else None)

        # bloc technique masqué : Z code, AA valeur, AB cible, AC alerte, AD sens, AE statut
        ws["Z%d" % hr] = code
        ws["AA%d" % hr] = "=%s%d" % (gcl(c1), rv)
        ws["AB%d" % hr] = "=" + CIBLE.format(c=code)
        ws["AC%d" % hr] = "=" + ALERTE.format(c=code)
        ws["AD%d" % hr] = "=" + SENS.format(c=code)
        ws["AE%d" % hr] = ('=IF($AA{r}="","",IF($AD{r}=1,IF($AA{r}>=$AB{r},1,'
                           'IF($AA{r}<$AC{r},3,2)),IF($AA{r}<=$AB{r},1,'
                           'IF($AA{r}>$AC{r},3,2))))').format(r=hr)
        if m1:
            ws["AF%d" % hr] = "=CALC!$%s$%d" % (m1, C.MOIN - 1)
        for col in ("Z", "AA", "AB", "AC", "AD", "AE", "AF"):
            ws["%s%d" % (col, hr)].font = f(8, color=GREY)

        val_rng = "%s%d:%s%d" % (gcl(c1), rv, gcl(c2), rv)
        for statut, bg, fg in ((1, GREEN_BG, GREEN), (2, AMBER_BG, AMBER), (3, RED_BG, RED)):
            ws.conditional_formatting.add(
                val_rng, FormulaRule(formula=['$AE$%d=%d' % (hr, statut)],
                                     fill=fill(bg), font=Font(name=FONT, size=17, bold=True, color=fg)))
        ws.conditional_formatting.add(
            "%s%d:%s%d" % (gcl(c1), rl, gcl(c2), rl),
            FormulaRule(formula=['$AE$%d=3' % hr], fill=fill(RED),
                        font=Font(name=FONT, size=8, bold=True, color=WHITE)))

    for r in (7, 9):
        ws.row_dimensions[r].height = 15
    for r in (8, 10):
        ws.row_dimensions[r].height = 26
    label(ws, "Z5", "Bloc technique — pilotage des couleurs (ne pas modifier)",
          bold=True, size=8, color=GREY)
    for col in ("Z", "AA", "AB", "AC", "AD", "AE", "AF"):
        ws.column_dimensions[col].hidden = True

    ws.row_dimensions[11].height = 6

    # ---------------------------------------------------------- graphiques
    _charts(ws, wb)

    # ---------------------------------------------------------- décisions
    dspans = [(15, 20), (21, 22), (23, 24)]
    for j, titre in enumerate(["Décision prise pendant la revue", "Pilote", "Échéance"]):
        c1, c2 = dspans[j]
        ws.merge_cells(start_row=GC, start_column=c1, end_row=GC, end_column=c2)
        c = ws.cell(row=GC, column=c1, value=titre)
        c.font = f(8, True, WHITE)
        c.alignment = Alignment(horizontal="center", vertical="center")
        for k in range(c1, c2 + 1):
            ws.cell(row=GC, column=k).fill = fill(SLATE)
            ws.cell(row=GC, column=k).border = BOX
    ws.row_dimensions[GC].height = 20
    for i in range(6):
        r = GC + 1 + i
        for c1, c2 in dspans:
            ws.merge_cells(start_row=r, start_column=c1, end_row=r, end_column=c2)
            c = ws.cell(row=r, column=c1)
            c.font = f(9, color="0000FF")
            c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
            for k in range(c1, c2 + 1):
                ws.cell(row=r, column=k).fill = fill(INPUT_BG)
                ws.cell(row=r, column=k).border = BOX
        ws.cell(row=r, column=23).number_format = DATE
        ws.row_dimensions[r].height = 21
    dv = DataValidation(type="list", formula1="LST_PILOTES", allow_blank=True)
    ws.add_data_validation(dv)
    dv.add("%s%d:%s%d" % (gcl(21), GC + 1, gcl(21), GC + 6))

    note(ws, "A57",
         "Les cinq menus déroulants du bandeau pilotent l'ensemble du tableau de bord. "
         "Le menu « indicateur suivi » change simultanément le suivi journalier, la tendance sur 13 mois "
         "et les deux comparaisons du bas : le cockpit se lit de la même façon quel que soit l'indicateur analysé.      "
         "Couleur des cartes : vert = cible atteinte, orange = entre la cible et le seuil d'alerte, rouge = au-delà. "
         "Cibles et seuils se règlent dans l'onglet PARAMETRES ; toute carte rouge appelle une action ouverte le jour même.",
         "A57:X59")

    ws.freeze_panes = "A7"
    page(ws, "landscape", area="A1:X59")
    ws.sheet_view.zoomScale = 70
    return ws


def _serie(ch, i, lib, color, width=22000, dash=None, marker=False):
    s = ch.series[i]
    s.tx = SeriesLabel(v=lib)
    lp = LineProperties(solidFill=color, w=width)
    if dash:
        lp.prstDash = dash
    s.graphicalProperties = GraphicalProperties(ln=lp)
    s.marker = Marker(symbol="circle", size=4) if marker else Marker(symbol="none")
    s.smooth = False


def _charts(ws, wb):
    calc = wb["CALC"]

    # ---- 1. suivi journalier de l'indicateur sélectionné
    ch = LineChart()
    ch.title = _titre("'CALC'!$AC$45")
    ch.height, ch.width = 8.2, 13.4
    for idx in (32, 34, 33):        # AF valeur, AH moyenne mobile, AG cible
        ch.add_data(Reference(calc, min_col=idx, min_row=C.JOUR0, max_row=C.JOURN),
                    titles_from_data=False)
    ch.set_categories(Reference(calc, min_col=1, min_row=C.JOUR0, max_row=C.JOURN))
    _serie(ch, 0, "Valeur du jour", "1F6FB2", 24000, marker=True)
    _serie(ch, 1, "Moyenne mobile 7 jours", "B5651D", 22000)
    _serie(ch, 2, "Cible", "1E7B34", 15000, "dash")
    ch.y_axis.numFmt = "0%"
    ch.y_axis.majorGridlines = None
    ch.x_axis.title = "Jour du mois"
    ws.add_chart(ch, "A%d" % GA)

    # ---- 2. Pareto des pertes de temps
    bar = BarChart()
    bar.type = "col"
    bar.title = "Pareto des pertes de temps subies (minutes)"
    bar.height, bar.width = 8.2, 13.4
    bar.add_data(Reference(calc, min_col=7, min_row=C.PAR0, max_row=C.PARN), titles_from_data=False)
    bar.set_categories(Reference(calc, min_col=6, min_row=C.PAR0, max_row=C.PARN))
    str_categories(bar, "'CALC'!$F$%d:$F$%d" % (C.PAR0, C.PARN))
    bar.series[0].tx = SeriesLabel(v="Minutes perdues")
    bar.series[0].graphicalProperties = GraphicalProperties(solidFill="1F6FB2")
    bar.gapWidth = 45
    bar.y_axis.majorGridlines = None
    cum = LineChart()
    cum.add_data(Reference(calc, min_col=9, min_row=C.PAR0, max_row=C.PARN), titles_from_data=False)
    _serie(cum, 0, "Part cumulée", "C0392B", 22000, marker=True)
    cum.y_axis.axId = 300
    cum.y_axis.numFmt = "0%"
    cum.y_axis.scaling.max = 1
    cum.y_axis.majorGridlines = None
    cum.y_axis.crosses = "max"
    str_categories(cum, "'CALC'!$F$%d:$F$%d" % (C.PAR0, C.PARN))
    bar.y_axis.crosses = "autoZero"
    bar += cum
    ws.add_chart(bar, "%s%d" % (gcl(13), GA))

    # ---- 3. cascade des pertes de temps
    wf = BarChart()
    wf.type = "col"
    wf.grouping = "stacked"
    wf.overlap = 100
    wf.title = "Cascade des pertes (minutes)"
    wf.height, wf.width = 7.1, 6.7
    wf.add_data(Reference(calc, min_col=2, min_row=C.CAS0, max_row=C.CASN), titles_from_data=False)
    wf.add_data(Reference(calc, min_col=3, min_row=C.CAS0, max_row=C.CASN), titles_from_data=False)
    wf.set_categories(Reference(calc, min_col=1, min_row=C.CAS0, max_row=C.CASN))
    str_categories(wf, "'CALC'!$A$%d:$A$%d" % (C.CAS0, C.CASN))
    wf.series[0].tx = SeriesLabel(v="Socle")
    wf.series[1].tx = SeriesLabel(v="Minutes")
    wf.series[0].graphicalProperties = GraphicalProperties(noFill=True)
    wf.series[0].graphicalProperties.line = LineProperties(noFill=True)
    wf.series[1].graphicalProperties = GraphicalProperties(solidFill="35566F")
    wf.gapWidth = 40
    wf.legend = None
    wf.y_axis.majorGridlines = None
    ws.add_chart(wf, "A%d" % GB)

    # ---- 4. tendance sur 13 mois de l'indicateur sélectionné
    hi = LineChart()
    hi.title = _titre("'CALC'!$AC$47")
    hi.height, hi.width = 7.1, 6.7
    hi.add_data(Reference(calc, min_col=18, min_row=C.MOI0, max_row=C.MOIN), titles_from_data=False)
    hi.add_data(Reference(calc, min_col=19, min_row=C.MOI0, max_row=C.MOIN), titles_from_data=False)
    hi.set_categories(Reference(calc, min_col=1, min_row=C.MOI0, max_row=C.MOIN))
    str_categories(hi, "'CALC'!$A$%d:$A$%d" % (C.MOI0, C.MOIN))
    _serie(hi, 0, "Valeur mensuelle", "1F6FB2", 24000, marker=True)
    _serie(hi, 1, "Cible", "1E7B34", 15000, "dash")
    hi.y_axis.numFmt = "0%"
    hi.y_axis.majorGridlines = None
    hi.legend = None
    ws.add_chart(hi, "%s%d" % (gcl(7), GB))

    # ---- 5 et 6. comparaisons par ligne et par équipe
    for col, (r0, rn), ref_titre, couleur in (
            (13, (C.LIG0, C.LIGN), "'CALC'!$AC$46", "1F6FB2"),
            (19, (C.EQU0, C.EQUN), None, "35566F")):
        b = BarChart()
        b.type = "bar"
        if ref_titre:
            b.title = _titre(ref_titre)
        else:
            b.title = "Comparaison des équipes"
        b.height, b.width = 7.1, 6.7
        b.add_data(Reference(calc, min_col=5, min_row=r0, max_row=rn), titles_from_data=False)
        b.set_categories(Reference(calc, min_col=1, min_row=r0, max_row=rn))
        str_categories(b, "'CALC'!$A$%d:$A$%d" % (r0, rn))
        b.series[0].tx = SeriesLabel(v="Indicateur suivi")
        b.series[0].graphicalProperties = GraphicalProperties(solidFill=couleur)
        b.x_axis.numFmt = "0%"
        b.gapWidth = 55
        b.legend = None
        b.dLbls = DataLabelList()
        b.dLbls.showVal = True
        b.dLbls.numFmt = "0.0%"
        ws.add_chart(b, "%s%d" % (gcl(col), GB))

    # ---- 7. top 5 des causes d'arrêt subi
    tc = BarChart()
    tc.type = "bar"
    tc.title = "Top 5 des causes d'arrêt subi (minutes perdues)"
    tc.height, tc.width = 7.1, 9.0
    tc.add_data(Reference(calc, min_col=4, min_row=C.TOP0, max_row=C.TOPN), titles_from_data=False)
    tc.set_categories(Reference(calc, min_col=3, min_row=C.TOP0, max_row=C.TOPN))
    str_categories(tc, "'CALC'!$C$%d:$C$%d" % (C.TOP0, C.TOPN))
    tc.series[0].tx = SeriesLabel(v="Minutes perdues")
    tc.series[0].graphicalProperties = GraphicalProperties(solidFill="C0392B")
    tc.gapWidth = 40
    tc.legend = None
    tc.dLbls = DataLabelList()
    tc.dLbls.showVal = True
    tc.x_axis.majorGridlines = None
    ws.add_chart(tc, "A%d" % GC)

    # ---- 8. avancement du plan d'actions
    dn = DoughnutChart(holeSize=52)
    dn.title = "Plan d'actions"
    dn.height, dn.width = 7.1, 6.7
    dn.add_data(Reference(calc, min_col=2, min_row=C.ACT0, max_row=C.ACTN), titles_from_data=False)
    dn.set_categories(Reference(calc, min_col=1, min_row=C.ACT0, max_row=C.ACTN))
    str_categories(dn, "'CALC'!$A$%d:$A$%d" % (C.ACT0, C.ACTN))
    dn.series[0].tx = SeriesLabel(v="Actions")
    dn.dLbls = DataLabelList()
    dn.dLbls.showVal = True
    ws.add_chart(dn, "%s%d" % (gcl(9), GC))
