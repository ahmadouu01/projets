# -*- coding: utf-8 -*-
"""Routage de l'API REST de SunuERP."""
from . import (accounting, auth, db, hr, inventory, partners, production,
               purchasing, reports, sales)
from .db import ErpError

ROUTES = []


def route(method, path, module=None, level="read"):
    """Déclare une route : /api/sales/orders/:id → segments, dont :id est variable."""
    def decorator(func):
        ROUTES.append((method, [s for s in path.strip("/").split("/") if s],
                       module, level, func))
        return func
    return decorator


def dispatch(method, path, query, body, user):
    segments = [s for s in path.strip("/").split("/") if s]
    allowed_methods = set()
    for route_method, pattern, module, level, func in ROUTES:
        if len(pattern) != len(segments):
            continue
        params = {}
        matched = True
        for expected, actual in zip(pattern, segments):
            if expected.startswith(":"):
                params[expected[1:]] = actual
            elif expected != actual:
                matched = False
                break
        if not matched:
            continue
        if route_method != method:
            allowed_methods.add(route_method)
            continue
        if module:
            auth.check(user, module, level)
        return func(user, params, query, body or {})
    if allowed_methods:
        raise ErpError("Méthode %s non autorisée sur %s." % (method, path), 405)
    raise ErpError("Ressource inconnue : %s" % path, 404)


def _int(value, default=None):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


# ===================================================================== session
@route("POST", "/api/auth/login")
def api_login(user, params, query, body):
    return auth.login(body.get("username", ""), body.get("password", ""))


@route("POST", "/api/auth/logout")
def api_logout(user, params, query, body):
    auth.logout(body.get("token"))
    return {"ok": True}


@route("GET", "/api/auth/me")
def api_me(user, params, query, body):
    if not user:
        raise ErpError("Session expirée.", 401)
    company = db.query_one("SELECT * FROM companies WHERE code = ?", (db.default_company(),))
    return {"user": auth.public_user(user), "company": company,
            "fiscal_years": db.query(
                "SELECT DISTINCT fy FROM fiscal_periods ORDER BY fy DESC")}


# ===================================================================== tableau de bord
@route("GET", "/api/dashboard", "RP")
def api_dashboard(user, params, query, body):
    return reports.dashboard(_int(query.get("fy")))


@route("GET", "/api/reports/vat", "RP")
def api_vat(user, params, query, body):
    today = db.today()
    return reports.vat_declaration(_int(query.get("year"), int(today[:4])),
                                   _int(query.get("month"), int(today[5:7])))


@route("GET", "/api/reports/audit", "ADM")
def api_audit(user, params, query, body):
    return reports.audit_trail(_int(query.get("limit"), 200), query.get("module"),
                               query.get("username"))


# ===================================================================== tiers
@route("GET", "/api/partners", "AB")
def api_partners(user, params, query, body):
    return partners.list_partners(query.get("search"), query.get("role"),
                                  _int(query.get("limit"), 500), _int(query.get("offset"), 0))


@route("GET", "/api/partners/:an8", "AB")
def api_partner(user, params, query, body):
    return partners.get_partner(_int(params["an8"]))


@route("POST", "/api/partners", "AB", "write")
def api_save_partner(user, params, query, body):
    return partners.save_partner(body, user)


@route("GET", "/api/partners/:an8/statement", "AR")
def api_statement(user, params, query, body):
    return partners.customer_statement(_int(params["an8"]))


# ===================================================================== articles & stocks
@route("GET", "/api/items", "IN")
def api_items(user, params, query, body):
    return inventory.list_items(query.get("search"), query.get("type"),
                                query.get("all") != "1", _int(query.get("limit"), 500),
                                _int(query.get("offset"), 0))


@route("GET", "/api/items/:id", "IN")
def api_item(user, params, query, body):
    item = inventory.get_item(_int(params["id"]))
    item["stock"] = inventory.item_stock(item["id"])
    item["movements"] = inventory.list_movements(item_id=item["id"], limit=50)
    return item


