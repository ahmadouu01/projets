# -*- coding: utf-8 -*-
"""Cycle de vente : commande client → livraison → facture → encaissement."""
from datetime import datetime, timedelta

from . import accounting, db, inventory, partners
from .db import ErpError, money

TERMS_DAYS = {"COMPTANT": 0, "15J": 15, "30J": 30, "45J": 45, "60J": 60, "90J": 90}


def due_date_from(invoice_date, terms):
    days = TERMS_DAYS.get((terms or "30J").upper(), 30)
    return (datetime.strptime(invoice_date, "%Y-%m-%d") + timedelta(days=days)).strftime("%Y-%m-%d")


# --------------------------------------------------------------------- commandes
def list_orders(status=None, customer_an8=None, search=None, limit=200, offset=0):
    sql = ("SELECT o.*, ab.alpha_name AS customer_name "
           "FROM sales_orders o JOIN address_book ab ON ab.an8 = o.customer_an8 WHERE 1 = 1")
    params = []
    if status:
        sql += " AND o.status = ?"
        params.append(status)
    if customer_an8:
        sql += " AND o.customer_an8 = ?"
        params.append(customer_an8)
    if search:
        like = "%%%s%%" % search
        sql += " AND (o.order_no LIKE ? OR ab.alpha_name LIKE ?)"
        params += [like, like]
    sql += " ORDER BY o.id DESC LIMIT ? OFFSET ?"
    params += [limit, offset]
    return db.query(sql, tuple(params))


def get_order(order_id):
    order = db.query_one(
        "SELECT o.*, ab.alpha_name AS customer_name, ab.city, ab.phone, ab.tax_id "
        "FROM sales_orders o JOIN address_book ab ON ab.an8 = o.customer_an8 WHERE o.id = ?",
        (order_id,))
    if not order:
        raise ErpError("Commande client introuvable (%s)." % order_id)
    order["lines"] = db.query(
        "SELECT l.*, i.item_code, i.uom AS item_uom, i.average_cost "
        "FROM sales_order_lines l LEFT JOIN items i ON i.id = l.item_id "
        "WHERE l.order_id = ? ORDER BY l.line_no", (order_id,))
    order["shipments"] = db.query(
        "SELECT * FROM shipments WHERE order_id = ? ORDER BY id", (order_id,))
    order["invoices"] = db.query(
        "SELECT * FROM ar_invoices WHERE order_id = ? ORDER BY id", (order_id,))
    return order


def _compute_line(line, vat_exempt=False):
    qty = money(line["quantity"], 3)
    price = money(line["unit_price"], 2)
    discount = float(line.get("discount_pct", 0) or 0)
    if qty <= 0:
        raise ErpError("Chaque ligne doit porter une quantité positive.")
    amount = money(qty * price * (1 - discount / 100.0))
    vat_rate = 0.0 if vat_exempt else float(line.get("vat_rate", 18) or 0)
    return amount, vat_rate


