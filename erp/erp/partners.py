# -*- coding: utf-8 -*-
"""Répertoire d'adresses : un tiers unique peut être client, fournisseur et/ou salarié."""
from . import db
from .db import ErpError, money


def list_partners(search=None, role=None, limit=500, offset=0):
    sql = ("SELECT ab.*, c.credit_limit, c.payment_terms AS customer_terms, c.on_hold, "
           "       s.payment_terms AS supplier_terms, s.category AS supplier_category "
           "FROM address_book ab "
           "LEFT JOIN customers c ON c.an8 = ab.an8 "
           "LEFT JOIN suppliers s ON s.an8 = ab.an8 WHERE 1 = 1")
    params = []
    if role == "C":
        sql += " AND ab.is_customer = 1"
    elif role == "V":
        sql += " AND ab.is_supplier = 1"
    elif role == "E":
        sql += " AND ab.is_employee = 1"
    if search:
        like = "%%%s%%" % search
        sql += (" AND (ab.alpha_name LIKE ? OR ab.city LIKE ? OR ab.email LIKE ? "
                "OR ab.phone LIKE ? OR CAST(ab.an8 AS TEXT) LIKE ?)")
        params += [like, like, like, like, like]
    sql += " ORDER BY ab.alpha_name LIMIT ? OFFSET ?"
    params += [limit, offset]
    return db.query(sql, tuple(params))


def get_partner(an8):
    partner = db.query_one("SELECT * FROM address_book WHERE an8 = ?", (an8,))
    if not partner:
        raise ErpError("Tiers introuvable (%s)." % an8)
    partner["customer"] = db.query_one("SELECT * FROM customers WHERE an8 = ?", (an8,))
    partner["supplier"] = db.query_one("SELECT * FROM suppliers WHERE an8 = ?", (an8,))
    partner["balance_ar"] = money(db.scalar(
        "SELECT COALESCE(SUM(total_ttc - amount_paid), 0) FROM ar_invoices "
        "WHERE customer_an8 = ? AND status IN ('OPEN', 'PARTIAL')", (an8,), 0))
    partner["balance_ap"] = money(db.scalar(
        "SELECT COALESCE(SUM(total_ttc - amount_paid), 0) FROM ap_invoices "
        "WHERE supplier_an8 = ? AND status IN ('OPEN', 'PARTIAL')", (an8,), 0))
    return partner


def save_partner(data, user):
    payload = {
        "alpha_name": data["alpha_name"].strip(),
        "search_type": data.get("search_type", "C"),
        "is_customer": 1 if data.get("is_customer") else 0,
        "is_supplier": 1 if data.get("is_supplier") else 0,
        "is_employee": 1 if data.get("is_employee") else 0,
        "tax_id": data.get("tax_id"),
        "address": data.get("address"),
        "city": data.get("city"),
        "region": data.get("region"),
        "country": data.get("country", "Sénégal"),
        "phone": data.get("phone"),
        "email": data.get("email"),
        "contact_name": data.get("contact_name"),
        "notes": data.get("notes"),
        "active": 1 if data.get("active", 1) else 0,
    }
    if not payload["alpha_name"]:
        raise ErpError("Le nom du tiers est obligatoire.")

    an8 = data.get("an8")
    if an8:
        db.update("address_book", payload, "an8 = ?", (an8,))
        db.audit(user["username"], "AB", "UPDATE", "address_book", an8)
    else:
        an8 = db.insert("address_book", payload)
        db.audit(user["username"], "AB", "CREATE", "address_book", an8)

    if payload["is_customer"]:
        customer = {
            "credit_limit": money(data.get("credit_limit", 0)),
            "payment_terms": data.get("payment_terms", "30J"),
            "price_group": data.get("price_group"),
            "sales_rep": data.get("sales_rep"),
            "vat_exempt": 1 if data.get("vat_exempt") else 0,
            "on_hold": 1 if data.get("on_hold") else 0,
        }
        if db.query_one("SELECT an8 FROM customers WHERE an8 = ?", (an8,)):
            db.update("customers", customer, "an8 = ?", (an8,))
        else:
            customer["an8"] = an8
            db.insert("customers", customer)

    if payload["is_supplier"]:
        supplier = {
            "payment_terms": data.get("supplier_payment_terms", data.get("payment_terms", "30J")),
            "bank_account": data.get("bank_account"),
            "category": data.get("supplier_category"),
            "lead_time_days": int(data.get("lead_time_days", 7)),
        }
        if db.query_one("SELECT an8 FROM suppliers WHERE an8 = ?", (an8,)):
            db.update("suppliers", supplier, "an8 = ?", (an8,))
        else:
            supplier["an8"] = an8
            db.insert("suppliers", supplier)

    return get_partner(an8)


def require_customer(an8):
    partner = db.query_one(
        "SELECT ab.*, c.credit_limit, c.on_hold, c.payment_terms, c.vat_exempt "
        "FROM address_book ab JOIN customers c ON c.an8 = ab.an8 WHERE ab.an8 = ?", (an8,))
    if not partner:
        raise ErpError("Le tiers %s n'est pas déclaré comme client." % an8)
    if not partner["active"]:
        raise ErpError("Le client %s est désactivé." % partner["alpha_name"])
    return partner


def require_supplier(an8):
    partner = db.query_one(
        "SELECT ab.*, s.payment_terms, s.lead_time_days "
        "FROM address_book ab JOIN suppliers s ON s.an8 = ab.an8 WHERE ab.an8 = ?", (an8,))
    if not partner:
        raise ErpError("Le tiers %s n'est pas déclaré comme fournisseur." % an8)
    if not partner["active"]:
        raise ErpError("Le fournisseur %s est désactivé." % partner["alpha_name"])
    return partner


def customer_statement(an8):
    """Relevé de compte client : factures et règlements."""
    partner = get_partner(an8)
    invoices = db.query(
        "SELECT invoice_no, invoice_date, due_date, total_ttc, amount_paid, status "
        "FROM ar_invoices WHERE customer_an8 = ? ORDER BY invoice_date DESC, id DESC", (an8,))
    receipts = db.query(
        "SELECT receipt_no, receipt_date, amount, method, reference "
        "FROM ar_receipts WHERE customer_an8 = ? ORDER BY receipt_date DESC, id DESC", (an8,))
    return {"partner": partner, "invoices": invoices, "receipts": receipts}
