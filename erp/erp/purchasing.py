# -*- coding: utf-8 -*-
"""Cycle d'achat : commande fournisseur → réception → facture → paiement."""
from datetime import datetime

from . import accounting, db, inventory, partners
from .db import ErpError, money
from .sales import due_date_from


# --------------------------------------------------------------------- commandes
def list_orders(status=None, supplier_an8=None, search=None, limit=200, offset=0):
    sql = ("SELECT o.*, ab.alpha_name AS supplier_name "
           "FROM purchase_orders o JOIN address_book ab ON ab.an8 = o.supplier_an8 WHERE 1 = 1")
    params = []
    if status:
        sql += " AND o.status = ?"
        params.append(status)
    if supplier_an8:
        sql += " AND o.supplier_an8 = ?"
        params.append(supplier_an8)
    if search:
        like = "%%%s%%" % search
        sql += " AND (o.order_no LIKE ? OR ab.alpha_name LIKE ?)"
        params += [like, like]
    sql += " ORDER BY o.id DESC LIMIT ? OFFSET ?"
    params += [limit, offset]
    return db.query(sql, tuple(params))


def get_order(order_id):
    order = db.query_one(
        "SELECT o.*, ab.alpha_name AS supplier_name, ab.city, ab.phone "
        "FROM purchase_orders o JOIN address_book ab ON ab.an8 = o.supplier_an8 WHERE o.id = ?",
        (order_id,))
    if not order:
        raise ErpError("Commande fournisseur introuvable (%s)." % order_id)
    order["lines"] = db.query(
        "SELECT l.*, i.item_code, i.item_type FROM purchase_order_lines l "
        "LEFT JOIN items i ON i.id = l.item_id WHERE l.order_id = ? ORDER BY l.line_no",
        (order_id,))
    order["receipts"] = db.query(
        "SELECT * FROM goods_receipts WHERE order_id = ? ORDER BY id", (order_id,))
    order["invoices"] = db.query(
        "SELECT * FROM ap_invoices WHERE order_id = ? ORDER BY id", (order_id,))
    return order


def save_order(data, user):
    supplier = partners.require_supplier(int(data["supplier_an8"]))
    order_id = data.get("id")
    order_date = data.get("order_date") or db.today()
    warehouse = data.get("warehouse") or db.get_setting("default_warehouse", "DIAM")
    lines = data.get("lines") or []
    if not lines:
        raise ErpError("Une commande d'achat doit comporter au moins une ligne.")

    with db.transaction():
        if order_id:
            existing = get_order(order_id)
            if existing["status"] not in ("DRAFT", "APPROVED"):
                raise ErpError("La commande %s n'est plus modifiable (statut %s)."
                               % (existing["order_no"], existing["status"]))
            if any(l["qty_received"] for l in existing["lines"]):
                raise ErpError("Des réceptions existent déjà : la commande n'est plus modifiable.")
            db.execute("DELETE FROM purchase_order_lines WHERE order_id = ?", (order_id,))
        else:
            order_id = db.insert("purchase_orders", {
                "order_no": db.next_number("PO", order_date),
                "supplier_an8": supplier["an8"], "order_date": order_date,
                "expected_date": data.get("expected_date"), "warehouse": warehouse,
                "business_unit": data.get("business_unit"),
                "currency": data.get("currency", "XOF"), "status": "DRAFT",
                "notes": data.get("notes"), "created_by": user["username"],
            })

        total_ht = total_vat = 0.0
        for i, line in enumerate(lines, start=1):
            item = inventory.get_item(int(line["item_id"])) if line.get("item_id") else None
            qty = money(line["quantity"], 3)
            cost = money(line["unit_cost"], 2)
            if qty <= 0:
                raise ErpError("Chaque ligne doit porter une quantité positive.")
            amount = money(qty * cost)
            vat_rate = float(line.get("vat_rate", 18) or 0)
            total_ht += amount
            total_vat += money(amount * vat_rate / 100.0)
            db.insert("purchase_order_lines", {
                "order_id": order_id, "line_no": i,
                "item_id": item["id"] if item else None,
                "description": line.get("description") or (item["description"] if item else ""),
                "quantity": qty, "uom": line.get("uom") or (item["uom"] if item else "U"),
                "unit_cost": cost, "vat_rate": vat_rate, "amount_ht": amount,
                "expense_account": line.get("expense_account"),
            })

        db.update("purchase_orders", {
            "supplier_an8": supplier["an8"], "order_date": order_date,
            "expected_date": data.get("expected_date"), "warehouse": warehouse,
            "business_unit": data.get("business_unit"), "notes": data.get("notes"),
            "total_ht": money(total_ht), "total_vat": money(total_vat),
            "total_ttc": money(total_ht + total_vat)}, "id = ?", (order_id,))
        db.audit(user["username"], "AP", "SAVE_ORDER", "purchase_orders", order_id)
    return get_order(order_id)