def save_order(data, user):
    """Création ou modification d'une commande client (statut brouillon)."""
    customer = partners.require_customer(int(data["customer_an8"]))
    order_id = data.get("id")
    order_date = data.get("order_date") or db.today()
    warehouse = data.get("warehouse") or db.get_setting("default_warehouse", "DIAM")
    lines = data.get("lines") or []
    if not lines:
        raise ErpError("Une commande doit comporter au moins une ligne.")

    with db.transaction():
        if order_id:
            existing = get_order(order_id)
            if existing["status"] not in ("DRAFT", "CONFIRMED"):
                raise ErpError("La commande %s n'est plus modifiable (statut %s)."
                               % (existing["order_no"], existing["status"]))
            if existing["status"] == "CONFIRMED" and any(
                    l["qty_shipped"] for l in existing["lines"]):
                raise ErpError("Des livraisons existent déjà : la commande n'est plus modifiable.")
            db.execute("DELETE FROM sales_order_lines WHERE order_id = ?", (order_id,))
        else:
            order_id = db.insert("sales_orders", {
                "order_no": db.next_number("SO", order_date),
                "customer_an8": customer["an8"], "order_date": order_date,
                "delivery_date": data.get("delivery_date"), "warehouse": warehouse,
                "business_unit": data.get("business_unit"),
                "currency": data.get("currency", "XOF"), "status": "DRAFT",
                "notes": data.get("notes"), "created_by": user["username"],
            })

        total_ht = total_vat = 0.0
        for i, line in enumerate(lines, start=1):
            item = inventory.get_item(int(line["item_id"])) if line.get("item_id") else None
            amount, vat_rate = _compute_line(line, customer["vat_exempt"])
            total_ht += amount
            total_vat += money(amount * vat_rate / 100.0)
            db.insert("sales_order_lines", {
                "order_id": order_id, "line_no": i,
                "item_id": item["id"] if item else None,
                "description": line.get("description") or (item["description"] if item else ""),
                "quantity": money(line["quantity"], 3),
                "uom": line.get("uom") or (item["uom"] if item else "U"),
                "unit_price": money(line["unit_price"], 2),
                "discount_pct": float(line.get("discount_pct", 0) or 0),
                "vat_rate": vat_rate, "amount_ht": amount,
            })

        db.update("sales_orders", {
            "customer_an8": customer["an8"], "order_date": order_date,
            "delivery_date": data.get("delivery_date"), "warehouse": warehouse,
            "business_unit": data.get("business_unit"),
            "notes": data.get("notes"),
            "total_ht": money(total_ht), "total_vat": money(total_vat),
            "total_ttc": money(total_ht + total_vat),
        }, "id = ?", (order_id,))
        db.audit(user["username"], "AR", "SAVE_ORDER", "sales_orders", order_id)
    return get_order(order_id)


def confirm_order(order_id, user):
    """Confirmation : contrôle d'encours client puis réservation de la commande."""
    order = get_order(order_id)
    if order["status"] != "DRAFT":
        raise ErpError("Seule une commande en brouillon peut être confirmée.")
    customer = partners.require_customer(order["customer_an8"])
    if customer["on_hold"]:
        raise ErpError("Le compte du client %s est bloqué." % customer["alpha_name"])
    limit = money(customer["credit_limit"] or 0)
    if limit > 0:
        outstanding = money(db.scalar(
            "SELECT COALESCE(SUM(total_ttc - amount_paid), 0) FROM ar_invoices "
            "WHERE customer_an8 = ? AND status IN ('OPEN', 'PARTIAL')",
            (order["customer_an8"],), 0))
        if outstanding + money(order["total_ttc"]) > limit:
            raise ErpError(
                "Encours dépassé pour %s : en cours %s + commande %s > plafond %s F CFA."
                % (customer["alpha_name"], int(outstanding), int(order["total_ttc"]), int(limit)))
    db.update("sales_orders", {"status": "CONFIRMED"}, "id = ?", (order_id,))
    db.audit(user["username"], "AR", "CONFIRM_ORDER", "sales_orders", order_id, order["order_no"])
    return get_order(order_id)


def cancel_order(order_id, user):
    order = get_order(order_id)
    if order["status"] in ("SHIPPED", "INVOICED"):
        raise ErpError("Une commande livrée ou facturée ne peut pas être annulée.")
    db.update("sales_orders", {"status": "CANCELLED"}, "id = ?", (order_id,))
    db.audit(user["username"], "AR", "CANCEL_ORDER", "sales_orders", order_id, order["order_no"])
    return get_order(order_id)


