# -*- coding: utf-8 -*-
"""Exporte les données du classeur vers un JSON pour le dashboard web."""
import json, datetime as dt
import data as D
import of_demo

saisie, arrets = D.generer()
cad = {p[0]: p[2] for p in D.PRODUITS}
cause = {c[0]: c for c in D.CAUSES}

jours = []
for s in saisie:
    subi = s["pannes"] + s["cds"] + s["reglages"] + s["matiere"] + s["personnel"] + s["autres"]
    jours.append({
        "d": s["date"].isoformat(), "ligne": s["ligne"], "equipe": s["equipe"],
        "ref": s["ref"], "cad": cad[s["ref"]], "to": s["to"], "plan": s["planifie"],
        "pannes": s["pannes"], "cds": s["cds"], "reg": s["reglages"],
        "mat": s["matiere"], "per": s["personnel"], "aut": s["autres"],
        "npan": s["n_pannes"], "prod": s["produite"], "conf": s["conforme"],
        "ret": s["retouche"], "reb": s["rebut"], "dem": s["demande"],
        "effP": s["eff_prev"], "effR": s["eff_pres"], "acc": s["acc"],
        "presq": s["presq"], "top": s["top"], "subi": subi,
    })

evts = [{"d": a["date"].isoformat(), "ligne": a["ligne"], "equipe": a["equipe"],
         "code": a["code"], "min": a["duree"]} for a in arrets]

out = {
    "meta": {"site": "Site de démonstration", "atelier": "UAP Assemblage-Usinage",
             "periode": "Janvier 2026", "genere": dt.date.today().isoformat()},
    "objectifs": [{"code": o[0], "lib": o[1], "unite": o[2], "cible": o[3],
                   "alerte": o[4], "sens": o[5]} for o in D.OBJECTIFS],
    "lignes": D.LIGNES, "equipes": D.EQUIPES,
    "causes": {c[0]: {"lib": c[1], "fam": c[2], "type": c[3], "rub": c[4]} for c in D.CAUSES},
    "produits": {p[0]: {"des": p[1], "cad": p[2], "ppm": p[3]} for p in D.PRODUITS},
    "jours": jours, "arrets": evts,
    "ofs": of_demo.generer()[0], "dateRef": of_demo.generer()[1],
    "actions": [{"date": a["d"], "src": a["src"], "zone": a["zone"], "pb": a["pb"],
                 "ipr": a["g"] * a["fr"] * a["de"], "fam": a["fam"], "cause": a["cause"],
                 "act": a["act"], "nat": a["nat"], "pil": a["pil"], "cible": a["cible"],
                 "av": a["av"], "st": a["st"], "gain": a["gain"]} for a in D.ACTIONS_DEMO],
    "postes": [{"nom": D.POSTES[i], "crit": D.POSTES_CRIT[i], "cible": D.POSTES_CIBLE[i]}
               for i in range(len(D.POSTES))],
    "equipe": [{"mat": c[0], "nom": c[1], "eq": c[2], "niv": D.NIVEAUX[i]}
               for i, c in enumerate(D.COLLABORATEURS)],
    "audit5s": [{"dom": a[0], "crit": a[2], "pond": a[3], "note": a[4], "n1": a[5]}
                for a in D.AUDIT_5S],
}
p = "../dashboard_data.json"
json.dump(out, open(p, "w"), ensure_ascii=False, separators=(",", ":"))
import os
print("écrit :", p, os.path.getsize(p), "octets |", len(jours), "jours,", len(evts), "arrêts")