def approve_order(order_id, user):
    order = get_order(order_id)
    if order["status"] != "DRAFT":
        raise ErpError("Seule une commande en brouillon peut être approuvée.")
    threshold = money(db.get_setting("po_approval_threshold", 5000000))
    if money(order["total_ttc"]) > threshold and user["role"] not in ("ADMIN", "COMPTABLE"):
        raise ErpError("Au-delà de %s F CFA, l'approbation relève de la direction financière."
                       % int(threshold))
    db.update("purchase_orders", {"status": "APPROVED", "approved_by": user["username"]},
              "id = ?", (order_id,))
    db.audit(user["username"], "AP", "APPROVE_ORDER", "purchase_orders", order_id, order["order_no"])
    return get_order(order_id)


def cancel_order(order_id, user):
    order = get_order(order_id)
    if order["status"] in ("RECEIVED", "INVOICED"):
        raise ErpError("Une commande réceptionnée ou facturée ne peut pas être annulée.")
    db.update("purchase_orders", {"status": "CANCELLED"}, "id = ?", (order_id,))
    db.audit(user["username"], "AP", "CANCEL_ORDER", "purchase_orders", order_id, order["order_no"])
    return get_order(order_id)


# --------------------------------------------------------------------- réceptions
def receive_order(order_id, user, receipt_date=None, lines=None):
    """Réception : entrée en stock au prix d'achat, contrepartie « factures non parvenues »."""
    order = get_order(order_id)
    if order["status"] not in ("APPROVED", "RECEIVED"):
        raise ErpError("La commande doit être approuvée avant réception.")
    receipt_date = receipt_date or db.today()
    db.assert_period_open(receipt_date)
    requested = {int(l["line_id"]): money(l["quantity"], 3) for l in lines} if lines else None

    with db.transaction():
        receipt_id = db.insert("goods_receipts", {
            "receipt_no": db.next_number("GR", receipt_date), "order_id": order_id,
            "receipt_date": receipt_date, "warehouse": order["warehouse"],
            "created_by": user["username"],
        })
        total_value = 0.0
        stock_by_account = {}
        received_any = False

        for line in order["lines"]:
            remaining = money(line["quantity"] - line["qty_received"], 3)
            qty = requested.get(line["id"], remaining) if requested is not None else remaining
            if qty <= 0:
                continue
            if qty > remaining:
                raise ErpError("Ligne %s : quantité reçue (%s) supérieure au reste à recevoir (%s)."
                               % (line["line_no"], qty, remaining))
            value = money(qty * line["unit_cost"])
            item = inventory.get_item(line["item_id"]) if line["item_id"] else None
            if item and item["item_type"] != "SERVICE":
                inventory.record_movement(
                    item["id"], order["warehouse"], "IN", qty, unit_cost=line["unit_cost"],
                    doc_type="GR", doc_number=order["order_no"], user=user,
                    reason="Réception commande %s" % order["order_no"], move_date=receipt_date)
                account = inventory.inventory_account(item)
            else:
                account = line["expense_account"] or accounting.map_account("PURCHASE_EXPENSE")
            db.insert("goods_receipt_lines", {
                "receipt_id": receipt_id, "order_line_id": line["id"],
                "item_id": line["item_id"], "quantity": qty, "unit_cost": line["unit_cost"]})
            db.update("purchase_order_lines",
                      {"qty_received": money(line["qty_received"] + qty, 3)},
                      "id = ?", (line["id"],))
            stock_by_account[account] = money(stock_by_account.get(account, 0) + value)
            total_value += value
            received_any = True

        if not received_any:
            raise ErpError("Aucune quantité à réceptionner sur cette commande.")

        gl_lines = [{"account": account, "debit": amount,
                     "description": "Réception %s" % order["order_no"]}
                    for account, amount in stock_by_account.items()]
        gl_lines.append({"account": accounting.map_account("GRNI"), "credit": money(total_value),
                         "description": "Factures non parvenues %s" % order["supplier_name"],
                         "sub_type": "AB", "sub_id": order["supplier_an8"]})
        batch_id = accounting.create_batch(
            "A", "Réception %s" % order["order_no"], receipt_date, gl_lines, user,
            source="AP", source_id=receipt_id, auto_post=True)

        db.update("goods_receipts", {"total_value": money(total_value), "gl_batch_id": batch_id},
                  "id = ?", (receipt_id,))
        lines_after = db.query("SELECT quantity, qty_received FROM purchase_order_lines "
                               "WHERE order_id = ?", (order_id,))
        if all(money(l["qty_received"], 3) >= money(l["quantity"], 3) for l in lines_after):
            db.update("purchase_orders", {"status": "RECEIVED"}, "id = ?", (order_id,))
        db.audit(user["username"], "AP", "RECEIVE", "goods_receipts", receipt_id, order["order_no"])

    return db.query_one("SELECT * FROM goods_receipts WHERE id = ?", (receipt_id,))