@route("POST", "/api/items", "IN", "write")
def api_save_item(user, params, query, body):
    return inventory.save_item(body, user)


@route("GET", "/api/warehouses", "IN")
def api_warehouses(user, params, query, body):
    return inventory.list_warehouses()


@route("POST", "/api/warehouses", "IN", "write")
def api_save_warehouse(user, params, query, body):
    return inventory.save_warehouse(body, user)


@route("GET", "/api/stock/valuation", "IN")
def api_valuation(user, params, query, body):
    return inventory.stock_valuation(query.get("warehouse"))


@route("GET", "/api/stock/movements", "IN")
def api_movements(user, params, query, body):
    return inventory.list_movements(_int(query.get("item_id")), query.get("warehouse"),
                                    query.get("from"), query.get("to"),
                                    _int(query.get("limit"), 300))


@route("GET", "/api/stock/reorder", "IN")
def api_reorder(user, params, query, body):
    return inventory.reorder_report()


@route("POST", "/api/stock/adjust", "IN", "write")
def api_adjust(user, params, query, body):
    return inventory.adjust_stock(body, user)


@route("POST", "/api/stock/transfer", "IN", "write")
def api_transfer(user, params, query, body):
    return inventory.transfer_stock(body, user)


# ===================================================================== ventes
@route("GET", "/api/sales/orders", "AR")
def api_sales_orders(user, params, query, body):
    return sales.list_orders(query.get("status"), _int(query.get("customer")),
                             query.get("search"), _int(query.get("limit"), 200),
                             _int(query.get("offset"), 0))


@route("GET", "/api/sales/orders/:id", "AR")
def api_sales_order(user, params, query, body):
    return sales.get_order(_int(params["id"]))


@route("POST", "/api/sales/orders", "AR", "write")
def api_save_sales_order(user, params, query, body):
    return sales.save_order(body, user)


@route("POST", "/api/sales/orders/:id/confirm", "AR", "write")
def api_confirm_order(user, params, query, body):
    return sales.confirm_order(_int(params["id"]), user)


@route("POST", "/api/sales/orders/:id/cancel", "AR", "write")
def api_cancel_order(user, params, query, body):
    return sales.cancel_order(_int(params["id"]), user)


@route("POST", "/api/sales/orders/:id/ship", "AR", "write")
def api_ship_order(user, params, query, body):
    return sales.ship_order(_int(params["id"]), user, body.get("date"), body.get("lines"))


@route("POST", "/api/sales/orders/:id/invoice", "AR", "write")
def api_invoice_order(user, params, query, body):
    return sales.invoice_order(_int(params["id"]), user, body.get("date"))


@route("GET", "/api/sales/invoices", "AR")
def api_sales_invoices(user, params, query, body):
    return sales.list_invoices(query.get("status"), _int(query.get("customer")),
                               query.get("search"), _int(query.get("limit"), 200),
                               _int(query.get("offset"), 0))


@route("GET", "/api/sales/invoices/:id", "AR")
def api_sales_invoice(user, params, query, body):
    return sales.get_invoice(_int(params["id"]))


@route("POST", "/api/sales/receipts", "AR", "write")
def api_receipt(user, params, query, body):
    return sales.register_receipt(body, user)


@route("GET", "/api/sales/receipts", "AR")
def api_receipts(user, params, query, body):
    return db.query(
        "SELECT r.*, ab.alpha_name AS customer_name FROM ar_receipts r "
        "JOIN address_book ab ON ab.an8 = r.customer_an8 ORDER BY r.id DESC LIMIT 200")


@route("GET", "/api/sales/aging", "AR")
def api_aging(user, params, query, body):
    return sales.aged_receivables(query.get("as_of"))


@route("GET", "/api/sales/analysis", "RP")
def api_sales_analysis(user, params, query, body):
    return sales.sales_analysis(_int(query.get("fy")))


