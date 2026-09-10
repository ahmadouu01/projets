# -*- coding: utf-8 -*-
"""Précalcule toutes les réponses de lecture de l'API pour la version un-fichier."""
import json, os, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from erp import api, auth, db, accounting

ADMIN = db.query_one("SELECT * FROM users WHERE username = 'admin'")
FY = int(db.today()[:4])
responses = {}
errors = []

IGNORED = ("limit", "offset", "search")   # filtres appliqués côté navigateur

def key(path, params=None):
    clean = {k: str(v) for k, v in (params or {}).items()
             if v not in (None, "", []) and k not in IGNORED}
    if not clean:
        return path
    return path + "?" + "&".join("%s=%s" % (k, clean[k]) for k in sorted(clean))

def grab(path, params=None):
    try:
        result = api.dispatch("GET", path, {k: str(v) for k, v in (params or {}).items()}, {}, ADMIN)
        responses[key(path, params)] = result
        return result
    except Exception as exc:
        errors.append("%s %s → %s" % (path, params, exc))
        return None

# --- session : un « /api/auth/me » par compte de démonstration
accounts = {}
company = db.query_one("SELECT * FROM companies WHERE code = ?", (db.default_company(),))
years = db.query("SELECT DISTINCT fy FROM fiscal_periods ORDER BY fy DESC")
for row in db.query("SELECT * FROM users WHERE active = 1"):
    accounts[row["username"]] = {"user": auth.public_user(row), "company": company,
                                 "fiscal_years": years}

# --- tableau de bord et états transverses
grab("/api/dashboard"); grab("/api/dashboard", {"fy": FY})
for month in range(1, 13):
    grab("/api/reports/vat", {"year": FY, "month": month})
grab("/api/reports/vat")
grab("/api/reports/audit", {"limit": 400})
for module in ["GL", "AR", "AP", "IN", "MF", "HR", "AB", "ADM"]:
    grab("/api/reports/audit", {"limit": 400, "module": module})

# --- tiers
grab("/api/partners")
for role in ["C", "V", "E"]:
    grab("/api/partners", {"role": role})
for row in db.query("SELECT an8 FROM address_book"):
    grab("/api/partners/%d" % row["an8"])
    grab("/api/partners/%d/statement" % row["an8"])

# --- articles et stocks
grab("/api/items")
for t in ["STOCK", "MATIERE", "FINI", "SERVICE"]:
    grab("/api/items", {"type": t})
for row in db.query("SELECT id FROM items"):
    grab("/api/items/%d" % row["id"])
grab("/api/warehouses")
grab("/api/stock/valuation"); grab("/api/stock/movements"); grab("/api/stock/reorder")
for row in db.query("SELECT code FROM warehouses"):
    grab("/api/stock/valuation", {"warehouse": row["code"]})
    grab("/api/stock/movements", {"warehouse": row["code"]})

# --- ventes
grab("/api/sales/orders")
for status in ["DRAFT", "CONFIRMED", "SHIPPED", "INVOICED", "CANCELLED"]:
    grab("/api/sales/orders", {"status": status})
for row in db.query("SELECT id FROM sales_orders"):
    grab("/api/sales/orders/%d" % row["id"])
grab("/api/sales/invoices")
for status in ["OPEN", "PAID"]:
    grab("/api/sales/invoices", {"status": status})
for row in db.query("SELECT id FROM ar_invoices"):
    grab("/api/sales/invoices/%d" % row["id"])
grab("/api/sales/receipts"); grab("/api/sales/aging")
grab("/api/sales/analysis"); grab("/api/sales/analysis", {"fy": FY})

# --- achats
grab("/api/purchasing/orders")
for status in ["DRAFT", "APPROVED", "RECEIVED", "INVOICED", "CANCELLED"]:
    grab("/api/purchasing/orders", {"status": status})
for row in db.query("SELECT id FROM purchase_orders"):
    grab("/api/purchasing/orders/%d" % row["id"])
grab("/api/purchasing/invoices")
for status in ["OPEN", "PAID"]:
    grab("/api/purchasing/invoices", {"status": status})
for row in db.query("SELECT id FROM ap_invoices"):
    grab("/api/purchasing/invoices/%d" % row["id"])
grab("/api/purchasing/payments"); grab("/api/purchasing/aging")

# --- comptabilité
grab("/api/gl/accounts"); grab("/api/gl/accounts", {"postable": 1})
grab("/api/gl/batches", {"fy": FY})
for status in ["DRAFT", "POSTED", "VOID"]:
    grab("/api/gl/batches", {"fy": FY, "status": status})
for batch_type in ["G", "V", "A", "S", "P", "T"]:
    grab("/api/gl/batches", {"fy": FY, "type": batch_type})
for row in db.query("SELECT id FROM gl_batches"):
    grab("/api/gl/batches/%d" % row["id"])
grab("/api/gl/trial-balance", {"fy": FY})
grab("/api/gl/trial-balance", {"fy": FY, "draft": 1})
for period in range(1, 13):
    grab("/api/gl/trial-balance", {"fy": FY, "period": period})
for row in db.query("SELECT DISTINCT account_code FROM gl_entries"):
    grab("/api/gl/ledger", {"account": row["account_code"], "fy": FY})
grab("/api/gl/income-statement", {"fy": FY, "period": 12})
grab("/api/gl/income-statement", {"fy": FY})
grab("/api/gl/balance-sheet", {"fy": FY, "period": 12})
grab("/api/gl/balance-sheet", {"fy": FY})
grab("/api/gl/integrity"); grab("/api/gl/integrity", {"fy": FY})
grab("/api/gl/periods"); grab("/api/gl/mapping")

# --- production
grab("/api/production/boms")
for row in db.query("SELECT id FROM boms"):
    grab("/api/production/boms/%d" % row["id"])
grab("/api/production/work-orders")
for status in ["PLANNED", "RELEASED", "COMPLETED"]:
    grab("/api/production/work-orders", {"status": status})
for row in db.query("SELECT id FROM work_orders"):
    grab("/api/production/work-orders/%d" % row["id"])
grab("/api/production/requirements")

# --- ressources humaines
grab("/api/hr/employees")
for row in db.query("SELECT id FROM employees"):
    grab("/api/hr/employees/%d" % row["id"])
grab("/api/hr/runs")
for row in db.query("SELECT id FROM payroll_runs"):
    grab("/api/hr/runs/%d" % row["id"])
for row in db.query("SELECT id FROM payslips"):
    grab("/api/hr/payslips/%d" % row["id"])
grab("/api/hr/headcount"); grab("/api/hr/params"); grab("/api/hr/leaves")

# --- administration
grab("/api/admin/users"); grab("/api/admin/roles"); grab("/api/admin/udc")
for system in ["00", "01", "07", "41"]:
    grab("/api/admin/udc", {"system": system})
grab("/api/admin/next-numbers"); grab("/api/admin/companies"); grab("/api/admin/settings")

payload = {"accounts": accounts, "responses": responses,
           "generated_at": db.now(), "fy": FY}
out = json.dumps(payload, ensure_ascii=False, default=str, separators=(",", ":"))
pathlib.Path("/tmp/erp_demo_data.json").write_text(out, encoding="utf-8")
print("réponses :", len(responses), "| erreurs :", len(errors),
      "| taille :", round(len(out.encode()) / 1024), "Ko")
for e in errors[:5]:
    print("  !", e)