# --------------------------------------------------------------------- factures fournisseur
def invoice_order(order_id, user, invoice_date=None, supplier_ref=None):
    """Facture fournisseur : solde les « factures non parvenues » et ouvre la dette."""
    order = get_order(order_id)
    if order["status"] in ("DRAFT", "CANCELLED"):
        raise ErpError("La commande doit être approuvée avant facturation.")
    invoice_date = invoice_date or db.today()
    db.assert_period_open(invoice_date)
    supplier = partners.require_supplier(order["supplier_an8"])

    to_invoice = []
    for line in order["lines"]:
        qty = money(line["qty_received"] - line["qty_invoiced"], 3)
        if qty > 0:
            to_invoice.append((line, qty))
    if not to_invoice:
        raise ErpError("Rien à facturer : aucune réception en attente de facture.")

    with db.transaction():
        invoice_id = db.insert("ap_invoices", {
            "invoice_no": db.next_number("API", invoice_date), "supplier_ref": supplier_ref,
            "supplier_an8": order["supplier_an8"], "order_id": order_id,
            "invoice_date": invoice_date,
            "due_date": due_date_from(invoice_date, supplier["payment_terms"]),
            "currency": order["currency"], "status": "OPEN", "created_by": user["username"],
        })
        total_ht = total_vat = 0.0
        for i, (line, qty) in enumerate(to_invoice, start=1):
            amount = money(qty * line["unit_cost"])
            vat = money(amount * (line["vat_rate"] or 0) / 100.0)
            db.insert("ap_invoice_lines", {
                "invoice_id": invoice_id, "line_no": i, "item_id": line["item_id"],
                "description": line["description"], "quantity": qty,
                "unit_cost": line["unit_cost"], "vat_rate": line["vat_rate"],
                "amount_ht": amount, "account_code": line["expense_account"]})
            db.update("purchase_order_lines",
                      {"qty_invoiced": money(line["qty_invoiced"] + qty, 3)},
                      "id = ?", (line["id"],))
            total_ht += amount
            total_vat += vat

        total_ttc = money(total_ht + total_vat)
        gl_lines = [{"account": accounting.map_account("GRNI"), "debit": money(total_ht),
                     "description": "Solde factures non parvenues %s" % order["order_no"],
                     "sub_type": "AB", "sub_id": order["supplier_an8"]}]
        if total_vat:
            gl_lines.append({"account": accounting.map_account("VAT_IN"), "debit": money(total_vat),
                             "description": "TVA récupérable"})
        gl_lines.append({"account": accounting.map_account("AP_CONTROL"), "credit": total_ttc,
                         "description": "Fournisseur %s" % order["supplier_name"],
                         "sub_type": "AB", "sub_id": order["supplier_an8"]})
        batch_id = accounting.create_batch(
            "A", "Facture fournisseur %s" % order["supplier_name"], invoice_date,
            gl_lines, user, source="AP", source_id=invoice_id, auto_post=True)

        db.update("ap_invoices", {"total_ht": money(total_ht), "total_vat": money(total_vat),
                                  "total_ttc": total_ttc, "gl_batch_id": batch_id},
                  "id = ?", (invoice_id,))
        lines_after = db.query("SELECT quantity, qty_invoiced FROM purchase_order_lines "
                               "WHERE order_id = ?", (order_id,))
        if all(money(l["qty_invoiced"], 3) >= money(l["quantity"], 3) for l in lines_after):
            db.update("purchase_orders", {"status": "INVOICED"}, "id = ?", (order_id,))
        db.audit(user["username"], "AP", "INVOICE", "ap_invoices", invoice_id, order["order_no"])

    return get_invoice(invoice_id)


