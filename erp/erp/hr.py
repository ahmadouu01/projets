# -*- coding: utf-8 -*-
"""Ressources humaines et paie (paramétrage sénégalais).

Les taux et barèmes ci-dessous sont paramétrables : ils sont lus dans la table
`settings` (clés payroll_*) et retombent sur les valeurs par défaut décrites ici.
Ils doivent être validés avec votre expert-comptable avant toute paie réelle.
"""
import json

from . import accounting, db
from .db import ErpError, money

DEFAULT_PARAMS = {
    # Retraite IPRES — régime général
    "ipres_rg_employee": 5.6, "ipres_rg_employer": 8.4, "ipres_rg_ceiling": 432000,
    # Retraite IPRES — régime complémentaire cadres
    "ipres_cc_employee": 2.4, "ipres_cc_employer": 3.6, "ipres_cc_ceiling": 1296000,
    # Caisse de sécurité sociale : prestations familiales et accidents du travail
    "css_pf_employer": 7.0, "css_at_employer": 3.0, "css_ceiling": 63000,
    # Institution de prévoyance maladie
    "ipm_employee": 3.0, "ipm_employer": 3.0, "ipm_ceiling": 250000,
    # Indemnité de transport exonérée d'impôt
    "transport_exempt": 26000,
    # Barème annuel de l'impôt sur le revenu (tranche, taux %)
    "ir_brackets": [[630000, 0], [1500000, 20], [4000000, 30],
                    [8000000, 35], [13500000, 37], [None, 40]],
    # Réduction pour charge de famille (% par personne à charge, plafonnée)
    "ir_family_reduction_pct": 10.0, "ir_family_reduction_max_pct": 40.0,
    # TRIMF annuelle par tranche de revenu annuel
    "trimf_brackets": [[600000, 900], [1000000, 3600], [2000000, 4800],
                       [7000000, 12000], [12000000, 18000], [None, 36000]],
}


def params():
    stored = db.get_setting("payroll_params")
    values = dict(DEFAULT_PARAMS)
    if stored:
        try:
            values.update(json.loads(stored))
        except ValueError:
            pass
    return values


def save_params(new_values, user):
    values = dict(DEFAULT_PARAMS)
    values.update(new_values or {})
    db.set_setting("payroll_params", json.dumps(values))
    db.audit(user["username"], "HR", "SAVE_PARAMS", "settings", "payroll_params")
    return values


# --------------------------------------------------------------------- salariés
def list_employees(search=None, active_only=True, business_unit=None):
    sql = ("SELECT e.*, bu.name AS bu_name, (e.last_name || ' ' || e.first_name) AS full_name "
           "FROM employees e LEFT JOIN business_units bu ON bu.code = e.business_unit WHERE 1 = 1")
    par = []
    if active_only:
        sql += " AND e.active = 1"
    if business_unit:
        sql += " AND e.business_unit = ?"
        par.append(business_unit)
    if search:
        like = "%%%s%%" % search
        sql += " AND (e.matricule LIKE ? OR e.first_name LIKE ? OR e.last_name LIKE ? "
        sql += "OR e.position LIKE ?)"
        par += [like, like, like, like]
    return db.query(sql + " ORDER BY e.last_name, e.first_name", tuple(par))


def get_employee(employee_id):
    employee = db.query_one("SELECT * FROM employees WHERE id = ?", (employee_id,))
    if not employee:
        raise ErpError("Salarié introuvable (%s)." % employee_id)
    employee["payslips"] = db.query(
        "SELECT p.*, r.run_no, r.fy, r.period, r.pay_date, r.status FROM payslips p "
        "JOIN payroll_runs r ON r.id = p.run_id WHERE p.employee_id = ? "
        "ORDER BY r.fy DESC, r.period DESC", (employee_id,))
    employee["leaves"] = db.query(
        "SELECT * FROM leave_requests WHERE employee_id = ? ORDER BY date_from DESC",
        (employee_id,))
    return employee