# ===================================================================== achats
@route("GET", "/api/purchasing/orders", "AP")
def api_po_list(user, params, query, body):
    return purchasing.list_orders(query.get("status"), _int(query.get("supplier")),
                                  query.get("search"), _int(query.get("limit"), 200),
                                  _int(query.get("offset"), 0))


@route("GET", "/api/purchasing/orders/:id", "AP")
def api_po(user, params, query, body):
    return purchasing.get_order(_int(params["id"]))


@route("POST", "/api/purchasing/orders", "AP", "write")
def api_save_po(user, params, query, body):
    return purchasing.save_order(body, user)


@route("POST", "/api/purchasing/orders/:id/approve", "AP", "write")
def api_approve_po(user, params, query, body):
    return purchasing.approve_order(_int(params["id"]), user)


@route("POST", "/api/purchasing/orders/:id/cancel", "AP", "write")
def api_cancel_po(user, params, query, body):
    return purchasing.cancel_order(_int(params["id"]), user)


@route("POST", "/api/purchasing/orders/:id/receive", "AP", "write")
def api_receive_po(user, params, query, body):
    return purchasing.receive_order(_int(params["id"]), user, body.get("date"), body.get("lines"))


@route("POST", "/api/purchasing/orders/:id/invoice", "AP", "write")
def api_invoice_po(user, params, query, body):
    return purchasing.invoice_order(_int(params["id"]), user, body.get("date"),
                                    body.get("supplier_ref"))


@route("GET", "/api/purchasing/invoices", "AP")
def api_ap_invoices(user, params, query, body):
    return purchasing.list_invoices(query.get("status"), _int(query.get("supplier")),
                                    query.get("search"), _int(query.get("limit"), 200),
                                    _int(query.get("offset"), 0))


@route("GET", "/api/purchasing/invoices/:id", "AP")
def api_ap_invoice(user, params, query, body):
    return purchasing.get_invoice(_int(params["id"]))


@route("POST", "/api/purchasing/invoices", "AP", "write")
def api_expense_invoice(user, params, query, body):
    return purchasing.create_expense_invoice(body, user)


@route("POST", "/api/purchasing/payments", "AP", "write")
def api_payment(user, params, query, body):
    return purchasing.register_payment(body, user)


@route("GET", "/api/purchasing/payments", "AP")
def api_payments(user, params, query, body):
    return db.query(
        "SELECT p.*, ab.alpha_name AS supplier_name FROM ap_payments p "
        "JOIN address_book ab ON ab.an8 = p.supplier_an8 ORDER BY p.id DESC LIMIT 200")


@route("GET", "/api/purchasing/aging", "AP")
def api_ap_aging(user, params, query, body):
    return purchasing.aged_payables(query.get("as_of"))


# ===================================================================== comptabilité
@route("GET", "/api/gl/accounts", "GL")
def api_accounts(user, params, query, body):
    return accounting.list_accounts(query.get("search"), query.get("postable") == "1")


@route("POST", "/api/gl/accounts", "GL", "write")
def api_save_account(user, params, query, body):
    return accounting.save_account(body, user)


@route("GET", "/api/gl/batches", "GL")
def api_batches(user, params, query, body):
    return accounting.list_batches(query.get("status"), _int(query.get("fy")),
                                   _int(query.get("period")), query.get("type"),
                                   _int(query.get("limit"), 200))


@route("GET", "/api/gl/batches/:id", "GL")
def api_batch(user, params, query, body):
    return accounting.batch_detail(_int(params["id"]))


@route("POST", "/api/gl/batches", "GL", "write")
def api_create_batch(user, params, query, body):
    batch_id = accounting.create_batch(
        body.get("batch_type", "G"), body.get("description", "Écriture manuelle"),
        body.get("date") or db.today(), body.get("lines") or [], user,
        auto_post=bool(body.get("post")))
    return accounting.batch_detail(batch_id)


