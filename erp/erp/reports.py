# -*- coding: utf-8 -*-
"""Tableau de bord et états transverses."""
from datetime import datetime

from . import accounting, db, purchasing, sales
from .db import money


def _treasury_balance(company=None):
    company = company or db.default_company()
    return money(db.scalar(
        "SELECT COALESCE(SUM(e.debit - e.credit), 0) FROM gl_entries e "
        "JOIN gl_batches b ON b.id = e.batch_id JOIN accounts a ON a.code = e.account_code "
        "WHERE e.posted = 1 AND b.company = ? AND a.class = 5", (company,), 0))


def dashboard(fy=None, company=None):
    company = company or db.default_company()
    today = db.today()
    fy = int(fy or today[:4])
    month = today[:7]

    revenue_month = money(db.scalar(
        "SELECT COALESCE(SUM(total_ht), 0) FROM ar_invoices "
        "WHERE status <> 'CANCELLED' AND substr(invoice_date, 1, 7) = ?", (month,), 0))
    revenue_year = money(db.scalar(
        "SELECT COALESCE(SUM(total_ht), 0) FROM ar_invoices "
        "WHERE status <> 'CANCELLED' AND substr(invoice_date, 1, 4) = ?", (str(fy),), 0))
    purchases_year = money(db.scalar(
        "SELECT COALESCE(SUM(total_ht), 0) FROM ap_invoices "
        "WHERE status <> 'CANCELLED' AND substr(invoice_date, 1, 4) = ?", (str(fy),), 0))
    ar_open = money(db.scalar(
        "SELECT COALESCE(SUM(total_ttc - amount_paid), 0) FROM ar_invoices "
        "WHERE status IN ('OPEN', 'PARTIAL')", (), 0))
    ap_open = money(db.scalar(
        "SELECT COALESCE(SUM(total_ttc - amount_paid), 0) FROM ap_invoices "
        "WHERE status IN ('OPEN', 'PARTIAL')", (), 0))
    overdue_ar = money(db.scalar(
        "SELECT COALESCE(SUM(total_ttc - amount_paid), 0) FROM ar_invoices "
        "WHERE status IN ('OPEN', 'PARTIAL') AND due_date < ?", (today,), 0))
    stock_value = money(db.scalar(
        "SELECT COALESCE(SUM(s.qty_on_hand * i.average_cost), 0) FROM stock s "
        "JOIN items i ON i.id = s.item_id", (), 0))

    result = accounting.income_statement(fy, 12, company)

    monthly = db.query(
        "SELECT substr(invoice_date, 1, 7) AS month, SUM(total_ht) AS amount "
        "FROM ar_invoices WHERE status <> 'CANCELLED' AND substr(invoice_date, 1, 4) = ? "
        "GROUP BY month ORDER BY month", (str(fy),))
    monthly_purchases = db.query(
        "SELECT substr(invoice_date, 1, 7) AS month, SUM(total_ht) AS amount "
        "FROM ap_invoices WHERE status <> 'CANCELLED' AND substr(invoice_date, 1, 4) = ? "
        "GROUP BY month ORDER BY month", (str(fy),))

    alerts = []
    low_stock = db.query(
        "SELECT i.item_code, i.description, i.min_stock, "
        "       COALESCE(SUM(s.qty_on_hand), 0) AS qty FROM items i "
        "LEFT JOIN stock s ON s.item_id = i.id "
        "WHERE i.active = 1 AND i.min_stock > 0 AND i.item_type <> 'SERVICE' "
        "GROUP BY i.id HAVING qty <= i.min_stock ORDER BY qty LIMIT 10")
    for row in low_stock:
        alerts.append({"level": "warning", "module": "IN",
                       "message": "Stock bas : %s (%s en stock, minimum %s)"
                                  % (row["description"], round(row["qty"] or 0, 2),
                                     round(row["min_stock"] or 0, 2))})
    if overdue_ar > 0:
        alerts.append({"level": "danger", "module": "AR",
                       "message": "%s F CFA de factures clients échues"
                                  % "{:,.0f}".format(overdue_ar).replace(",", "\u202f")})
    drafts = db.scalar("SELECT count(*) FROM gl_batches WHERE status = 'DRAFT'", (), 0)
    if drafts:
        alerts.append({"level": "info", "module": "GL",
                       "message": "%d lot(s) d'écritures en attente de comptabilisation" % drafts})
    pending_po = db.scalar("SELECT count(*) FROM purchase_orders WHERE status = 'DRAFT'", (), 0)
    if pending_po:
        alerts.append({"level": "info", "module": "AP",
                       "message": "%d commande(s) fournisseur en attente d'approbation" % pending_po})

    return {
        "fy": fy, "company": company, "today": today,
        "kpi": {
            "revenue_month": revenue_month,
            "revenue_year": revenue_year,
            "purchases_year": purchases_year,
            "result": result["result"],
            "ar_open": ar_open,
            "ap_open": ap_open,
            "overdue_ar": overdue_ar,
            "treasury": _treasury_balance(company),
            "stock_value": stock_value,
            "customers": db.scalar("SELECT count(*) FROM customers", (), 0),
            "suppliers": db.scalar("SELECT count(*) FROM suppliers", (), 0),
            "items": db.scalar("SELECT count(*) FROM items WHERE active = 1", (), 0),
            "employees": db.scalar("SELECT count(*) FROM employees WHERE active = 1", (), 0),
            "open_sales_orders": db.scalar(
                "SELECT count(*) FROM sales_orders WHERE status IN ('DRAFT', 'CONFIRMED')", (), 0),
            "open_work_orders": db.scalar(
                "SELECT count(*) FROM work_orders WHERE status IN ('PLANNED', 'RELEASED')", (), 0),
        },
        "charts": {
            "revenue_by_month": monthly,
            "purchases_by_month": monthly_purchases,
            "top_customers": sales.sales_analysis(fy)["by_customer"][:6],
            "aging": sales.aged_receivables()["totals"],
            "stock_by_category": db.query(
                "SELECT COALESCE(i.category, 'Divers') AS category, "
                "       ROUND(SUM(s.qty_on_hand * i.average_cost)) AS value "
                "FROM stock s JOIN items i ON i.id = s.item_id "
                "WHERE s.qty_on_hand > 0 GROUP BY category ORDER BY value DESC LIMIT 8"),
        },
        "alerts": alerts,
        "recent": {
            "invoices": sales.list_invoices(limit=6),
            "batches": accounting.list_batches(limit=6),
        },
    }