def save_employee(data, user):
    payload = {
        "matricule": data.get("matricule") or _next_matricule(),
        "an8": data.get("an8"),
        "first_name": data["first_name"].strip(),
        "last_name": data["last_name"].strip().upper(),
        "gender": data.get("gender"),
        "birth_date": data.get("birth_date"),
        "hire_date": data.get("hire_date") or db.today(),
        "end_date": data.get("end_date"),
        "position": data.get("position"),
        "business_unit": data.get("business_unit"),
        "contract_type": data.get("contract_type", "CDI"),
        "base_salary": money(data.get("base_salary", 0)),
        "housing_allowance": money(data.get("housing_allowance", 0)),
        "transport_allowance": money(data.get("transport_allowance", 0)),
        "seniority_pct": float(data.get("seniority_pct", 0) or 0),
        "dependents": int(data.get("dependents", 0) or 0),
        "bank_account": data.get("bank_account"),
        "payment_method": data.get("payment_method", "VIREMENT"),
        "social_number": data.get("social_number"),
        "active": 1 if data.get("active", 1) else 0,
    }
    employee_id = data.get("id")
    if employee_id:
        db.update("employees", payload, "id = ?", (employee_id,))
        db.audit(user["username"], "HR", "UPDATE", "employees", employee_id)
    else:
        employee_id = db.insert("employees", payload)
        db.audit(user["username"], "HR", "CREATE", "employees", employee_id)
    return get_employee(employee_id)


def _next_matricule():
    last = db.scalar("SELECT matricule FROM employees ORDER BY id DESC LIMIT 1")
    number = int(str(last)[-4:]) + 1 if last and str(last)[-4:].isdigit() else 1
    return "MAT%04d" % number