# --------------------------------------------------------------------- livraisons
def ship_order(order_id, user, ship_date=None, lines=None):
    """Livraison : sortie de stock au coût moyen et constatation du coût des ventes."""
    order = get_order(order_id)
    if order["status"] not in ("CONFIRMED", "SHIPPED"):
        raise ErpError("La commande doit être confirmée avant livraison.")
    ship_date = ship_date or db.today()
    db.assert_period_open(ship_date)

    requested = {int(l["line_id"]): money(l["quantity"], 3) for l in lines} if lines else None

    with db.transaction():
        shipment_id = db.insert("shipments", {
            "ship_no": db.next_number("SH", ship_date), "order_id": order_id,
            "ship_date": ship_date, "warehouse": order["warehouse"],
            "status": "DONE", "created_by": user["username"],
        })
        cogs_total = 0.0
        cogs_by_account = {}
        shipped_any = False

        for line in order["lines"]:
            if not line["item_id"]:
                continue
            item = inventory.get_item(line["item_id"])
            if item["item_type"] == "SERVICE":
                continue
            remaining = money(line["quantity"] - line["qty_shipped"], 3)
            qty = requested.get(line["id"], remaining) if requested is not None else remaining
            if qty <= 0:
                continue
            if qty > remaining:
                raise ErpError("Ligne %s : quantité à livrer (%s) supérieure au reste à livrer (%s)."
                               % (line["line_no"], qty, remaining))
            value = inventory.record_movement(
                item["id"], order["warehouse"], "OUT", qty,
                doc_type="SH", doc_number=order["order_no"], user=user,
                reason="Livraison commande %s" % order["order_no"], move_date=ship_date)
            db.insert("shipment_lines", {
                "shipment_id": shipment_id, "order_line_id": line["id"], "item_id": item["id"],
                "quantity": qty, "unit_cost": money(value / qty if qty else 0, 2)})
            db.update("sales_order_lines", {"qty_shipped": money(line["qty_shipped"] + qty, 3)},
                      "id = ?", (line["id"],))
            cogs_total += value
            key = (inventory.cogs_account(item), inventory.inventory_account(item))
            cogs_by_account[key] = money(cogs_by_account.get(key, 0) + value)
            shipped_any = True

        if not shipped_any:
            raise ErpError("Aucune quantité à livrer sur cette commande.")

        batch_id = None
        if cogs_total > 0:
            gl_lines = []
            for (cogs_acc, stock_acc), value in cogs_by_account.items():
                gl_lines.append({"account": cogs_acc, "debit": value,
                                 "description": "Coût des ventes %s" % order["order_no"]})
                gl_lines.append({"account": stock_acc, "credit": value,
                                 "description": "Sortie de stock %s" % order["order_no"]})
            batch_id = accounting.create_batch(
                "S", "Livraison %s" % order["order_no"], ship_date, gl_lines, user,
                source="AR", source_id=shipment_id, auto_post=True)

        db.update("shipments", {"cogs_amount": money(cogs_total), "gl_batch_id": batch_id},
                  "id = ?", (shipment_id,))

        lines_after = db.query("SELECT quantity, qty_shipped FROM sales_order_lines "
                               "WHERE order_id = ?", (order_id,))
        fully = all(money(l["qty_shipped"], 3) >= money(l["quantity"], 3) for l in lines_after)
        db.update("sales_orders", {"status": "SHIPPED" if fully else "CONFIRMED"},
                  "id = ?", (order_id,))
        db.audit(user["username"], "AR", "SHIP", "shipments", shipment_id, order["order_no"])

    return db.query_one("SELECT * FROM shipments WHERE id = ?", (shipment_id,))


