# -*- coding: utf-8 -*-
"""Authentification, sessions et habilitations SunuERP."""
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta

from . import db
from .db import ErpError

SESSION_HOURS = 12

# Modules de l'ERP (code → libellé), utilisés par les habilitations
MODULES = {
    "GL": "Comptabilité générale",
    "AR": "Ventes et clients",
    "AP": "Achats et fournisseurs",
    "IN": "Stocks et articles",
    "MF": "Production",
    "HR": "Ressources humaines",
    "AB": "Répertoire d'adresses",
    "RP": "États et analyses",
    "ADM": "Administration",
}

# Profils livrés en standard : lecture / écriture / comptabilisation
DEFAULT_ROLES = {
    "ADMIN":      {m: (1, 1, 1) for m in MODULES},
    "COMPTABLE":  {"GL": (1, 1, 1), "AR": (1, 1, 1), "AP": (1, 1, 1), "IN": (1, 0, 0),
                   "MF": (1, 0, 0), "HR": (1, 0, 0), "AB": (1, 1, 0), "RP": (1, 0, 0),
                   "ADM": (1, 0, 0)},
    "COMMERCIAL": {"GL": (0, 0, 0), "AR": (1, 1, 0), "AP": (0, 0, 0), "IN": (1, 0, 0),
                   "MF": (0, 0, 0), "HR": (0, 0, 0), "AB": (1, 1, 0), "RP": (1, 0, 0),
                   "ADM": (0, 0, 0)},
    "ACHETEUR":   {"GL": (0, 0, 0), "AR": (0, 0, 0), "AP": (1, 1, 0), "IN": (1, 1, 0),
                   "MF": (1, 0, 0), "HR": (0, 0, 0), "AB": (1, 1, 0), "RP": (1, 0, 0),
                   "ADM": (0, 0, 0)},
    "MAGASINIER": {"GL": (0, 0, 0), "AR": (1, 0, 0), "AP": (1, 0, 0), "IN": (1, 1, 0),
                   "MF": (1, 1, 0), "HR": (0, 0, 0), "AB": (1, 0, 0), "RP": (1, 0, 0),
                   "ADM": (0, 0, 0)},
    "RH":         {"GL": (1, 0, 0), "AR": (0, 0, 0), "AP": (0, 0, 0), "IN": (0, 0, 0),
                   "MF": (0, 0, 0), "HR": (1, 1, 1), "AB": (1, 1, 0), "RP": (1, 0, 0),
                   "ADM": (0, 0, 0)},
    "READONLY":   {m: (1, 0, 0) for m in MODULES},
}


# --------------------------------------------------------------------- mots de passe
def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"),
                                 salt.encode("utf-8"), 120000)
    return digest.hex(), salt


def verify_password(password, stored_hash, salt):
    candidate, _ = hash_password(password, salt)
    return hmac.compare_digest(candidate, stored_hash)


# --------------------------------------------------------------------- utilisateurs
def create_user(username, password, full_name, role="READONLY", email=None,
                business_unit=None):
    if db.query_one("SELECT id FROM users WHERE username = ?", (username,)):
        raise ErpError("L'identifiant « %s » existe déjà." % username)
    if role not in DEFAULT_ROLES and not db.query_one(
            "SELECT role FROM role_permissions WHERE role = ?", (role,)):
        raise ErpError("Profil inconnu : %s" % role)
    pwd_hash, salt = hash_password(password)
    return db.insert("users", {
        "username": username, "password_hash": pwd_hash, "salt": salt,
        "full_name": full_name, "email": email, "role": role,
        "business_unit": business_unit, "active": 1,
    })


def set_password(user_id, password):
    pwd_hash, salt = hash_password(password)
    db.update("users", {"password_hash": pwd_hash, "salt": salt}, "id = ?", (user_id,))


def seed_roles():
    for role, modules in DEFAULT_ROLES.items():
        for module, (read, write, post) in modules.items():
            db.execute(
                "INSERT INTO role_permissions (role, module, can_read, can_write, can_post) "
                "VALUES (?, ?, ?, ?, ?) ON CONFLICT(role, module) DO UPDATE SET "
                "can_read = excluded.can_read, can_write = excluded.can_write, "
                "can_post = excluded.can_post",
                (role, module, read, write, post))


# --------------------------------------------------------------------- sessions
def login(username, password, ip=None):
    user = db.query_one("SELECT * FROM users WHERE username = ?", (username,))
    if not user or not user["active"]:
        raise ErpError("Identifiant ou mot de passe incorrect.", 401)
    if not verify_password(password, user["password_hash"], user["salt"]):
        db.audit(username, "ADM", "LOGIN_FAILED", "users", user["id"], ip)
        raise ErpError("Identifiant ou mot de passe incorrect.", 401)

    token = secrets.token_urlsafe(32)
    expires = (datetime.now() + timedelta(hours=SESSION_HOURS)).strftime("%Y-%m-%d %H:%M:%S")
    db.insert("sessions", {"token": token, "user_id": user["id"], "expires_at": expires})
    db.update("users", {"last_login": db.now()}, "id = ?", (user["id"],))
    db.audit(username, "ADM", "LOGIN", "users", user["id"], ip)
    db.execute("DELETE FROM sessions WHERE expires_at < ?", (db.now(),))
    return {"token": token, "expires_at": expires, "user": public_user(user)}


def logout(token):
    session = db.query_one("SELECT * FROM sessions WHERE token = ?", (token,))
    if session:
        user = db.query_one("SELECT username FROM users WHERE id = ?", (session["user_id"],))
        db.execute("DELETE FROM sessions WHERE token = ?", (token,))
        if user:
            db.audit(user["username"], "ADM", "LOGOUT")


def user_from_token(token):
    if not token:
        return None
    row = db.query_one(
        "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id "
        "WHERE s.token = ? AND s.expires_at > ? AND u.active = 1",
        (token, db.now()))
    return row


def public_user(user):
    permissions = {}
    for row in db.query("SELECT * FROM role_permissions WHERE role = ?", (user["role"],)):
        permissions[row["module"]] = {
            "read": bool(row["can_read"]),
            "write": bool(row["can_write"]),
            "post": bool(row["can_post"]),
        }
    return {
        "id": user["id"], "username": user["username"], "full_name": user["full_name"],
        "role": user["role"], "email": user["email"],
        "business_unit": user["business_unit"], "permissions": permissions,
        "modules": MODULES,
    }


def check(user, module, level="read"):
    """Vérifie une habilitation ; lève une erreur 403 si elle manque."""
    if not user:
        raise ErpError("Session expirée, veuillez vous reconnecter.", 401)
    column = {"read": "can_read", "write": "can_write", "post": "can_post"}[level]
    allowed = db.scalar(
        "SELECT %s FROM role_permissions WHERE role = ? AND module = ?" % column,
        (user["role"], module), 0)
    if not allowed:
        raise ErpError(
            "Votre profil %s n'autorise pas cette opération sur le module %s."
            % (user["role"], MODULES.get(module, module)), 403)
    return True