# --------------------------------------------------------------------- calcul de paie
def compute_payslip(employee, cfg=None, extra_earnings=None, other_deductions=0):
    """Calcule un bulletin : gains, retenues salariales, impôts, charges patronales."""
    cfg = cfg or params()
    base = money(employee["base_salary"])
    seniority = money(base * float(employee["seniority_pct"] or 0) / 100.0)
    housing = money(employee["housing_allowance"])
    transport = money(employee["transport_allowance"])
    extras = money(sum(e["amount"] for e in (extra_earnings or [])))

    gross = money(base + seniority + housing + transport + extras)
    lines = [
        {"code": "SALBASE", "label": "Salaire de base", "line_type": "GAIN",
         "base": base, "rate": 100, "amount": base},
    ]
    if seniority:
        lines.append({"code": "ANCIEN", "label": "Prime d'ancienneté", "line_type": "GAIN",
                      "base": base, "rate": employee["seniority_pct"], "amount": seniority})
    if housing:
        lines.append({"code": "LOGEMENT", "label": "Indemnité de logement", "line_type": "GAIN",
                      "base": 0, "rate": 0, "amount": housing})
    if transport:
        lines.append({"code": "TRANSPORT", "label": "Indemnité de transport", "line_type": "GAIN",
                      "base": 0, "rate": 0, "amount": transport})
    for extra in (extra_earnings or []):
        lines.append({"code": extra.get("code", "PRIME"), "label": extra.get("label", "Prime"),
                      "line_type": "GAIN", "base": 0, "rate": 0,
                      "amount": money(extra["amount"])})

    # ---- cotisations sociales
    social_base = money(base + seniority + housing + extras)
    is_executive = (employee.get("contract_type") == "CADRE"
                    or (employee.get("position") or "").lower().startswith(("directeur", "chef",
                                                                            "responsable")))
    employee_cont = 0.0
    employer_cont = 0.0

    rg_base = min(social_base, cfg["ipres_rg_ceiling"])
    rg_emp = money(rg_base * cfg["ipres_rg_employee"] / 100.0)
    rg_pat = money(rg_base * cfg["ipres_rg_employer"] / 100.0)
    employee_cont += rg_emp
    employer_cont += rg_pat
    lines.append({"code": "IPRES_RG", "label": "IPRES régime général", "line_type": "RETENUE",
                  "base": rg_base, "rate": cfg["ipres_rg_employee"], "amount": rg_emp})
    lines.append({"code": "IPRES_RG_P", "label": "IPRES régime général (patronale)",
                  "line_type": "PATRONALE", "base": rg_base,
                  "rate": cfg["ipres_rg_employer"], "amount": rg_pat})

    if is_executive:
        cc_base = min(social_base, cfg["ipres_cc_ceiling"])
        cc_emp = money(cc_base * cfg["ipres_cc_employee"] / 100.0)
        cc_pat = money(cc_base * cfg["ipres_cc_employer"] / 100.0)
        employee_cont += cc_emp
        employer_cont += cc_pat
        lines.append({"code": "IPRES_CC", "label": "IPRES complémentaire cadres",
                      "line_type": "RETENUE", "base": cc_base,
                      "rate": cfg["ipres_cc_employee"], "amount": cc_emp})
        lines.append({"code": "IPRES_CC_P", "label": "IPRES cadres (patronale)",
                      "line_type": "PATRONALE", "base": cc_base,
                      "rate": cfg["ipres_cc_employer"], "amount": cc_pat})

    ipm_base = min(social_base, cfg["ipm_ceiling"])
    ipm_emp = money(ipm_base * cfg["ipm_employee"] / 100.0)
    ipm_pat = money(ipm_base * cfg["ipm_employer"] / 100.0)
    employee_cont += ipm_emp
    employer_cont += ipm_pat
    lines.append({"code": "IPM", "label": "Prévoyance maladie (IPM)", "line_type": "RETENUE",
                  "base": ipm_base, "rate": cfg["ipm_employee"], "amount": ipm_emp})
    lines.append({"code": "IPM_P", "label": "Prévoyance maladie (patronale)",
                  "line_type": "PATRONALE", "base": ipm_base,
                  "rate": cfg["ipm_employer"], "amount": ipm_pat})

    css_base = min(social_base, cfg["css_ceiling"])
    pf = money(css_base * cfg["css_pf_employer"] / 100.0)
    at = money(css_base * cfg["css_at_employer"] / 100.0)
    employer_cont += pf + at
    lines.append({"code": "CSS_PF", "label": "CSS prestations familiales",
                  "line_type": "PATRONALE", "base": css_base,
                  "rate": cfg["css_pf_employer"], "amount": pf})
    lines.append({"code": "CSS_AT", "label": "CSS accidents du travail",
                  "line_type": "PATRONALE", "base": css_base,
                  "rate": cfg["css_at_employer"], "amount": at})

    # ---- impôt sur le revenu et TRIMF
    exempt_transport = min(transport, cfg["transport_exempt"])
    taxable_month = money(gross - employee_cont - exempt_transport)
    taxable_year = money(taxable_month * 12)

    tax_year = 0.0
    previous = 0
    for ceiling, rate in cfg["ir_brackets"]:
        top = taxable_year if ceiling is None else min(taxable_year, ceiling)
        if top > previous:
            tax_year += (top - previous) * rate / 100.0
        previous = ceiling if ceiling is not None else previous
        if ceiling is not None and taxable_year <= ceiling:
            break
    reduction_pct = min(float(employee["dependents"] or 0) * cfg["ir_family_reduction_pct"],
                        cfg["ir_family_reduction_max_pct"])
    tax_year = money(tax_year * (1 - reduction_pct / 100.0))

    trimf_year = 0
    for ceiling, amount in cfg["trimf_brackets"]:
        if ceiling is None or taxable_year <= ceiling:
            trimf_year = amount
            break

    income_tax = money(tax_year / 12.0)
    trimf = money(trimf_year / 12.0)
    if income_tax:
        lines.append({"code": "IR", "label": "Impôt sur le revenu", "line_type": "RETENUE",
                      "base": taxable_month, "rate": 0, "amount": income_tax})
    if trimf:
        lines.append({"code": "TRIMF", "label": "TRIMF", "line_type": "RETENUE",
                      "base": taxable_month, "rate": 0, "amount": trimf})

    other_deductions = money(other_deductions)
    if other_deductions:
        lines.append({"code": "AUTRES", "label": "Autres retenues", "line_type": "RETENUE",
                      "base": 0, "rate": 0, "amount": other_deductions})

    total_tax = money(income_tax + trimf)
    net = money(gross - employee_cont - total_tax - other_deductions)
    return {
        "gross": gross, "taxable": taxable_month, "employee_cont": money(employee_cont),
        "income_tax": total_tax, "other_deductions": other_deductions, "net_pay": net,
        "employer_cont": money(employer_cont), "total_cost": money(gross + employer_cont),
        "lines": lines,
    }


# --------------------------------------------------------------------- campagnes de paie
def list_runs(limit=50):
    return db.query(
        "SELECT r.*, (SELECT count(*) FROM payslips p WHERE p.run_id = r.id) AS employees "
        "FROM payroll_runs r ORDER BY r.fy DESC, r.period DESC LIMIT ?", (limit,))


def get_run(run_id):
    run = db.query_one("SELECT * FROM payroll_runs WHERE id = ?", (run_id,))
    if not run:
        raise ErpError("Campagne de paie introuvable (%s)." % run_id)
    run["payslips"] = db.query(
        "SELECT p.*, e.matricule, e.last_name, e.first_name, e.position "
        "FROM payslips p JOIN employees e ON e.id = p.employee_id "
        "WHERE p.run_id = ? ORDER BY e.last_name", (run_id,))
    return run