@route("POST", "/api/gl/batches/:id/post", "GL", "post")
def api_post_batch(user, params, query, body):
    return accounting.post_batch(_int(params["id"]), user)


@route("POST", "/api/gl/batches/:id/void", "GL", "post")
def api_void_batch(user, params, query, body):
    accounting.void_batch(_int(params["id"]), user)
    return {"ok": True}


@route("POST", "/api/gl/batches/:id/reverse", "GL", "post")
def api_reverse_batch(user, params, query, body):
    batch_id = accounting.reverse_batch(_int(params["id"]), user, body.get("date"))
    return accounting.batch_detail(batch_id)


@route("GET", "/api/gl/trial-balance", "GL")
def api_trial_balance(user, params, query, body):
    fy = _int(query.get("fy"), int(db.today()[:4]))
    rows = accounting.trial_balance(fy, _int(query.get("period")),
                                    posted_only=query.get("draft") != "1")
    return {"fy": fy, "lines": rows,
            "total_debit": round(sum(r["debit"] for r in rows)),
            "total_credit": round(sum(r["credit"] for r in rows))}


@route("GET", "/api/gl/ledger", "GL")
def api_ledger(user, params, query, body):
    return accounting.account_ledger(query.get("account"), _int(query.get("fy"),
                                     int(db.today()[:4])), query.get("from"), query.get("to"))


@route("GET", "/api/gl/income-statement", "GL")
def api_income_statement(user, params, query, body):
    return accounting.income_statement(_int(query.get("fy"), int(db.today()[:4])),
                                       _int(query.get("period"), 12))


@route("GET", "/api/gl/balance-sheet", "GL")
def api_balance_sheet(user, params, query, body):
    return accounting.balance_sheet(_int(query.get("fy"), int(db.today()[:4])),
                                    _int(query.get("period"), 12))


@route("GET", "/api/gl/integrity", "GL")
def api_integrity(user, params, query, body):
    return accounting.integrity_check(_int(query.get("fy")))


@route("GET", "/api/gl/periods", "GL")
def api_periods(user, params, query, body):
    return db.query("SELECT * FROM fiscal_periods WHERE company = ? ORDER BY fy DESC, period",
                    (db.default_company(),))


@route("POST", "/api/gl/periods", "GL", "post")
def api_period_status(user, params, query, body):
    if body.get("action") == "generate":
        created = accounting.generate_fiscal_calendar(
            db.default_company(), int(body["fy"]),
            _int(body.get("start_month"), 1))
        return {"created": created}
    accounting.set_period_status(db.default_company(), int(body["fy"]), int(body["period"]),
                                 body["status"], user)
    return {"ok": True}


@route("GET", "/api/gl/mapping", "GL")
def api_mapping(user, params, query, body):
    rows = db.query("SELECT m.*, a.name AS account_name FROM gl_mapping m "
                    "LEFT JOIN accounts a ON a.code = m.account_code ORDER BY m.key")
    return {"mapping": rows, "keys": accounting.MAPPING_KEYS}


@route("POST", "/api/gl/mapping", "GL", "write")
def api_save_mapping(user, params, query, body):
    accounting.get_account(body["account_code"])
    db.execute("INSERT INTO gl_mapping (key, account_code, description) VALUES (?, ?, ?) "
               "ON CONFLICT(key) DO UPDATE SET account_code = excluded.account_code",
               (body["key"], body["account_code"],
                accounting.MAPPING_KEYS.get(body["key"], body.get("description"))))
    db.audit(user["username"], "GL", "MAPPING", "gl_mapping", body["key"], body["account_code"])
    return {"ok": True}


# ===================================================================== production
@route("GET", "/api/production/boms", "MF")
def api_boms(user, params, query, body):
    return production.list_boms(query.get("search"))


@route("GET", "/api/production/boms/:id", "MF")
def api_bom(user, params, query, body):
    return production.get_bom(_int(params["id"]))


@route("POST", "/api/production/boms", "MF", "write")
def api_save_bom(user, params, query, body):
    return production.save_bom(body, user)


