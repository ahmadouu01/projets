# -*- coding: utf-8 -*-
"""Jeu de démonstration des ordres de fabrication (planification, retards, encours)."""
import datetime as dt, random
import data as D

random.seed(4021)
REF = dt.date(2026, 1, 31)          # date de référence de l'analyse
CLIENTS = ["AUTOMOTIVE SA", "NORDIC MACHINES", "GROUPE VALTEC", "SIDER INDUSTRIE",
           "MECAPLUS", "ATLANTIQUE EQUIP."]
LIGNES = D.LIGNES
PROD = D.PRODUITS


def ouvre(d):
    while d.weekday() >= 5:
        d += dt.timedelta(days=1)
    return d


def generer():
    ofs = []
    n = 0
    # OF soldés (décembre-janvier), en cours, en retard, et planifiés (février-mars)
    plan = [("Soldé", -46, -6, 26), ("En cours", -12, 6, 12),
            ("Planifié", 2, 46, 26), ("Retard", -20, -2, 9)]
    for statut, j0, j1, nb in plan:
        for i in range(nb):
            n += 1
            ligne = LIGNES[(n + i) % len(LIGNES)]
            p = PROD[(n * 3 + i) % len(PROD)]
            deb = ouvre(REF + dt.timedelta(days=j0 + int((j1 - j0) * i / max(1, nb - 1))))
            duree = 1 + (n % 4)
            fin = ouvre(deb + dt.timedelta(days=duree))
            qte = int(p[2] * 60 * (5 + n % 9)) // 10 * 10
            st = statut
            debR = finR = None
            realise = 0
            if statut == "Soldé":
                debR, finR = deb, ouvre(fin + dt.timedelta(days=(1 if n % 5 == 0 else 0)))
                realise = qte - (n % 7) * 3
                st = "Soldé"
            elif statut == "En cours":
                debR = min(deb, REF)
                realise = int(qte * (0.15 + ((n * 17) % 70) / 100))
                st = "En cours"
            elif statut == "Retard":
                debR = deb
                realise = int(qte * (0.3 + ((n * 13) % 55) / 100))
                st = "En cours"
            else:
                st = "Planifié"
            ofs.append({
                "of": "OF-%05d" % (24100 + n), "ligne": ligne, "ref": p[0], "des": p[1],
                "client": CLIENTS[n % len(CLIENTS)],
                "qte": qte, "fait": max(0, realise),
                "debP": deb.isoformat(), "finP": fin.isoformat(),
                "debR": debR.isoformat() if debR else "",
                "finR": finR.isoformat() if finR else "",
                "statut": st, "prio": ["Normale", "Normale", "Haute", "Normale", "Urgente"][n % 5],
            })
    return ofs, REF.isoformat()


if __name__ == "__main__":
    o, r = generer()
    import collections
    print(len(o), "OF | réf", r)
    print(collections.Counter(x["statut"] for x in o))
    ref = dt.date.fromisoformat(r)
    retard = [x for x in o if x["statut"] != "Soldé" and dt.date.fromisoformat(x["finP"]) < ref]
    encours = [x for x in o if x["statut"] == "En cours"]
    avenir = [x for x in o if x["statut"] == "Planifié"]
    print("en retard:", len(retard), "| encours:", len(encours), "| à venir:", len(avenir))
    print("qté en retard:", sum(x["qte"] - x["fait"] for x in retard))
