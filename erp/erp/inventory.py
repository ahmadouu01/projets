# -*- coding: utf-8 -*-
"""Articles, entrepôts et mouvements de stock (valorisation en coût moyen pondéré)."""
from . import accounting, db
from .db import ErpError, money

MOVE_TYPES = ("IN", "OUT", "ADJ", "TRF_IN", "TRF_OUT")

INVENTORY_KEY_BY_TYPE = {
    "STOCK": "INVENTORY_GOODS",
    "MATIERE": "INVENTORY_RAW",
    "FINI": "INVENTORY_FINISHED",
}
COGS_KEY_BY_TYPE = {
    "STOCK": "COGS",
    "MATIERE": "COGS_RAW",
    "FINI": "COGS",
}


def inventory_account(item):
    """Compte de stock correspondant au type d'article."""
    return accounting.map_account(INVENTORY_KEY_BY_TYPE.get(item["item_type"], "INVENTORY_GOODS"))


def cogs_account(item):
    return accounting.map_account(COGS_KEY_BY_TYPE.get(item["item_type"], "COGS"))


def revenue_account(item):
    if item["item_type"] == "SERVICE":
        return accounting.map_account("SALES_SERVICES")
    if item["item_type"] == "FINI":
        return accounting.map_account("SALES_FINISHED")
    return accounting.map_account("SALES_GOODS")


# --------------------------------------------------------------------- entrepôts
def list_warehouses():
    return db.query("SELECT * FROM warehouses WHERE active = 1 ORDER BY code")


def save_warehouse(data, user):
    code = data["code"].strip().upper()
    payload = {"code": code, "name": data["name"].strip(),
               "business_unit": data.get("business_unit"),
               "address": data.get("address"), "city": data.get("city"),
               "active": 1 if data.get("active", 1) else 0}
    if db.query_one("SELECT code FROM warehouses WHERE code = ?", (code,)):
        payload.pop("code")
        db.update("warehouses", payload, "code = ?", (code,))
    else:
        db.insert("warehouses", payload)
    db.audit(user["username"], "IN", "SAVE", "warehouses", code)
    return db.query_one("SELECT * FROM warehouses WHERE code = ?", (code,))


# --------------------------------------------------------------------- articles
def get_item(item_id):
    item = db.query_one("SELECT * FROM items WHERE id = ?", (item_id,))
    if not item:
        raise ErpError("Article introuvable (%s)." % item_id)
    return item


def list_items(search=None, item_type=None, active_only=True, limit=500, offset=0):
    sql = ("SELECT i.*, COALESCE((SELECT SUM(s.qty_on_hand) FROM stock s "
           "WHERE s.item_id = i.id), 0) AS qty_on_hand "
           "FROM items i WHERE 1 = 1")
    params = []
    if active_only:
        sql += " AND i.active = 1"
    if item_type:
        sql += " AND i.item_type = ?"
        params.append(item_type)
    if search:
        sql += " AND (i.item_code LIKE ? OR i.description LIKE ? OR i.category LIKE ?)"
        like = "%%%s%%" % search
        params += [like, like, like]
    sql += " ORDER BY i.item_code LIMIT ? OFFSET ?"
    params += [limit, offset]
    return db.query(sql, tuple(params))


def save_item(data, user):
    payload = {
        "item_code": data["item_code"].strip().upper(),
        "description": data["description"].strip(),
        "item_type": data.get("item_type", "STOCK"),
        "category": data.get("category"),
        "uom": data.get("uom", "U"),
        "sale_price": money(data.get("sale_price", 0)),
        "standard_cost": money(data.get("standard_cost", 0)),
        "vat_rate": float(data.get("vat_rate", 18)),
        "min_stock": float(data.get("min_stock", 0)),
        "lead_time_days": int(data.get("lead_time_days", 0)),
        "supplier_an8": data.get("supplier_an8"),
        "active": 1 if data.get("active", 1) else 0,
    }
    if payload["item_type"] not in ("STOCK", "MATIERE", "FINI", "SERVICE"):
        raise ErpError("Type d'article invalide.")
    item_id = data.get("id")
    if item_id:
        db.update("items", payload, "id = ?", (item_id,))
        db.audit(user["username"], "IN", "UPDATE", "items", item_id)
    else:
        payload["average_cost"] = payload["standard_cost"]
        if db.query_one("SELECT id FROM items WHERE item_code = ?", (payload["item_code"],)):
            raise ErpError("La référence article %s existe déjà." % payload["item_code"])
        item_id = db.insert("items", payload)
        db.audit(user["username"], "IN", "CREATE", "items", item_id)
    return get_item(item_id)