@route("GET", "/api/production/work-orders", "MF")
def api_work_orders(user, params, query, body):
    return production.list_work_orders(query.get("status"), query.get("search"))


@route("GET", "/api/production/work-orders/:id", "MF")
def api_work_order(user, params, query, body):
    return production.get_work_order(_int(params["id"]))


@route("POST", "/api/production/work-orders", "MF", "write")
def api_create_wo(user, params, query, body):
    return production.create_work_order(body, user)


@route("POST", "/api/production/work-orders/:id/release", "MF", "write")
def api_release_wo(user, params, query, body):
    return production.release_work_order(_int(params["id"]), user)


@route("POST", "/api/production/work-orders/:id/issue", "MF", "write")
def api_issue_wo(user, params, query, body):
    return production.issue_components(_int(params["id"]), user, body.get("date"),
                                       body.get("lines"))


@route("POST", "/api/production/work-orders/:id/complete", "MF", "write")
def api_complete_wo(user, params, query, body):
    return production.complete_work_order(_int(params["id"]), user,
                                          body.get("qty_produced"), body.get("date"))


@route("GET", "/api/production/requirements", "MF")
def api_requirements(user, params, query, body):
    return production.material_requirements()


# ===================================================================== ressources humaines
@route("GET", "/api/hr/employees", "HR")
def api_employees(user, params, query, body):
    return hr.list_employees(query.get("search"), query.get("all") != "1",
                             query.get("business_unit"))


@route("GET", "/api/hr/employees/:id", "HR")
def api_employee(user, params, query, body):
    return hr.get_employee(_int(params["id"]))


@route("POST", "/api/hr/employees", "HR", "write")
def api_save_employee(user, params, query, body):
    return hr.save_employee(body, user)


@route("GET", "/api/hr/runs", "HR")
def api_runs(user, params, query, body):
    return hr.list_runs()


@route("GET", "/api/hr/runs/:id", "HR")
def api_run(user, params, query, body):
    return hr.get_run(_int(params["id"]))


@route("POST", "/api/hr/runs", "HR", "write")
def api_create_run(user, params, query, body):
    return hr.create_run(body, user)


@route("POST", "/api/hr/runs/:id/validate", "HR", "write")
def api_validate_run(user, params, query, body):
    return hr.validate_run(_int(params["id"]), user)


@route("POST", "/api/hr/runs/:id/post", "HR", "post")
def api_post_run(user, params, query, body):
    return hr.post_run(_int(params["id"]), user, body.get("date"))


@route("POST", "/api/hr/runs/:id/pay", "HR", "post")
def api_pay_run(user, params, query, body):
    return hr.pay_run(_int(params["id"]), user, body.get("date"),
                      body.get("method", "VIREMENT"))


@route("GET", "/api/hr/payslips/:id", "HR")
def api_payslip(user, params, query, body):
    return hr.get_payslip(_int(params["id"]))


@route("GET", "/api/hr/headcount", "HR")
def api_headcount(user, params, query, body):
    return hr.headcount_report()


@route("GET", "/api/hr/params", "HR")
def api_hr_params(user, params, query, body):
    return hr.params()


@route("POST", "/api/hr/params", "HR", "post")
def api_save_hr_params(user, params, query, body):
    return hr.save_params(body, user)


@route("POST", "/api/hr/leaves", "HR", "write")
def api_leave(user, params, query, body):
    if body.get("status"):
        return hr.set_leave_status(_int(body["id"]), body["status"], user)
    return hr.save_leave(body, user)


@route("GET", "/api/hr/leaves", "HR")
def api_leaves(user, params, query, body):
    return db.query(
        "SELECT l.*, e.matricule, e.last_name, e.first_name FROM leave_requests l "
        "JOIN employees e ON e.id = l.employee_id ORDER BY l.date_from DESC LIMIT 200")


