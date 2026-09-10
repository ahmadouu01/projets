# -*- coding: utf-8 -*-
"""Comptabilité générale SunuERP : plan comptable SYSCOHADA, lots d'écritures,
comptabilisation en partie double, balance et états financiers."""
import calendar
from datetime import date

from . import db
from .db import ErpError, money

ACCOUNT_TYPES = ("ACTIF", "PASSIF", "CAPITAUX", "PRODUIT", "CHARGE")

# Clés de correspondance utilisées par les traitements automatiques
MAPPING_KEYS = {
    "AR_CONTROL": "Compte collectif clients",
    "AP_CONTROL": "Compte collectif fournisseurs",
    "VAT_OUT": "TVA facturée (collectée)",
    "VAT_IN": "TVA récupérable sur achats",
    "SALES_GOODS": "Ventes de marchandises",
    "SALES_FINISHED": "Ventes de produits finis",
    "SALES_SERVICES": "Services vendus",
    "INVENTORY_GOODS": "Stock de marchandises",
    "INVENTORY_RAW": "Stock de matières premières",
    "INVENTORY_FINISHED": "Stock de produits finis",
    "COGS": "Variation de stock (coût des ventes)",
    "COGS_RAW": "Variation de stock de matières",
    "GRNI": "Fournisseurs, factures non parvenues",
    "PURCHASE_EXPENSE": "Achats et charges externes par défaut",
    "BANK": "Banque",
    "CASH": "Caisse",
    "WIP": "Production en cours",
    "STOCK_ADJ": "Écarts d'inventaire",
    "PAYROLL_EXPENSE": "Rémunérations du personnel",
    "PAYROLL_EMPLOYER": "Charges sociales patronales",
    "PAYROLL_NET": "Personnel, rémunérations dues",
    "PAYROLL_SOCIAL": "Organismes sociaux (IPRES, CSS)",
    "PAYROLL_TAX": "État, impôts retenus à la source",
    "RESULT": "Résultat de l'exercice",
}


# --------------------------------------------------------------------- comptes
def map_account(key):
    code = db.scalar("SELECT account_code FROM gl_mapping WHERE key = ?", (key,))
    if not code:
        raise ErpError("Aucun compte n'est paramétré pour « %s ». "
                       "Complétez la table de correspondance (Administration)." % key)
    return code


def get_account(code):
    account = db.query_one("SELECT * FROM accounts WHERE code = ?", (code,))
    if not account:
        raise ErpError("Compte comptable inconnu : %s" % code)
    return account


def list_accounts(search=None, only_postable=False):
    sql = "SELECT * FROM accounts WHERE active = 1"
    params = []
    if search:
        sql += " AND (code LIKE ? OR name LIKE ?)"
        params += ["%%%s%%" % search, "%%%s%%" % search]
    if only_postable:
        sql += " AND postable = 1"
    return db.query(sql + " ORDER BY code", tuple(params))


def save_account(data, user):
    code = str(data["code"]).strip()
    if data.get("account_type") not in ACCOUNT_TYPES:
        raise ErpError("Type de compte invalide (ACTIF, PASSIF, CAPITAUX, PRODUIT, CHARGE).")
    payload = {
        "code": code,
        "name": data["name"].strip(),
        "account_type": data["account_type"],
        "class": int(code[0]) if code[:1].isdigit() else None,
        "parent": data.get("parent"),
        "postable": 1 if data.get("postable", 1) else 0,
        "currency": data.get("currency", "XOF"),
        "active": 1 if data.get("active", 1) else 0,
    }
    if db.query_one("SELECT code FROM accounts WHERE code = ?", (code,)):
        payload.pop("code")
        db.update("accounts", payload, "code = ?", (code,))
        db.audit(user["username"], "GL", "UPDATE", "accounts", code)
    else:
        db.insert("accounts", payload)
        db.audit(user["username"], "GL", "CREATE", "accounts", code)
    return get_account(code)