def item_stock(item_id):
    return db.query(
        "SELECT s.*, w.name AS warehouse_name FROM stock s "
        "JOIN warehouses w ON w.code = s.warehouse "
        "WHERE s.item_id = ? ORDER BY s.warehouse", (item_id,))


def stock_on_hand(item_id, warehouse):
    return money(db.scalar(
        "SELECT qty_on_hand FROM stock WHERE item_id = ? AND warehouse = ?",
        (item_id, warehouse), 0), 3)


# --------------------------------------------------------------------- mouvements
def record_movement(item_id, warehouse, move_type, quantity, unit_cost=None,
                    doc_type=None, doc_number=None, user=None, reason=None,
                    move_date=None, allow_negative=False):
    """Enregistre un mouvement, met à jour le stock et le coût moyen pondéré.

    Retourne la valeur du mouvement (quantité × coût unitaire retenu).
    """
    if move_type not in MOVE_TYPES:
        raise ErpError("Type de mouvement invalide : %s" % move_type)
    quantity = money(quantity, 3)
    if move_type == "ADJ":
        # une régularisation porte un delta signé (positif = entrée, négatif = sortie)
        if quantity == 0:
            raise ErpError("Une régularisation doit porter une quantité non nulle.")
    elif quantity <= 0:
        raise ErpError("La quantité d'un mouvement doit être strictement positive.")

    item = get_item(item_id)
    if item["item_type"] == "SERVICE":
        raise ErpError("L'article %s est un service : il ne se stocke pas." % item["item_code"])
    if not db.query_one("SELECT code FROM warehouses WHERE code = ?", (warehouse,)):
        raise ErpError("Entrepôt inconnu : %s" % warehouse)

    row = db.query_one("SELECT * FROM stock WHERE item_id = ? AND warehouse = ?",
                       (item_id, warehouse))
    if not row:
        db.insert("stock", {"item_id": item_id, "warehouse": warehouse,
                            "qty_on_hand": 0, "qty_reserved": 0})
        row = {"qty_on_hand": 0.0, "qty_reserved": 0.0}

    on_hand = money(row["qty_on_hand"], 3)
    avg_cost = money(item["average_cost"] or item["standard_cost"], 2)

    if move_type in ("IN", "TRF_IN"):
        cost = money(unit_cost if unit_cost is not None else avg_cost, 2)
        total_qty = money(_global_qty(item_id) + quantity, 3)
        if total_qty > 0:
            new_avg = ((_global_qty(item_id) * avg_cost) + (quantity * cost)) / total_qty
            db.update("items", {"average_cost": money(new_avg, 2)}, "id = ?", (item_id,))
        new_on_hand = money(on_hand + quantity, 3)
        signed_qty = quantity
    elif move_type in ("OUT", "TRF_OUT"):
        cost = money(avg_cost, 2)
        new_on_hand = money(on_hand - quantity, 3)
        if new_on_hand < 0 and not (allow_negative or db.get_setting("allow_negative_stock") == "1"):
            raise ErpError("Stock insuffisant : %s en %s (disponible %s, demandé %s)."
                           % (item["item_code"], warehouse, on_hand, quantity))
        signed_qty = -quantity
    else:  # ADJ : delta signé
        cost = money(unit_cost if unit_cost is not None else avg_cost, 2)
        new_on_hand = money(on_hand + quantity, 3)
        if new_on_hand < 0 and not (allow_negative or db.get_setting("allow_negative_stock") == "1"):
            raise ErpError("La régularisation rendrait le stock négatif (%s en %s)."
                           % (item["item_code"], warehouse))
        signed_qty = quantity

    db.update("stock", {"qty_on_hand": new_on_hand},
              "item_id = ? AND warehouse = ?", (item_id, warehouse))

    value = money(abs(quantity) * cost)
    db.insert("stock_movements", {
        "move_date": move_date or db.today(), "item_id": item_id, "warehouse": warehouse,
        "move_type": move_type, "quantity": signed_qty, "unit_cost": cost, "value": value,
        "balance_after": new_on_hand, "doc_type": doc_type, "doc_number": doc_number,
        "reason": reason, "username": user["username"] if user else None,
    })
    return value


def _global_qty(item_id):
    return money(db.scalar("SELECT COALESCE(SUM(qty_on_hand), 0) FROM stock WHERE item_id = ?",
                           (item_id,), 0), 3)


def list_movements(item_id=None, warehouse=None, date_from=None, date_to=None, limit=300):
    sql = ("SELECT m.*, i.item_code, i.description AS item_description "
           "FROM stock_movements m JOIN items i ON i.id = m.item_id WHERE 1 = 1")
    params = []
    if item_id:
        sql += " AND m.item_id = ?"
        params.append(item_id)
    if warehouse:
        sql += " AND m.warehouse = ?"
        params.append(warehouse)
    if date_from:
        sql += " AND m.move_date >= ?"
        params.append(date_from)
    if date_to:
        sql += " AND m.move_date <= ?"
        params.append(date_to)
    sql += " ORDER BY m.id DESC LIMIT ?"
    params.append(limit)
    return db.query(sql, tuple(params))


