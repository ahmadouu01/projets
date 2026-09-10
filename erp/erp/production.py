# -*- coding: utf-8 -*-
"""Production : nomenclatures et ordres de fabrication."""
from . import accounting, db, inventory
from .db import ErpError, money


# --------------------------------------------------------------------- nomenclatures
def list_boms(search=None):
    sql = ("SELECT b.*, i.item_code, i.description, "
           "       (SELECT count(*) FROM bom_lines l WHERE l.bom_id = b.id) AS components "
           "FROM boms b JOIN items i ON i.id = b.item_id WHERE 1 = 1")
    params = []
    if search:
        like = "%%%s%%" % search
        sql += " AND (i.item_code LIKE ? OR i.description LIKE ?)"
        params += [like, like]
    return db.query(sql + " ORDER BY i.item_code, b.version", tuple(params))


def get_bom(bom_id):
    bom = db.query_one(
        "SELECT b.*, i.item_code, i.description FROM boms b JOIN items i ON i.id = b.item_id "
        "WHERE b.id = ?", (bom_id,))
    if not bom:
        raise ErpError("Nomenclature introuvable (%s)." % bom_id)
    bom["lines"] = db.query(
        "SELECT l.*, i.item_code, i.description, i.uom, i.average_cost "
        "FROM bom_lines l JOIN items i ON i.id = l.component_id "
        "WHERE l.bom_id = ? ORDER BY l.line_no", (bom_id,))
    bom["unit_cost"] = money(sum(
        l["quantity"] * (1 + (l["scrap_pct"] or 0) / 100.0) * l["average_cost"]
        for l in bom["lines"]) / (bom["quantity"] or 1))
    return bom


def save_bom(data, user):
    item = inventory.get_item(int(data["item_id"]))
    version = data.get("version", "01")
    lines = data.get("lines") or []
    if not lines:
        raise ErpError("Une nomenclature doit comporter au moins un composant.")

    with db.transaction():
        bom = db.query_one("SELECT * FROM boms WHERE item_id = ? AND version = ?",
                           (item["id"], version))
        if bom:
            bom_id = bom["id"]
            db.update("boms", {"quantity": money(data.get("quantity", 1), 3),
                               "active": 1 if data.get("active", 1) else 0},
                      "id = ?", (bom_id,))
            db.execute("DELETE FROM bom_lines WHERE bom_id = ?", (bom_id,))
        else:
            bom_id = db.insert("boms", {
                "item_id": item["id"], "version": version,
                "quantity": money(data.get("quantity", 1), 3),
                "active": 1 if data.get("active", 1) else 0})

        for i, line in enumerate(lines, start=1):
            component = inventory.get_item(int(line["component_id"]))
            if component["id"] == item["id"]:
                raise ErpError("Un article ne peut pas être son propre composant.")
            db.insert("bom_lines", {
                "bom_id": bom_id, "line_no": i, "component_id": component["id"],
                "quantity": money(line["quantity"], 3),
                "scrap_pct": float(line.get("scrap_pct", 0) or 0)})
        db.audit(user["username"], "MF", "SAVE_BOM", "boms", bom_id)
    return get_bom(bom_id)


# --------------------------------------------------------------------- ordres de fabrication
def list_work_orders(status=None, search=None, limit=200):
    sql = ("SELECT w.*, i.item_code, i.description FROM work_orders w "
           "JOIN items i ON i.id = w.item_id WHERE 1 = 1")
    params = []
    if status:
        sql += " AND w.status = ?"
        params.append(status)
    if search:
        like = "%%%s%%" % search
        sql += " AND (w.wo_no LIKE ? OR i.item_code LIKE ? OR i.description LIKE ?)"
        params += [like, like, like]
    sql += " ORDER BY w.id DESC LIMIT ?"
    params.append(limit)
    return db.query(sql, tuple(params))