# --------------------------------------------------------------------- calendrier
def generate_fiscal_calendar(company, fy, start_month=1):
    """Crée les douze périodes d'un exercice."""
    created = 0
    for period in range(1, 13):
        month = (start_month - 1 + period - 1) % 12 + 1
        year = fy + ((start_month - 1 + period - 1) // 12)
        last = calendar.monthrange(year, month)[1]
        exists = db.query_one(
            "SELECT 1 FROM fiscal_periods WHERE company = ? AND fy = ? AND period = ?",
            (company, fy, period))
        if exists:
            continue
        db.insert("fiscal_periods", {
            "company": company, "fy": fy, "period": period,
            "date_from": date(year, month, 1).isoformat(),
            "date_to": date(year, month, last).isoformat(),
            "status": "OPEN",
        })
        created += 1
    return created


def set_period_status(company, fy, period, status, user):
    if status not in ("OPEN", "CLOSED"):
        raise ErpError("Statut de période invalide.")
    if status == "CLOSED":
        pending = db.scalar(
            "SELECT count(*) FROM gl_batches WHERE company = ? AND fy = ? AND period = ? "
            "AND status = 'DRAFT'", (company, fy, period), 0)
        if pending:
            raise ErpError("%d lot(s) non comptabilisé(s) sur cette période : "
                           "comptabilisez-les ou annulez-les avant la clôture." % pending)
    db.update("fiscal_periods", {"status": status},
              "company = ? AND fy = ? AND period = ?", (company, fy, period))
    db.audit(user["username"], "GL", "PERIOD_" + status, "fiscal_periods",
             "%s-%s-%s" % (company, fy, period))


# --------------------------------------------------------------------- lots d'écritures
def create_batch(batch_type, description, doc_date, lines, user, company=None,
                 source=None, source_id=None, auto_post=False):
    """Crée un lot d'écritures équilibré.

    lines : [{account, debit, credit, description, business_unit, sub_type, sub_id}]
    """
    company = company or db.default_company()
    db.assert_period_open(doc_date, company)
    fy, period = db.period_of(doc_date, company)

    clean = []
    total_debit = total_credit = 0.0
    for raw in lines:
        debit = money(raw.get("debit", 0))
        credit = money(raw.get("credit", 0))
        if debit < 0 or credit < 0:
            raise ErpError("Les montants au débit et au crédit doivent être positifs.")
        if debit == 0 and credit == 0:
            continue
        if debit > 0 and credit > 0:
            raise ErpError("Une ligne ne peut être à la fois au débit et au crédit.")
        account = get_account(raw["account"])
        if not account["postable"]:
            raise ErpError("Le compte %s est un compte de regroupement : "
                           "il n'accepte pas d'écriture." % account["code"])
        clean.append({
            "account_code": account["code"],
            "business_unit": raw.get("business_unit"),
            "description": (raw.get("description") or description or "")[:200],
            "debit": debit, "credit": credit,
            "sub_type": raw.get("sub_type"), "sub_id": str(raw["sub_id"]) if raw.get("sub_id") else None,
        })
        total_debit += debit
        total_credit += credit

    if not clean:
        raise ErpError("Le lot ne contient aucune ligne mouvementée.")
    if money(total_debit) != money(total_credit):
        raise ErpError("Lot déséquilibré : débit %s ≠ crédit %s."
                       % (money(total_debit), money(total_credit)))

    batch_no = db.next_number("JE", doc_date)
    batch_id = db.insert("gl_batches", {
        "batch_no": batch_no, "batch_type": batch_type, "description": description,
        "doc_date": doc_date, "fy": fy, "period": period, "company": company,
        "status": "DRAFT", "total_debit": money(total_debit), "total_credit": money(total_credit),
        "source": source, "source_id": source_id, "created_by": user["username"],
    })
    for i, line in enumerate(clean, start=1):
        line.update({"batch_id": batch_id, "line_no": i, "doc_date": doc_date,
                     "fy": fy, "period": period, "posted": 0})
        db.insert("gl_entries", line)

    db.audit(user["username"], "GL", "BATCH_CREATE", "gl_batches", batch_id, batch_no)
    if auto_post:
        post_batch(batch_id, user)
    return batch_id


def post_batch(batch_id, user):
    """Comptabilise un lot : les écritures deviennent définitives."""
    batch = db.query_one("SELECT * FROM gl_batches WHERE id = ?", (batch_id,))
    if not batch:
        raise ErpError("Lot introuvable.")
    if batch["status"] == "POSTED":
        raise ErpError("Le lot %s est déjà comptabilisé." % batch["batch_no"])
    if batch["status"] == "VOID":
        raise ErpError("Le lot %s est annulé." % batch["batch_no"])
    if money(batch["total_debit"]) != money(batch["total_credit"]):
        raise ErpError("Lot déséquilibré : comptabilisation refusée.")
    db.assert_period_open(batch["doc_date"], batch["company"])

    db.execute("UPDATE gl_entries SET posted = 1 WHERE batch_id = ?", (batch_id,))
    db.update("gl_batches", {"status": "POSTED", "posted_by": user["username"],
                             "posted_at": db.now()}, "id = ?", (batch_id,))
    db.audit(user["username"], "GL", "BATCH_POST", "gl_batches", batch_id, batch["batch_no"])
    return db.query_one("SELECT * FROM gl_batches WHERE id = ?", (batch_id,))


def void_batch(batch_id, user):
    """Annule un lot non comptabilisé."""
    batch = db.query_one("SELECT * FROM gl_batches WHERE id = ?", (batch_id,))
    if not batch:
        raise ErpError("Lot introuvable.")
    if batch["status"] == "POSTED":
        raise ErpError("Un lot comptabilisé ne s'annule pas : passez une contrepassation.")
    db.update("gl_batches", {"status": "VOID"}, "id = ?", (batch_id,))
    db.audit(user["username"], "GL", "BATCH_VOID", "gl_batches", batch_id, batch["batch_no"])


def reverse_batch(batch_id, user, doc_date=None):
    """Contrepassation d'un lot comptabilisé."""
    batch = db.query_one("SELECT * FROM gl_batches WHERE id = ?", (batch_id,))
    if not batch:
        raise ErpError("Lot introuvable.")
    if batch["status"] != "POSTED":
        raise ErpError("Seul un lot comptabilisé peut être contrepassé.")
    entries = db.query("SELECT * FROM gl_entries WHERE batch_id = ? ORDER BY line_no", (batch_id,))
    doc_date = doc_date or db.today()
    lines = [{
        "account": e["account_code"], "business_unit": e["business_unit"],
        "description": "Contrepassation %s" % batch["batch_no"],
        "debit": e["credit"], "credit": e["debit"],
        "sub_type": e["sub_type"], "sub_id": e["sub_id"],
    } for e in entries]
    return create_batch(batch["batch_type"], "Contrepassation du lot %s" % batch["batch_no"],
                        doc_date, lines, user, company=batch["company"],
                        source="GL", source_id=batch_id, auto_post=True)


def list_batches(status=None, fy=None, period=None, batch_type=None, limit=200):
    sql = ("SELECT b.*, (SELECT count(*) FROM gl_entries e WHERE e.batch_id = b.id) AS lines "
           "FROM gl_batches b WHERE 1 = 1")
    params = []
    if status:
        sql += " AND b.status = ?"
        params.append(status)
    if fy:
        sql += " AND b.fy = ?"
        params.append(fy)
    if period:
        sql += " AND b.period = ?"
        params.append(period)
    if batch_type:
        sql += " AND b.batch_type = ?"
        params.append(batch_type)
    sql += " ORDER BY b.id DESC LIMIT ?"
    params.append(limit)
    return db.query(sql, tuple(params))


def batch_detail(batch_id):
    batch = db.query_one("SELECT * FROM gl_batches WHERE id = ?", (batch_id,))
    if not batch:
        raise ErpError("Lot introuvable.")
    batch["lines"] = db.query(
        "SELECT e.*, a.name AS account_name FROM gl_entries e "
        "JOIN accounts a ON a.code = e.account_code "
        "WHERE e.batch_id = ? ORDER BY e.line_no", (batch_id,))
    return batch


# --------------------------------------------------------------------- restitutions
def trial_balance(fy, period_to=None, company=None, posted_only=True):
    """Balance générale cumulée jusqu'à la période demandée."""
    company = company or db.default_company()
    params = [company, fy]
    sql = ("SELECT e.account_code, a.name, a.account_type, a.class, "
           "       SUM(e.debit) AS debit, SUM(e.credit) AS credit "
           "FROM gl_entries e "
           "JOIN accounts a ON a.code = e.account_code "
           "JOIN gl_batches b ON b.id = e.batch_id "
           "WHERE b.company = ? AND e.fy = ? ")
    if posted_only:
        sql += "AND e.posted = 1 "
    else:
        sql += "AND b.status <> 'VOID' "
    if period_to:
        sql += "AND e.period <= ? "
        params.append(period_to)
    sql += "GROUP BY e.account_code, a.name, a.account_type, a.class ORDER BY e.account_code"

    rows = db.query(sql, tuple(params))
    for row in rows:
        debit, credit = money(row["debit"]), money(row["credit"])
        row["debit"], row["credit"] = debit, credit
        balance = debit - credit
        row["balance_debit"] = money(balance) if balance > 0 else 0
        row["balance_credit"] = money(-balance) if balance < 0 else 0
    return rows


def account_ledger(account_code, fy, date_from=None, date_to=None, company=None):
    """Grand livre d'un compte, avec solde progressif."""
    company = company or db.default_company()
    params = [company, account_code, fy]
    sql = ("SELECT e.*, b.batch_no, b.status, b.description AS batch_description "
           "FROM gl_entries e JOIN gl_batches b ON b.id = e.batch_id "
           "WHERE b.company = ? AND e.account_code = ? AND e.fy = ? AND b.status <> 'VOID' ")
    if date_from:
        sql += "AND e.doc_date >= ? "
        params.append(date_from)
    if date_to:
        sql += "AND e.doc_date <= ? "
        params.append(date_to)
    sql += "ORDER BY e.doc_date, e.id"
    rows = db.query(sql, tuple(params))
    running = 0.0
    for row in rows:
        running += money(row["debit"]) - money(row["credit"])
        row["running_balance"] = money(running)
    return rows


def _sum_by_type(fy, period_to, company, account_types):
    rows = trial_balance(fy, period_to, company)
    total = 0.0
    for row in rows:
        if row["account_type"] in account_types:
            total += row["debit"] - row["credit"]
    return money(total)


def income_statement(fy, period_to=12, company=None):
    """Compte de résultat : produits, charges, résultat."""
    company = company or db.default_company()
    rows = trial_balance(fy, period_to, company)
    products, charges = [], []
    total_products = total_charges = 0.0
    for row in rows:
        net = row["debit"] - row["credit"]
        if row["account_type"] == "PRODUIT":
            amount = money(-net)
            if amount:
                products.append({"code": row["account_code"], "name": row["name"], "amount": amount})
                total_products += amount
        elif row["account_type"] == "CHARGE":
            amount = money(net)
            if amount:
                charges.append({"code": row["account_code"], "name": row["name"], "amount": amount})
                total_charges += amount
    return {
        "fy": fy, "period_to": period_to,
        "products": products, "charges": charges,
        "total_products": money(total_products),
        "total_charges": money(total_charges),
        "result": money(total_products - total_charges),
    }


def balance_sheet(fy, period_to=12, company=None):
    """Bilan : actif, passif, capitaux propres, résultat de l'exercice."""
    company = company or db.default_company()
    rows = trial_balance(fy, period_to, company)
    assets, liabilities, equity = [], [], []
    total_assets = total_liabilities = total_equity = 0.0
    for row in rows:
        net = row["debit"] - row["credit"]
        if row["account_type"] == "ACTIF":
            amount = money(net)
            if amount:
                assets.append({"code": row["account_code"], "name": row["name"], "amount": amount})
                total_assets += amount
        elif row["account_type"] == "PASSIF":
            amount = money(-net)
            if amount:
                liabilities.append({"code": row["account_code"], "name": row["name"], "amount": amount})
                total_liabilities += amount
        elif row["account_type"] == "CAPITAUX":
            amount = money(-net)
            if amount:
                equity.append({"code": row["account_code"], "name": row["name"], "amount": amount})
                total_equity += amount
    result = income_statement(fy, period_to, company)["result"]
    return {
        "fy": fy, "period_to": period_to,
        "assets": assets, "liabilities": liabilities, "equity": equity,
        "total_assets": money(total_assets),
        "total_liabilities": money(total_liabilities),
        "total_equity": money(total_equity),
        "result": result,
        "total_equity_and_liabilities": money(total_liabilities + total_equity + result),
        "balanced": money(total_assets) == money(total_liabilities + total_equity + result),
    }


def integrity_check(fy=None, company=None):
    """Contrôles d'intégrité, à la manière des états d'intégrité de JD Edwards."""
    company = company or db.default_company()
    checks = []

    unbalanced = db.query(
        "SELECT batch_no, total_debit, total_credit FROM gl_batches "
        "WHERE company = ? AND ABS(total_debit - total_credit) > 0.5 AND status <> 'VOID'",
        (company,))
    checks.append({
        "code": "F0911-1", "label": "Lots d'écritures déséquilibrés",
        "anomalies": len(unbalanced), "details": unbalanced[:20]})

    orphans = db.query(
        "SELECT e.id, e.account_code FROM gl_entries e "
        "LEFT JOIN accounts a ON a.code = e.account_code WHERE a.code IS NULL LIMIT 20")
    checks.append({
        "code": "F0911-2", "label": "Écritures sur un compte inexistant",
        "anomalies": len(orphans), "details": orphans})

    ar_control = map_account("AR_CONTROL")
    gl_ar = db.scalar(
        "SELECT COALESCE(SUM(e.debit - e.credit), 0) FROM gl_entries e "
        "JOIN gl_batches b ON b.id = e.batch_id "
        "WHERE e.account_code = ? AND e.posted = 1 AND b.company = ?",
        (ar_control, company), 0)
    ar_open = db.scalar(
        "SELECT COALESCE(SUM(total_ttc - amount_paid), 0) FROM ar_invoices "
        "WHERE status IN ('OPEN', 'PARTIAL')", (), 0)
    checks.append({
        "code": "F03B11", "label": "Balance âgée clients ↔ compte collectif 411",
        "anomalies": 0 if abs(money(gl_ar) - money(ar_open)) < 1 else 1,
        "details": [{"grand_livre": money(gl_ar), "encours_clients": money(ar_open)}]})

    ap_control = map_account("AP_CONTROL")
    gl_ap = db.scalar(
        "SELECT COALESCE(SUM(e.credit - e.debit), 0) FROM gl_entries e "
        "JOIN gl_batches b ON b.id = e.batch_id "
        "WHERE e.account_code = ? AND e.posted = 1 AND b.company = ?",
        (ap_control, company), 0)
    ap_open = db.scalar(
        "SELECT COALESCE(SUM(total_ttc - amount_paid), 0) FROM ap_invoices "
        "WHERE status IN ('OPEN', 'PARTIAL')", (), 0)
    checks.append({
        "code": "F0411", "label": "Balance âgée fournisseurs ↔ compte collectif 401",
        "anomalies": 0 if abs(money(gl_ap) - money(ap_open)) < 1 else 1,
        "details": [{"grand_livre": money(gl_ap), "encours_fournisseurs": money(ap_open)}]})

    negative_stock = db.query(
        "SELECT i.item_code, s.warehouse, s.qty_on_hand FROM stock s "
        "JOIN items i ON i.id = s.item_id WHERE s.qty_on_hand < 0 LIMIT 20")
    checks.append({
        "code": "F41021", "label": "Stocks négatifs",
        "anomalies": len(negative_stock), "details": negative_stock})

    return {"company": company, "fy": fy, "checks": checks,
            "total_anomalies": sum(c["anomalies"] for c in checks)}