# --------------------------------------------------------------------- facturation
def invoice_order(order_id, user, invoice_date=None):
    """Facture les quantités livrées et non encore facturées."""
    order = get_order(order_id)
    if order["status"] in ("DRAFT", "CANCELLED"):
        raise ErpError("La commande doit être confirmée avant facturation.")
    invoice_date = invoice_date or db.today()
    db.assert_period_open(invoice_date)
    customer = partners.require_customer(order["customer_an8"])

    to_invoice = []
    for line in order["lines"]:
        item = inventory.get_item(line["item_id"]) if line["item_id"] else None
        basis = line["quantity"] if (item is None or item["item_type"] == "SERVICE") \
            else line["qty_shipped"]
        qty = money(basis - line["qty_invoiced"], 3)
        if qty > 0:
            to_invoice.append((line, item, qty))
    if not to_invoice:
        raise ErpError("Rien à facturer : aucune quantité livrée en attente de facture.")

    with db.transaction():
        invoice_id = db.insert("ar_invoices", {
            "invoice_no": db.next_number("INV", invoice_date),
            "customer_an8": order["customer_an8"], "order_id": order_id,
            "invoice_date": invoice_date,
            "due_date": due_date_from(invoice_date, customer["payment_terms"]),
            "currency": order["currency"], "status": "OPEN", "created_by": user["username"],
        })
        total_ht = total_vat = 0.0
        revenue_by_account = {}
        vat_total = 0.0

        for i, (line, item, qty) in enumerate(to_invoice, start=1):
            unit_price = money(line["unit_price"] * (1 - (line["discount_pct"] or 0) / 100.0), 2)
            amount = money(qty * unit_price)
            vat = money(amount * (line["vat_rate"] or 0) / 100.0)
            db.insert("ar_invoice_lines", {
                "invoice_id": invoice_id, "line_no": i, "item_id": line["item_id"],
                "description": line["description"], "quantity": qty,
                "unit_price": unit_price, "vat_rate": line["vat_rate"], "amount_ht": amount})
            db.update("sales_order_lines",
                      {"qty_invoiced": money(line["qty_invoiced"] + qty, 3)},
                      "id = ?", (line["id"],))
            total_ht += amount
            total_vat += vat
            vat_total += vat
            account = inventory.revenue_account(item) if item else \
                accounting.map_account("SALES_SERVICES")
            revenue_by_account[account] = money(revenue_by_account.get(account, 0) + amount)

        total_ttc = money(total_ht + total_vat)
        gl_lines = [{"account": accounting.map_account("AR_CONTROL"), "debit": total_ttc,
                     "description": "Client %s" % order["customer_name"],
                     "sub_type": "AB", "sub_id": order["customer_an8"]}]
        for account, amount in revenue_by_account.items():
            gl_lines.append({"account": account, "credit": amount,
                             "description": "Ventes %s" % order["order_no"]})
        if vat_total:
            gl_lines.append({"account": accounting.map_account("VAT_OUT"), "credit": money(vat_total),
                             "description": "TVA collectée"})

        batch_id = accounting.create_batch(
            "V", "Facture client %s" % order["customer_name"], invoice_date, gl_lines, user,
            source="AR", source_id=invoice_id, auto_post=True)

        db.update("ar_invoices", {
            "total_ht": money(total_ht), "total_vat": money(total_vat),
            "total_ttc": total_ttc, "gl_batch_id": batch_id}, "id = ?", (invoice_id,))

        lines_after = db.query("SELECT quantity, qty_invoiced FROM sales_order_lines "
                               "WHERE order_id = ?", (order_id,))
        if all(money(l["qty_invoiced"], 3) >= money(l["quantity"], 3) for l in lines_after):
            db.update("sales_orders", {"status": "INVOICED"}, "id = ?", (order_id,))
        db.audit(user["username"], "AR", "INVOICE", "ar_invoices", invoice_id, order["order_no"])

    return get_invoice(invoice_id)


def get_invoice(invoice_id):
    invoice = db.query_one(
        "SELECT inv.*, ab.alpha_name AS customer_name, ab.address, ab.city, ab.tax_id, "
        "       o.order_no FROM ar_invoices inv "
        "JOIN address_book ab ON ab.an8 = inv.customer_an8 "
        "LEFT JOIN sales_orders o ON o.id = inv.order_id WHERE inv.id = ?", (invoice_id,))
    if not invoice:
        raise ErpError("Facture client introuvable (%s)." % invoice_id)
    invoice["lines"] = db.query(
        "SELECT l.*, i.item_code FROM ar_invoice_lines l LEFT JOIN items i ON i.id = l.item_id "
        "WHERE l.invoice_id = ? ORDER BY l.line_no", (invoice_id,))
    invoice["applications"] = db.query(
        "SELECT a.amount, r.receipt_no, r.receipt_date, r.method FROM ar_applications a "
        "JOIN ar_receipts r ON r.id = a.receipt_id WHERE a.invoice_id = ?", (invoice_id,))
    invoice["balance"] = money(invoice["total_ttc"] - invoice["amount_paid"])
    return invoice