def get_work_order(wo_id):
    wo = db.query_one(
        "SELECT w.*, i.item_code, i.description, i.uom FROM work_orders w "
        "JOIN items i ON i.id = w.item_id WHERE w.id = ?", (wo_id,))
    if not wo:
        raise ErpError("Ordre de fabrication introuvable (%s)." % wo_id)
    wo["components"] = db.query(
        "SELECT c.*, i.item_code, i.description, i.uom, i.average_cost, "
        "       COALESCE((SELECT SUM(s.qty_on_hand) FROM stock s WHERE s.item_id = i.id), 0) "
        "         AS qty_on_hand "
        "FROM wo_components c JOIN items i ON i.id = c.component_id "
        "WHERE c.wo_id = ? ORDER BY c.id", (wo_id,))
    return wo


def create_work_order(data, user):
    """Crée un OF et explose la nomenclature en besoins composants."""
    item = inventory.get_item(int(data["item_id"]))
    qty = money(data["qty_planned"], 3)
    if qty <= 0:
        raise ErpError("La quantité à fabriquer doit être positive.")
    warehouse = data.get("warehouse") or db.get_setting("default_warehouse", "DIAM")

    bom = db.query_one("SELECT * FROM boms WHERE item_id = ? AND active = 1 "
                       "ORDER BY version LIMIT 1", (item["id"],))
    if not bom:
        raise ErpError("Aucune nomenclature active pour %s : créez-la avant de lancer un OF."
                       % item["item_code"])
    bom = get_bom(bom["id"])
    ratio = qty / (bom["quantity"] or 1)

    with db.transaction():
        wo_id = db.insert("work_orders", {
            "wo_no": db.next_number("WO", data.get("start_date") or db.today()),
            "item_id": item["id"], "bom_id": bom["id"], "warehouse": warehouse,
            "business_unit": data.get("business_unit"), "qty_planned": qty,
            "start_date": data.get("start_date") or db.today(),
            "due_date": data.get("due_date"), "status": "PLANNED",
            "created_by": user["username"],
        })
        for line in bom["lines"]:
            required = money(line["quantity"] * ratio * (1 + (line["scrap_pct"] or 0) / 100.0), 3)
            db.insert("wo_components", {
                "wo_id": wo_id, "component_id": line["component_id"],
                "qty_required": required, "unit_cost": line["average_cost"]})
        db.audit(user["username"], "MF", "CREATE_WO", "work_orders", wo_id)
    return get_work_order(wo_id)


def release_work_order(wo_id, user):
    wo = get_work_order(wo_id)
    if wo["status"] != "PLANNED":
        raise ErpError("Seul un OF planifié peut être lancé.")
    manquants = [c for c in wo["components"]
                 if money(c["qty_on_hand"], 3) < money(c["qty_required"], 3)]
    db.update("work_orders", {"status": "RELEASED"}, "id = ?", (wo_id,))
    db.audit(user["username"], "MF", "RELEASE_WO", "work_orders", wo_id, wo["wo_no"])
    result = get_work_order(wo_id)
    result["warnings"] = ["Stock insuffisant pour %s (besoin %s, disponible %s)"
                          % (c["item_code"], c["qty_required"], c["qty_on_hand"])
                          for c in manquants]
    return result


def issue_components(wo_id, user, issue_date=None, lines=None):
    """Sortie des composants vers l'en-cours de production."""
    wo = get_work_order(wo_id)
    if wo["status"] != "RELEASED":
        raise ErpError("L'OF doit être lancé pour consommer des composants.")
    issue_date = issue_date or db.today()
    db.assert_period_open(issue_date)
    requested = {int(l["component_id"]): money(l["quantity"], 3) for l in lines} if lines else None

    with db.transaction():
        total_value = 0.0
        by_account = {}
        for component in wo["components"]:
            remaining = money(component["qty_required"] - component["qty_issued"], 3)
            qty = requested.get(component["component_id"], remaining) if requested else remaining
            if qty <= 0:
                continue
            item = inventory.get_item(component["component_id"])
            value = inventory.record_movement(
                item["id"], wo["warehouse"], "OUT", qty, doc_type="WO",
                doc_number=wo["wo_no"], user=user,
                reason="Consommation OF %s" % wo["wo_no"], move_date=issue_date)
            db.update("wo_components",
                      {"qty_issued": money(component["qty_issued"] + qty, 3),
                       "unit_cost": money(value / qty if qty else 0, 2)},
                      "id = ?", (component["id"],))
            account = inventory.inventory_account(item)
            by_account[account] = money(by_account.get(account, 0) + value)
            total_value += value

        if total_value <= 0:
            raise ErpError("Aucun composant à consommer sur cet OF.")

        wip = accounting.map_account("WIP")
        gl_lines = [{"account": wip, "debit": money(total_value),
                     "description": "En-cours OF %s" % wo["wo_no"],
                     "sub_type": "WO", "sub_id": wo["wo_no"]}]
        for account, amount in by_account.items():
            gl_lines.append({"account": account, "credit": amount,
                             "description": "Consommation OF %s" % wo["wo_no"]})
        accounting.create_batch("S", "Consommation OF %s" % wo["wo_no"], issue_date,
                                gl_lines, user, source="MF", source_id=wo_id, auto_post=True)
        db.update("work_orders", {"wip_value": money(wo["wip_value"] + total_value)},
                  "id = ?", (wo_id,))
        db.audit(user["username"], "MF", "ISSUE", "work_orders", wo_id, wo["wo_no"])
    return get_work_order(wo_id)