# ===================================================================== administration
@route("GET", "/api/admin/users", "ADM")
def api_users(user, params, query, body):
    return db.query("SELECT id, username, full_name, email, role, business_unit, active, "
                    "last_login FROM users ORDER BY username")


@route("POST", "/api/admin/users", "ADM", "write")
def api_save_user(user, params, query, body):
    if body.get("id"):
        db.update("users", {
            "full_name": body["full_name"], "email": body.get("email"),
            "role": body["role"], "business_unit": body.get("business_unit"),
            "active": 1 if body.get("active", 1) else 0}, "id = ?", (body["id"],))
        if body.get("password"):
            auth.set_password(int(body["id"]), body["password"])
        db.audit(user["username"], "ADM", "UPDATE_USER", "users", body["id"])
        return {"ok": True, "id": body["id"]}
    user_id = auth.create_user(body["username"], body["password"], body["full_name"],
                               body.get("role", "READONLY"), body.get("email"),
                               body.get("business_unit"))
    db.audit(user["username"], "ADM", "CREATE_USER", "users", user_id)
    return {"ok": True, "id": user_id}


@route("GET", "/api/admin/roles", "ADM")
def api_roles(user, params, query, body):
    return {"roles": db.query("SELECT * FROM role_permissions ORDER BY role, module"),
            "modules": auth.MODULES}


@route("GET", "/api/admin/udc", "ADM")
def api_udc(user, params, query, body):
    sql = "SELECT * FROM udc WHERE 1 = 1"
    par = []
    if query.get("system"):
        sql += " AND system = ?"
        par.append(query["system"])
    if query.get("type"):
        sql += " AND code_type = ?"
        par.append(query["type"])
    return db.query(sql + " ORDER BY system, code_type, code", tuple(par))


@route("POST", "/api/admin/udc", "ADM", "write")
def api_save_udc(user, params, query, body):
    db.execute("INSERT INTO udc (system, code_type, code, description, handling, active) "
               "VALUES (?, ?, ?, ?, ?, 1) ON CONFLICT(system, code_type, code) "
               "DO UPDATE SET description = excluded.description, handling = excluded.handling",
               (body["system"], body["code_type"], body["code"], body["description"],
                body.get("handling")))
    db.audit(user["username"], "ADM", "SAVE_UDC", "udc",
             "%s/%s/%s" % (body["system"], body["code_type"], body["code"]))
    return {"ok": True}


@route("GET", "/api/admin/next-numbers", "ADM")
def api_next_numbers(user, params, query, body):
    return db.query("SELECT * FROM next_numbers ORDER BY doc_type")


@route("GET", "/api/admin/companies", "ADM")
def api_companies(user, params, query, body):
    return {"companies": db.query("SELECT * FROM companies ORDER BY code"),
            "business_units": db.query("SELECT * FROM business_units ORDER BY code")}


@route("POST", "/api/admin/business-units", "ADM", "write")
def api_save_bu(user, params, query, body):
    code = body["code"].strip().upper()
    payload = {"name": body["name"], "company": body.get("company", db.default_company()),
               "bu_type": body.get("bu_type", "DEPT"), "manager": body.get("manager"),
               "active": 1 if body.get("active", 1) else 0}
    if db.query_one("SELECT code FROM business_units WHERE code = ?", (code,)):
        db.update("business_units", payload, "code = ?", (code,))
    else:
        payload["code"] = code
        db.insert("business_units", payload)
    db.audit(user["username"], "ADM", "SAVE_BU", "business_units", code)
    return {"ok": True}


@route("GET", "/api/admin/settings", "ADM")
def api_settings(user, params, query, body):
    return db.query("SELECT * FROM settings ORDER BY key")


@route("POST", "/api/admin/settings", "ADM", "write")
def api_save_settings(user, params, query, body):
    for key, value in (body or {}).items():
        db.set_setting(key, value)
    db.audit(user["username"], "ADM", "SAVE_SETTINGS", "settings", ",".join(body or {}))
    return {"ok": True}