def list_invoices(status=None, customer_an8=None, search=None, limit=200, offset=0):
    sql = ("SELECT inv.*, ab.alpha_name AS customer_name, "
           "       (inv.total_ttc - inv.amount_paid) AS balance "
           "FROM ar_invoices inv JOIN address_book ab ON ab.an8 = inv.customer_an8 WHERE 1 = 1")
    params = []
    if status == "OPEN":
        sql += " AND inv.status IN ('OPEN', 'PARTIAL')"
    elif status:
        sql += " AND inv.status = ?"
        params.append(status)
    if customer_an8:
        sql += " AND inv.customer_an8 = ?"
        params.append(customer_an8)
    if search:
        like = "%%%s%%" % search
        sql += " AND (inv.invoice_no LIKE ? OR ab.alpha_name LIKE ?)"
        params += [like, like]
    sql += " ORDER BY inv.id DESC LIMIT ? OFFSET ?"
    params += [limit, offset]
    return db.query(sql, tuple(params))


# --------------------------------------------------------------------- encaissements
def register_receipt(data, user):
    """Encaissement client, lettré sur les factures les plus anciennes ou sur une sélection."""
    customer = partners.require_customer(int(data["customer_an8"]))
    amount = money(data["amount"])
    if amount <= 0:
        raise ErpError("Le montant encaissé doit être positif.")
    receipt_date = data.get("date") or db.today()
    db.assert_period_open(receipt_date)
    method = data.get("method", "VIREMENT")

    with db.transaction():
        receipt_id = db.insert("ar_receipts", {
            "receipt_no": db.next_number("REC", receipt_date),
            "customer_an8": customer["an8"], "receipt_date": receipt_date,
            "amount": amount, "method": method, "reference": data.get("reference"),
            "created_by": user["username"],
        })

        selections = data.get("applications")
        if not selections:
            open_invoices = db.query(
                "SELECT id, total_ttc, amount_paid FROM ar_invoices "
                "WHERE customer_an8 = ? AND status IN ('OPEN', 'PARTIAL') "
                "ORDER BY due_date, id", (customer["an8"],))
            selections = []
            left = amount
            for invoice in open_invoices:
                if left <= 0:
                    break
                balance = money(invoice["total_ttc"] - invoice["amount_paid"])
                applied = min(balance, left)
                if applied > 0:
                    selections.append({"invoice_id": invoice["id"], "amount": applied})
                    left = money(left - applied)

        applied_total = 0.0
        for selection in selections:
            invoice = get_invoice(int(selection["invoice_id"]))
            applied = money(selection["amount"])
            if applied <= 0:
                continue
            if applied > invoice["balance"] + 0.5:
                raise ErpError("Facture %s : imputation %s supérieure au solde %s."
                               % (invoice["invoice_no"], applied, invoice["balance"]))
            db.insert("ar_applications", {"receipt_id": receipt_id,
                                          "invoice_id": invoice["id"], "amount": applied})
            new_paid = money(invoice["amount_paid"] + applied)
            status = "PAID" if new_paid >= money(invoice["total_ttc"]) - 0.5 else "PARTIAL"
            db.update("ar_invoices", {"amount_paid": new_paid, "status": status},
                      "id = ?", (invoice["id"],))
            applied_total += applied

        if money(applied_total) > amount + 0.5:
            raise ErpError("Le total imputé dépasse le montant encaissé.")

        treasury = accounting.map_account("CASH" if method == "ESPECES" else "BANK")
        gl_lines = [
            {"account": treasury, "debit": amount,
             "description": "Encaissement %s" % customer["alpha_name"]},
            {"account": accounting.map_account("AR_CONTROL"), "credit": amount,
             "description": "Règlement client %s" % customer["alpha_name"],
             "sub_type": "AB", "sub_id": customer["an8"]},
        ]
        batch_id = accounting.create_batch(
            "T", "Encaissement client %s" % customer["alpha_name"], receipt_date,
            gl_lines, user, source="AR", source_id=receipt_id, auto_post=True)
        db.update("ar_receipts", {"gl_batch_id": batch_id}, "id = ?", (receipt_id,))
        db.audit(user["username"], "AR", "RECEIPT", "ar_receipts", receipt_id, str(amount))

    return db.query_one("SELECT * FROM ar_receipts WHERE id = ?", (receipt_id,))


