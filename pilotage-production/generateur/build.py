# -*- coding: utf-8 -*-
"""Assemblage du classeur Pilotage_Production_Superviseur (version professionnelle)."""
import sys
from openpyxl import Workbook
import data as D
import s_params, s_saisie, s_arrets, s_actions, s_polyv, s_audit, s_poste
import s_calc, s_cockpit, s_anim, s_doc

OUT = sys.argv[1] if len(sys.argv) > 1 else "Pilotage_Production_Superviseur.xlsx"

wb = Workbook()
wb.remove(wb.active)

saisie, arrets = D.generer()

s_params.build(wb)
s_saisie.build(wb, saisie)
s_arrets.build(wb, arrets)
s_actions.build(wb)
s_polyv.build(wb)
s_audit.build(wb)
s_poste.build(wb)
s_calc.build(wb)
s_cockpit.build(wb)
s_anim.build(wb)
s_doc.lisezmoi(wb)
s_doc.glossaire(wb)

ordre = ["LISEZ-MOI", "ANIMATION", "COCKPIT", "SAISIE_PROD", "ARRETS", "PLAN_ACTIONS", "POLYVALENCE",
         "AUDIT_5S", "PRISE_DE_POSTE", "PARAMETRES", "GLOSSAIRE", "CALC"]
wb._sheets = [wb[n] for n in ordre]
wb.active = 1

wb.properties.title = "Pilotage de la production — cockpit superviseur"
wb.properties.subject = "Suivi du TRS, analyse des pertes, plan d'actions, compétences et 5S"
wb.properties.creator = "Classeur de pilotage industriel"
wb.properties.category = "Production / Amélioration continue"

wb.save(OUT)
print("écrit :", OUT, "| onglets :", wb.sheetnames)