def create_expense_invoice(data, user):
    """Facture fournisseur directe, sans commande (loyer, électricité, honoraires…)."""
    supplier = partners.require_supplier(int(data["supplier_an8"]))
    invoice_date = data.get("invoice_date") or db.today()
    db.assert_period_open(invoice_date)
    lines = data.get("lines") or []
    if not lines:
        raise ErpError("La facture doit comporter au moins une ligne.")

    with db.transaction():
        invoice_id = db.insert("ap_invoices", {
            "invoice_no": db.next_number("API", invoice_date),
            "supplier_ref": data.get("supplier_ref"), "supplier_an8": supplier["an8"],
            "invoice_date": invoice_date,
            "due_date": data.get("due_date") or due_date_from(invoice_date,
                                                              supplier["payment_terms"]),
            "currency": "XOF", "status": "OPEN", "created_by": user["username"],
        })
        total_ht = total_vat = 0.0
        expense_by_account = {}
        for i, line in enumerate(lines, start=1):
            amount = money(line["amount_ht"])
            vat_rate = float(line.get("vat_rate", 18) or 0)
            vat = money(amount * vat_rate / 100.0)
            account = line.get("account_code") or accounting.map_account("PURCHASE_EXPENSE")
            accounting.get_account(account)
            db.insert("ap_invoice_lines", {
                "invoice_id": invoice_id, "line_no": i, "description": line["description"],
                "quantity": 1, "unit_cost": amount, "vat_rate": vat_rate,
                "amount_ht": amount, "account_code": account})
            expense_by_account[account] = money(expense_by_account.get(account, 0) + amount)
            total_ht += amount
            total_vat += vat

        total_ttc = money(total_ht + total_vat)
        gl_lines = [{"account": account, "debit": amount, "description": data.get("description")
                     or "Charges %s" % supplier["alpha_name"]}
                    for account, amount in expense_by_account.items()]
        if total_vat:
            gl_lines.append({"account": accounting.map_account("VAT_IN"), "debit": money(total_vat),
                             "description": "TVA récupérable"})
        gl_lines.append({"account": accounting.map_account("AP_CONTROL"), "credit": total_ttc,
                         "description": "Fournisseur %s" % supplier["alpha_name"],
                         "sub_type": "AB", "sub_id": supplier["an8"]})
        batch_id = accounting.create_batch(
            "A", "Facture %s" % supplier["alpha_name"], invoice_date, gl_lines, user,
            source="AP", source_id=invoice_id, auto_post=True)
        db.update("ap_invoices", {"total_ht": money(total_ht), "total_vat": money(total_vat),
                                  "total_ttc": total_ttc, "gl_batch_id": batch_id},
                  "id = ?", (invoice_id,))
        db.audit(user["username"], "AP", "EXPENSE_INVOICE", "ap_invoices", invoice_id)
    return get_invoice(invoice_id)


def get_invoice(invoice_id):
    invoice = db.query_one(
        "SELECT inv.*, ab.alpha_name AS supplier_name, o.order_no FROM ap_invoices inv "
        "JOIN address_book ab ON ab.an8 = inv.supplier_an8 "
        "LEFT JOIN purchase_orders o ON o.id = inv.order_id WHERE inv.id = ?", (invoice_id,))
    if not invoice:
        raise ErpError("Facture fournisseur introuvable (%s)." % invoice_id)
    invoice["lines"] = db.query(
        "SELECT l.*, i.item_code FROM ap_invoice_lines l LEFT JOIN items i ON i.id = l.item_id "
        "WHERE l.invoice_id = ? ORDER BY l.line_no", (invoice_id,))
    invoice["balance"] = money(invoice["total_ttc"] - invoice["amount_paid"])
    return invoice


def list_invoices(status=None, supplier_an8=None, search=None, limit=200, offset=0):
    sql = ("SELECT inv.*, ab.alpha_name AS supplier_name, "
           "       (inv.total_ttc - inv.amount_paid) AS balance "
           "FROM ap_invoices inv JOIN address_book ab ON ab.an8 = inv.supplier_an8 WHERE 1 = 1")
    params = []
    if status == "OPEN":
        sql += " AND inv.status IN ('OPEN', 'PARTIAL')"
    elif status:
        sql += " AND inv.status = ?"
        params.append(status)
    if supplier_an8:
        sql += " AND inv.supplier_an8 = ?"
        params.append(supplier_an8)
    if search:
        like = "%%%s%%" % search
        sql += " AND (inv.invoice_no LIKE ? OR ab.alpha_name LIKE ? OR inv.supplier_ref LIKE ?)"
        params += [like, like, like]
    sql += " ORDER BY inv.id DESC LIMIT ? OFFSET ?"
    params += [limit, offset]
    return db.query(sql, tuple(params))