def get_payslip(payslip_id):
    payslip = db.query_one(
        "SELECT p.*, e.matricule, e.last_name, e.first_name, e.position, e.business_unit, "
        "       e.dependents, r.run_no, r.fy, r.period, r.pay_date, r.status "
        "FROM payslips p JOIN employees e ON e.id = p.employee_id "
        "JOIN payroll_runs r ON r.id = p.run_id WHERE p.id = ?", (payslip_id,))
    if not payslip:
        raise ErpError("Bulletin introuvable (%s)." % payslip_id)
    payslip["lines"] = db.query(
        "SELECT * FROM payslip_lines WHERE payslip_id = ? ORDER BY id", (payslip_id,))
    return payslip


def create_run(data, user):
    """Prépare une campagne de paie pour tous les salariés actifs."""
    fy = int(data.get("fy") or db.today()[:4])
    period = int(data.get("period") or db.today()[5:7])
    pay_date = data.get("pay_date") or db.today()
    if db.query_one("SELECT id FROM payroll_runs WHERE fy = ? AND period = ? AND status <> 'VOID'",
                    (fy, period)):
        raise ErpError("Une campagne de paie existe déjà pour la période %s/%s." % (period, fy))

    employees = list_employees(active_only=True)
    if not employees:
        raise ErpError("Aucun salarié actif à traiter.")
    cfg = params()

    with db.transaction():
        run_id = db.insert("payroll_runs", {
            "run_no": db.next_number("PR", pay_date), "fy": fy, "period": period,
            "pay_date": pay_date, "status": "DRAFT", "created_by": user["username"]})
        totals = {"gross": 0.0, "net": 0.0, "employee": 0.0, "employer": 0.0}
        for employee in employees:
            result = compute_payslip(employee, cfg)
            payslip_id = db.insert("payslips", {
                "run_id": run_id, "employee_id": employee["id"], "gross": result["gross"],
                "taxable": result["taxable"], "employee_cont": result["employee_cont"],
                "income_tax": result["income_tax"], "other_deductions": result["other_deductions"],
                "net_pay": result["net_pay"], "employer_cont": result["employer_cont"],
                "total_cost": result["total_cost"]})
            for line in result["lines"]:
                line["payslip_id"] = payslip_id
                db.insert("payslip_lines", line)
            totals["gross"] += result["gross"]
            totals["net"] += result["net_pay"]
            totals["employee"] += result["employee_cont"] + result["income_tax"]
            totals["employer"] += result["employer_cont"]

        db.update("payroll_runs", {
            "total_gross": money(totals["gross"]), "total_net": money(totals["net"]),
            "total_employee_cont": money(totals["employee"]),
            "total_employer_cont": money(totals["employer"])}, "id = ?", (run_id,))
        db.audit(user["username"], "HR", "CREATE_RUN", "payroll_runs", run_id,
                 "%s salariés" % len(employees))
    return get_run(run_id)


def validate_run(run_id, user):
    run = get_run(run_id)
    if run["status"] != "DRAFT":
        raise ErpError("Seule une campagne en brouillon peut être validée.")
    db.update("payroll_runs", {"status": "VALIDATED"}, "id = ?", (run_id,))
    db.audit(user["username"], "HR", "VALIDATE_RUN", "payroll_runs", run_id, run["run_no"])
    return get_run(run_id)