# --------------------------------------------------------------------- états
def aged_receivables(as_of=None):
    """Balance âgée clients (non échu, 1-30, 31-60, 61-90, +90)."""
    as_of = as_of or db.today()
    rows = db.query(
        "SELECT inv.id, inv.invoice_no, inv.invoice_date, inv.due_date, inv.total_ttc, "
        "       inv.amount_paid, ab.an8, ab.alpha_name AS customer_name "
        "FROM ar_invoices inv JOIN address_book ab ON ab.an8 = inv.customer_an8 "
        "WHERE inv.status IN ('OPEN', 'PARTIAL') ORDER BY ab.alpha_name, inv.due_date")
    buckets = {}
    totals = {"current": 0.0, "d30": 0.0, "d60": 0.0, "d90": 0.0, "d90p": 0.0, "total": 0.0}
    ref = datetime.strptime(as_of, "%Y-%m-%d")
    for row in rows:
        balance = money(row["total_ttc"] - row["amount_paid"])
        if balance <= 0:
            continue
        overdue = (ref - datetime.strptime(row["due_date"], "%Y-%m-%d")).days
        if overdue <= 0:
            bucket = "current"
        elif overdue <= 30:
            bucket = "d30"
        elif overdue <= 60:
            bucket = "d60"
        elif overdue <= 90:
            bucket = "d90"
        else:
            bucket = "d90p"
        entry = buckets.setdefault(row["an8"], {
            "an8": row["an8"], "customer_name": row["customer_name"],
            "current": 0.0, "d30": 0.0, "d60": 0.0, "d90": 0.0, "d90p": 0.0, "total": 0.0})
        entry[bucket] = money(entry[bucket] + balance)
        entry["total"] = money(entry["total"] + balance)
        totals[bucket] = money(totals[bucket] + balance)
        totals["total"] = money(totals["total"] + balance)
    return {"as_of": as_of, "lines": sorted(buckets.values(), key=lambda e: -e["total"]),
            "totals": totals}


def sales_analysis(fy=None):
    fy = fy or int(db.today()[:4])
    by_month = db.query(
        "SELECT substr(invoice_date, 1, 7) AS month, SUM(total_ht) AS revenue, count(*) AS invoices "
        "FROM ar_invoices WHERE status <> 'CANCELLED' AND substr(invoice_date, 1, 4) = ? "
        "GROUP BY month ORDER BY month", (str(fy),))
    by_customer = db.query(
        "SELECT ab.alpha_name AS customer, SUM(inv.total_ht) AS revenue "
        "FROM ar_invoices inv JOIN address_book ab ON ab.an8 = inv.customer_an8 "
        "WHERE inv.status <> 'CANCELLED' AND substr(inv.invoice_date, 1, 4) = ? "
        "GROUP BY ab.an8 ORDER BY revenue DESC LIMIT 10", (str(fy),))
    by_item = db.query(
        "SELECT i.item_code, i.description, SUM(l.quantity) AS qty, SUM(l.amount_ht) AS revenue "
        "FROM ar_invoice_lines l JOIN ar_invoices inv ON inv.id = l.invoice_id "
        "JOIN items i ON i.id = l.item_id "
        "WHERE inv.status <> 'CANCELLED' AND substr(inv.invoice_date, 1, 4) = ? "
        "GROUP BY i.id ORDER BY revenue DESC LIMIT 10", (str(fy),))
    return {"fy": fy, "by_month": by_month, "by_customer": by_customer, "by_item": by_item}
