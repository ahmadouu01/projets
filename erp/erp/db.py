# -*- coding: utf-8 -*-
"""Accès à la base de données SunuERP (SQLite, bibliothèque standard uniquement)."""
import os
import sqlite3
import threading
from contextlib import contextmanager
from datetime import date, datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.environ.get("SUNUERP_DB", os.path.join(DATA_DIR, "sunuerp.db"))
SCHEMA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "schema.sql")

_local = threading.local()


class ErpError(Exception):
    """Erreur métier : renvoyée telle quelle à l'utilisateur (HTTP 400)."""

    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


def get_connection():
    """Une connexion par thread ; le serveur HTTP est multi-thread."""
    conn = getattr(_local, "conn", None)
    if conn is None:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        conn = sqlite3.connect(DB_PATH, timeout=30, isolation_level=None)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA busy_timeout = 10000")
        _local.conn = conn
    return conn


def close_connection():
    conn = getattr(_local, "conn", None)
    if conn is not None:
        conn.close()
        _local.conn = None


@contextmanager
def transaction():
    """Transaction explicite : tout le document est écrit ou rien ne l'est."""
    conn = get_connection()
    depth = getattr(_local, "depth", 0)
    if depth == 0:
        conn.execute("BEGIN IMMEDIATE")
    _local.depth = depth + 1
    try:
        yield conn
    except Exception:
        _local.depth = depth
        if depth == 0:
            conn.execute("ROLLBACK")
        raise
    else:
        _local.depth = depth
        if depth == 0:
            conn.execute("COMMIT")


# --------------------------------------------------------------------- requêtes
def query(sql, params=()):
    """Liste de dictionnaires."""
    cur = get_connection().execute(sql, params)
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    return rows


def query_one(sql, params=()):
    cur = get_connection().execute(sql, params)
    row = cur.fetchone()
    cur.close()
    return dict(row) if row else None


def scalar(sql, params=(), default=None):
    row = query_one(sql, params)
    if not row:
        return default
    value = list(row.values())[0]
    return default if value is None else value


def execute(sql, params=()):
    cur = get_connection().execute(sql, params)
    last_id = cur.lastrowid
    cur.close()
    return last_id


def insert(table, data):
    cols = list(data.keys())
    sql = "INSERT INTO %s (%s) VALUES (%s)" % (
        table, ", ".join(cols), ", ".join("?" for _ in cols))
    return execute(sql, tuple(data[c] for c in cols))


def update(table, data, where, params=()):
    sets = ", ".join("%s = ?" % c for c in data)
    sql = "UPDATE %s SET %s WHERE %s" % (table, sets, where)
    execute(sql, tuple(data.values()) + tuple(params))


# --------------------------------------------------------------------- utilitaires
def money(value, decimals=0):
    """Le franc CFA n'a pas de subdivision : on arrondit à l'unité."""
    return round(float(value or 0), decimals)


def today():
    return date.today().isoformat()


def now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def next_number(doc_type, doc_date=None):
    """Numérotation automatique des documents (table next_numbers)."""
    row = query_one("SELECT * FROM next_numbers WHERE doc_type = ?", (doc_type,))
    if not row:
        insert("next_numbers", {"doc_type": doc_type, "prefix": doc_type,
                                "next_value": 1, "padding": 5, "use_year": 1})
        row = query_one("SELECT * FROM next_numbers WHERE doc_type = ?", (doc_type,))
    value = int(row["next_value"])
    execute("UPDATE next_numbers SET next_value = next_value + 1 WHERE doc_type = ?", (doc_type,))
    year = (doc_date or today())[:4]
    parts = [row["prefix"]]
    if row["use_year"]:
        parts.append(year)
    parts.append(str(value).zfill(int(row["padding"])))
    return "-".join(parts)


def audit(username, module, action, entity=None, entity_id=None, details=None):
    insert("audit_log", {
        "username": username, "module": module, "action": action,
        "entity": entity, "entity_id": str(entity_id) if entity_id is not None else None,
        "details": details,
    })


def get_setting(key, default=None):
    value = scalar("SELECT value FROM settings WHERE key = ?", (key,))
    return default if value is None else value


def set_setting(key, value):
    execute("INSERT INTO settings (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value", (key, str(value)))


def default_company():
    return get_setting("company", "SP")


def udc_list(system, code_type):
    return query(
        "SELECT code, description, handling FROM udc "
        "WHERE system = ? AND code_type = ? AND active = 1 ORDER BY code",
        (system, code_type))


# --------------------------------------------------------------------- exercices
def period_of(doc_date, company=None):
    """Retourne (exercice, période) et vérifie que la période est ouverte."""
    company = company or default_company()
    row = query_one(
        "SELECT fy, period, status FROM fiscal_periods "
        "WHERE company = ? AND date_from <= ? AND date_to >= ?",
        (company, doc_date, doc_date))
    if not row:
        # exercice civil par défaut si le calendrier n'a pas été généré
        year = int(doc_date[:4])
        return year, int(doc_date[5:7])
    return int(row["fy"]), int(row["period"])


def assert_period_open(doc_date, company=None):
    company = company or default_company()
    row = query_one(
        "SELECT status FROM fiscal_periods "
        "WHERE company = ? AND date_from <= ? AND date_to >= ?",
        (company, doc_date, doc_date))
    if row and row["status"] != "OPEN":
        raise ErpError("La période comptable du %s est clôturée." % doc_date)


# --------------------------------------------------------------------- création
def init_db(force=False):
    """Crée le schéma s'il n'existe pas. Retourne True si la base était vide."""
    if force and os.path.exists(DB_PATH):
        close_connection()
        os.remove(DB_PATH)
        for suffix in ("-wal", "-shm"):
            extra = DB_PATH + suffix
            if os.path.exists(extra):
                os.remove(extra)
    conn = get_connection()
    existed = conn.execute(
        "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='companies'"
    ).fetchone()[0]
    with open(SCHEMA_PATH, encoding="utf-8") as fh:
        conn.executescript(fh.read())
    return not existed