# --------------------------------------------------------------------- régularisations
def adjust_stock(data, user):
    """Régularisation d'inventaire : écart constaté entre le stock théorique et le réel."""
    item = get_item(int(data["item_id"]))
    warehouse = data["warehouse"]
    counted = money(data["counted_qty"], 3)
    move_date = data.get("date") or db.today()
    reason = data.get("reason") or "Régularisation d'inventaire"

    with db.transaction():
        current = stock_on_hand(item["id"], warehouse)
        delta = money(counted - current, 3)
        if delta == 0:
            raise ErpError("Le stock compté est identique au stock théorique : rien à régulariser.")
        value = record_movement(item["id"], warehouse, "ADJ", delta,
                                doc_type="ADJ", doc_number=db.next_number("ADJ", move_date),
                                user=user, reason=reason, move_date=move_date)
        stock_acc = inventory_account(item)
        gap_acc = accounting.map_account("STOCK_ADJ")
        lines = ([{"account": stock_acc, "debit": value, "description": reason,
                   "sub_type": "IT", "sub_id": item["item_code"]},
                  {"account": gap_acc, "credit": value, "description": reason}]
                 if delta > 0 else
                 [{"account": gap_acc, "debit": value, "description": reason},
                  {"account": stock_acc, "credit": value, "description": reason,
                   "sub_type": "IT", "sub_id": item["item_code"]}])
        batch_id = accounting.create_batch(
            "S", "Régularisation de stock %s" % item["item_code"], move_date, lines, user,
            source="IN", source_id=item["id"], auto_post=True)
        db.audit(user["username"], "IN", "ADJUST", "items", item["id"],
                 "%s → %s en %s" % (current, counted, warehouse))
    return {"item": get_item(item["id"]), "delta": delta, "gl_batch_id": batch_id}


def transfer_stock(data, user):
    """Transfert entre entrepôts (sans impact sur le résultat)."""
    item = get_item(int(data["item_id"]))
    qty = money(data["quantity"], 3)
    src, dst = data["from_warehouse"], data["to_warehouse"]
    if src == dst:
        raise ErpError("Les entrepôts d'origine et de destination sont identiques.")
    move_date = data.get("date") or db.today()
    doc_number = db.next_number("TRF", move_date)
    with db.transaction():
        record_movement(item["id"], src, "TRF_OUT", qty, doc_type="TRF",
                        doc_number=doc_number, user=user,
                        reason="Transfert vers %s" % dst, move_date=move_date)
        record_movement(item["id"], dst, "TRF_IN", qty, unit_cost=item["average_cost"],
                        doc_type="TRF", doc_number=doc_number, user=user,
                        reason="Transfert depuis %s" % src, move_date=move_date)
        db.audit(user["username"], "IN", "TRANSFER", "items", item["id"], doc_number)
    return {"doc_number": doc_number, "item": get_item(item["id"])}


# --------------------------------------------------------------------- états
def stock_valuation(warehouse=None):
    sql = ("SELECT i.id, i.item_code, i.description, i.item_type, i.uom, i.average_cost, "
           "       s.warehouse, s.qty_on_hand, "
           "       ROUND(s.qty_on_hand * i.average_cost) AS value, i.min_stock "
           "FROM stock s JOIN items i ON i.id = s.item_id WHERE s.qty_on_hand <> 0")
    params = []
    if warehouse:
        sql += " AND s.warehouse = ?"
        params.append(warehouse)
    sql += " ORDER BY i.item_code, s.warehouse"
    rows = db.query(sql, tuple(params))
    total = money(sum(r["value"] or 0 for r in rows))
    return {"lines": rows, "total_value": total, "count": len(rows)}


def reorder_report():
    """Articles sous le stock de sécurité."""
    return db.query(
        "SELECT i.id, i.item_code, i.description, i.min_stock, i.lead_time_days, "
        "       COALESCE(SUM(s.qty_on_hand), 0) AS qty_on_hand, "
        "       ab.alpha_name AS supplier "
        "FROM items i LEFT JOIN stock s ON s.item_id = i.id "
        "LEFT JOIN address_book ab ON ab.an8 = i.supplier_an8 "
        "WHERE i.active = 1 AND i.item_type <> 'SERVICE' AND i.min_stock > 0 "
        "GROUP BY i.id HAVING qty_on_hand <= i.min_stock ORDER BY i.item_code")