def vat_declaration(year, month):
    """Déclaration de TVA du mois : collectée, déductible, à payer."""
    period = "%04d-%02d" % (int(year), int(month))
    collected = money(db.scalar(
        "SELECT COALESCE(SUM(total_vat), 0) FROM ar_invoices "
        "WHERE status <> 'CANCELLED' AND substr(invoice_date, 1, 7) = ?", (period,), 0))
    deductible = money(db.scalar(
        "SELECT COALESCE(SUM(total_vat), 0) FROM ap_invoices "
        "WHERE status <> 'CANCELLED' AND substr(invoice_date, 1, 7) = ?", (period,), 0))
    return {
        "period": period,
        "vat_collected": collected,
        "vat_deductible": deductible,
        "vat_due": money(collected - deductible),
        "sales_base": money(db.scalar(
            "SELECT COALESCE(SUM(total_ht), 0) FROM ar_invoices "
            "WHERE status <> 'CANCELLED' AND substr(invoice_date, 1, 7) = ?", (period,), 0)),
        "purchases_base": money(db.scalar(
            "SELECT COALESCE(SUM(total_ht), 0) FROM ap_invoices "
            "WHERE status <> 'CANCELLED' AND substr(invoice_date, 1, 7) = ?", (period,), 0)),
    }


def audit_trail(limit=200, module=None, username=None):
    sql = "SELECT * FROM audit_log WHERE 1 = 1"
    params = []
    if module:
        sql += " AND module = ?"
        params.append(module)
    if username:
        sql += " AND username = ?"
        params.append(username)
    sql += " ORDER BY id DESC LIMIT ?"
    params.append(limit)
    return db.query(sql, tuple(params))