def complete_work_order(wo_id, user, qty_produced=None, complete_date=None):
    """Déclaration de production : entrée du produit fini valorisé par l'en-cours."""
    wo = get_work_order(wo_id)
    if wo["status"] != "RELEASED":
        raise ErpError("Seul un OF lancé peut être déclaré terminé.")
    qty = money(qty_produced if qty_produced is not None else wo["qty_planned"], 3)
    if qty <= 0:
        raise ErpError("La quantité produite doit être positive.")
    complete_date = complete_date or db.today()
    db.assert_period_open(complete_date)
    if money(wo["wip_value"]) <= 0:
        raise ErpError("Aucun composant n'a été consommé : l'en-cours est vide.")

    with db.transaction():
        ratio = qty / (wo["qty_planned"] or qty)
        value = money(wo["wip_value"] * min(ratio, 1))
        unit_cost = money(value / qty, 2)
        item = inventory.get_item(wo["item_id"])
        inventory.record_movement(item["id"], wo["warehouse"], "IN", qty, unit_cost=unit_cost,
                                  doc_type="WO", doc_number=wo["wo_no"], user=user,
                                  reason="Production OF %s" % wo["wo_no"],
                                  move_date=complete_date)
        gl_lines = [
            {"account": inventory.inventory_account(item), "debit": value,
             "description": "Entrée production %s" % wo["wo_no"],
             "sub_type": "IT", "sub_id": item["item_code"]},
            {"account": accounting.map_account("WIP"), "credit": value,
             "description": "Solde en-cours OF %s" % wo["wo_no"],
             "sub_type": "WO", "sub_id": wo["wo_no"]},
        ]
        batch_id = accounting.create_batch(
            "S", "Production OF %s" % wo["wo_no"], complete_date, gl_lines, user,
            source="MF", source_id=wo_id, auto_post=True)
        db.update("work_orders", {
            "qty_produced": money(wo["qty_produced"] + qty, 3),
            "wip_value": money(wo["wip_value"] - value),
            "status": "COMPLETED", "gl_batch_id": batch_id}, "id = ?", (wo_id,))
        db.audit(user["username"], "MF", "COMPLETE_WO", "work_orders", wo_id,
                 "%s %s" % (qty, item["item_code"]))
    return get_work_order(wo_id)


def material_requirements():
    """Besoins nets en composants pour les OF lancés (calcul simplifié type CBN)."""
    return db.query(
        "SELECT i.item_code, i.description, i.uom, "
        "       SUM(c.qty_required - c.qty_issued) AS required, "
        "       COALESCE((SELECT SUM(s.qty_on_hand) FROM stock s WHERE s.item_id = i.id), 0) "
        "         AS available "
        "FROM wo_components c JOIN work_orders w ON w.id = c.wo_id "
        "JOIN items i ON i.id = c.component_id "
        "WHERE w.status = 'RELEASED' AND c.qty_required > c.qty_issued "
        "GROUP BY i.id ORDER BY i.item_code")