# --------------------------------------------------------------------- paiements
def register_payment(data, user):
    supplier = partners.require_supplier(int(data["supplier_an8"]))
    amount = money(data["amount"])
    if amount <= 0:
        raise ErpError("Le montant du paiement doit être positif.")
    payment_date = data.get("date") or db.today()
    db.assert_period_open(payment_date)
    method = data.get("method", "VIREMENT")

    with db.transaction():
        payment_id = db.insert("ap_payments", {
            "payment_no": db.next_number("PAY", payment_date), "supplier_an8": supplier["an8"],
            "payment_date": payment_date, "amount": amount, "method": method,
            "reference": data.get("reference"), "created_by": user["username"],
        })

        selections = data.get("applications")
        if not selections:
            open_invoices = db.query(
                "SELECT id, total_ttc, amount_paid FROM ap_invoices "
                "WHERE supplier_an8 = ? AND status IN ('OPEN', 'PARTIAL') ORDER BY due_date, id",
                (supplier["an8"],))
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

        for selection in selections:
            invoice = get_invoice(int(selection["invoice_id"]))
            applied = money(selection["amount"])
            if applied <= 0:
                continue
            if applied > invoice["balance"] + 0.5:
                raise ErpError("Facture %s : imputation supérieure au solde." % invoice["invoice_no"])
            db.insert("ap_applications", {"payment_id": payment_id,
                                          "invoice_id": invoice["id"], "amount": applied})
            new_paid = money(invoice["amount_paid"] + applied)
            status = "PAID" if new_paid >= money(invoice["total_ttc"]) - 0.5 else "PARTIAL"
            db.update("ap_invoices", {"amount_paid": new_paid, "status": status},
                      "id = ?", (invoice["id"],))

        treasury = accounting.map_account("CASH" if method == "ESPECES" else "BANK")
        gl_lines = [
            {"account": accounting.map_account("AP_CONTROL"), "debit": amount,
             "description": "Règlement %s" % supplier["alpha_name"],
             "sub_type": "AB", "sub_id": supplier["an8"]},
            {"account": treasury, "credit": amount,
             "description": "Décaissement %s" % supplier["alpha_name"]},
        ]
        batch_id = accounting.create_batch(
            "T", "Paiement fournisseur %s" % supplier["alpha_name"], payment_date,
            gl_lines, user, source="AP", source_id=payment_id, auto_post=True)
        db.update("ap_payments", {"gl_batch_id": batch_id}, "id = ?", (payment_id,))
        db.audit(user["username"], "AP", "PAYMENT", "ap_payments", payment_id, str(amount))

    return db.query_one("SELECT * FROM ap_payments WHERE id = ?", (payment_id,))


# --------------------------------------------------------------------- états
def aged_payables(as_of=None):
    as_of = as_of or db.today()
    rows = db.query(
        "SELECT inv.due_date, inv.total_ttc, inv.amount_paid, ab.an8, "
        "       ab.alpha_name AS supplier_name FROM ap_invoices inv "
        "JOIN address_book ab ON ab.an8 = inv.supplier_an8 "
        "WHERE inv.status IN ('OPEN', 'PARTIAL')")
    buckets = {}
    totals = {"current": 0.0, "d30": 0.0, "d60": 0.0, "d90": 0.0, "d90p": 0.0, "total": 0.0}
    ref = datetime.strptime(as_of, "%Y-%m-%d")
    for row in rows:
        balance = money(row["total_ttc"] - row["amount_paid"])
        if balance <= 0:
            continue
        overdue = (ref - datetime.strptime(row["due_date"], "%Y-%m-%d")).days
        bucket = ("current" if overdue <= 0 else "d30" if overdue <= 30 else
                  "d60" if overdue <= 60 else "d90" if overdue <= 90 else "d90p")
        entry = buckets.setdefault(row["an8"], {
            "an8": row["an8"], "supplier_name": row["supplier_name"],
            "current": 0.0, "d30": 0.0, "d60": 0.0, "d90": 0.0, "d90p": 0.0, "total": 0.0})
        entry[bucket] = money(entry[bucket] + balance)
        entry["total"] = money(entry["total"] + balance)
        totals[bucket] = money(totals[bucket] + balance)
        totals["total"] = money(totals["total"] + balance)
    return {"as_of": as_of, "lines": sorted(buckets.values(), key=lambda e: -e["total"]),
            "totals": totals}