def post_run(run_id, user, post_date=None):
    """Comptabilise la paie : charges, dettes sociales et fiscales, net à payer."""
    run = get_run(run_id)
    if run["status"] != "VALIDATED":
        raise ErpError("La campagne doit être validée avant comptabilisation.")
    post_date = post_date or run["pay_date"]
    db.assert_period_open(post_date)

    gross = money(run["total_gross"])
    employer = money(run["total_employer_cont"])
    net = money(run["total_net"])
    social_employee = money(db.scalar(
        "SELECT COALESCE(SUM(employee_cont), 0) FROM payslips WHERE run_id = ?", (run_id,), 0))
    taxes = money(db.scalar(
        "SELECT COALESCE(SUM(income_tax), 0) FROM payslips WHERE run_id = ?", (run_id,), 0))
    other = money(db.scalar(
        "SELECT COALESCE(SUM(other_deductions), 0) FROM payslips WHERE run_id = ?", (run_id,), 0))

    lines = [
        {"account": accounting.map_account("PAYROLL_EXPENSE"), "debit": gross,
         "description": "Rémunérations %s/%s" % (run["period"], run["fy"])},
        {"account": accounting.map_account("PAYROLL_EMPLOYER"), "debit": employer,
         "description": "Charges patronales %s/%s" % (run["period"], run["fy"])},
        {"account": accounting.map_account("PAYROLL_NET"), "credit": money(net + other),
         "description": "Net à payer %s/%s" % (run["period"], run["fy"])},
        {"account": accounting.map_account("PAYROLL_SOCIAL"),
         "credit": money(social_employee + employer),
         "description": "Organismes sociaux %s/%s" % (run["period"], run["fy"])},
        {"account": accounting.map_account("PAYROLL_TAX"), "credit": taxes,
         "description": "Impôts retenus à la source %s/%s" % (run["period"], run["fy"])},
    ]
    with db.transaction():
        batch_id = accounting.create_batch(
            "P", "Paie %s/%s" % (run["period"], run["fy"]), post_date, lines, user,
            source="HR", source_id=run_id, auto_post=True)
        db.update("payroll_runs", {"status": "POSTED", "gl_batch_id": batch_id},
                  "id = ?", (run_id,))
        db.audit(user["username"], "HR", "POST_RUN", "payroll_runs", run_id, run["run_no"])
    return get_run(run_id)


def pay_run(run_id, user, payment_date=None, method="VIREMENT"):
    """Décaissement des salaires : solde le compte « personnel, rémunérations dues »."""
    run = get_run(run_id)
    if run["status"] != "POSTED":
        raise ErpError("La campagne doit être comptabilisée avant décaissement.")
    payment_date = payment_date or db.today()
    amount = money(run["total_net"])
    treasury = accounting.map_account("CASH" if method == "ESPECES" else "BANK")
    lines = [
        {"account": accounting.map_account("PAYROLL_NET"), "debit": amount,
         "description": "Paiement des salaires %s/%s" % (run["period"], run["fy"])},
        {"account": treasury, "credit": amount,
         "description": "Virement salaires %s/%s" % (run["period"], run["fy"])},
    ]
    batch_id = accounting.create_batch(
        "T", "Virement des salaires %s/%s" % (run["period"], run["fy"]), payment_date,
        lines, user, source="HR", source_id=run_id, auto_post=True)
    db.audit(user["username"], "HR", "PAY_RUN", "payroll_runs", run_id, str(amount))
    return {"run": get_run(run_id), "gl_batch_id": batch_id}


# --------------------------------------------------------------------- congés
def save_leave(data, user):
    employee = get_employee(int(data["employee_id"]))
    leave_id = db.insert("leave_requests", {
        "employee_id": employee["id"], "leave_type": data.get("leave_type", "CONGE"),
        "date_from": data["date_from"], "date_to": data["date_to"],
        "days": float(data["days"]), "status": "DEMANDE", "notes": data.get("notes")})
    db.audit(user["username"], "HR", "LEAVE_REQUEST", "leave_requests", leave_id)
    return db.query_one("SELECT * FROM leave_requests WHERE id = ?", (leave_id,))


def set_leave_status(leave_id, status, user):
    if status not in ("DEMANDE", "APPROUVE", "REFUSE"):
        raise ErpError("Statut de congé invalide.")
    db.update("leave_requests", {"status": status, "approved_by": user["username"]},
              "id = ?", (leave_id,))
    db.audit(user["username"], "HR", "LEAVE_" + status, "leave_requests", leave_id)
    return db.query_one("SELECT * FROM leave_requests WHERE id = ?", (leave_id,))


def headcount_report():
    return {
        "by_unit": db.query(
            "SELECT COALESCE(bu.name, 'Non affecté') AS unit, count(*) AS headcount, "
            "       SUM(e.base_salary) AS payroll_base FROM employees e "
            "LEFT JOIN business_units bu ON bu.code = e.business_unit "
            "WHERE e.active = 1 GROUP BY e.business_unit ORDER BY headcount DESC"),
        "by_contract": db.query(
            "SELECT contract_type, count(*) AS headcount FROM employees "
            "WHERE active = 1 GROUP BY contract_type"),
        "total": db.scalar("SELECT count(*) FROM employees WHERE active = 1", (), 0),
    }
