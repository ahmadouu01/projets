#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Serveur SunuERP : API REST + interface web, sans aucune dépendance externe.

    python3 run.py                 # démarre sur http://localhost:8090
    python3 run.py --port 9000     # autre port
    python3 run.py --demo          # (re)crée la base avec le jeu de démonstration
    python3 run.py --reset         # repart d'une base vide
"""
import argparse
import json
import mimetypes
import os
import sys
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from erp import api, auth, db  # noqa: E402
from erp.db import ErpError  # noqa: E402

WEB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")
MAX_BODY = 4 * 1024 * 1024


class ErpHandler(BaseHTTPRequestHandler):
    server_version = "SunuERP/1.0"
    protocol_version = "HTTP/1.1"

    # ------------------------------------------------------------- utilitaires
    def log_message(self, fmt, *args):
        if os.environ.get("SUNUERP_QUIET") == "1":
            return
        sys.stderr.write("%s  %s\n" % (self.log_date_time_string(), fmt % args))

    def _send(self, status, payload, content_type="application/json; charset=utf-8",
              extra_headers=None):
        if isinstance(payload, (dict, list)):
            payload = json.dumps(payload, ensure_ascii=False, default=str).encode("utf-8")
        elif isinstance(payload, str):
            payload = payload.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        for key, value in (extra_headers or {}).items():
            self.send_header(key, value)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(payload)

    def _token(self):
        header = self.headers.get("Authorization", "")
        if header.startswith("Bearer "):
            return header[7:].strip()
        cookie = self.headers.get("Cookie", "")
        for part in cookie.split(";"):
            name, _, value = part.strip().partition("=")
            if name == "sunuerp_token":
                return unquote(value)
        return None

    def _body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return {}
        if length > MAX_BODY:
            raise ErpError("Requête trop volumineuse.", 413)
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except ValueError:
            raise ErpError("Corps de requête JSON invalide.")

    # ------------------------------------------------------------- routage
    def do_GET(self):
        self._handle("GET")

    def do_POST(self):
        self._handle("POST")

    def do_HEAD(self):
        self._handle("GET")

    def _handle(self, method):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)
        try:
            if path.startswith("/api/"):
                self._handle_api(method, path, parsed.query)
            elif method == "GET":
                self._serve_static(path)
            else:
                self._send(404, {"error": "Ressource inconnue."})
        except ErpError as exc:
            self._send(exc.status, {"error": exc.message})
        except BrokenPipeError:
            pass
        except Exception as exc:  # pragma: no cover - filet de sécurité
            traceback.print_exc()
            self._send(500, {"error": "Erreur interne : %s" % exc})
        finally:
            db.close_connection()

    def _handle_api(self, method, path, raw_query):
        query = {k: v[0] for k, v in parse_qs(raw_query).items()}
        body = self._body() if method == "POST" else {}
        token = self._token()
        user = auth.user_from_token(token)

        public = path in ("/api/auth/login", "/api/auth/logout")
        if not user and not public:
            raise ErpError("Authentification requise.", 401)

        result = api.dispatch(method, path, query, body, user)
        headers = {}
        if path == "/api/auth/login" and isinstance(result, dict) and result.get("token"):
            headers["Set-Cookie"] = (
                "sunuerp_token=%s; Path=/; HttpOnly; SameSite=Strict" % result["token"])
        self._send(200, result, extra_headers=headers)

    def _serve_static(self, path):
        if path in ("/", ""):
            path = "/index.html"
        target = os.path.normpath(os.path.join(WEB_DIR, path.lstrip("/")))
        if not target.startswith(WEB_DIR) or not os.path.isfile(target):
            target = os.path.join(WEB_DIR, "index.html")
            if not os.path.isfile(target):
                self._send(404, {"error": "Interface introuvable."})
                return
        content_type = mimetypes.guess_type(target)[0] or "application/octet-stream"
        if content_type.startswith("text/") or content_type in (
                "application/javascript", "application/json", "image/svg+xml"):
            content_type += "; charset=utf-8"
        with open(target, "rb") as fh:
            data = fh.read()
        self._send(200, data, content_type, {"Cache-Control": "no-cache"})


def bootstrap(with_demo=False, reset=False):
    """Prépare la base : schéma, paramétrage minimal, jeu de démonstration."""
    from erp import seed
    created = db.init_db(force=reset)
    auth.seed_roles()
    if created or reset or with_demo:
        if with_demo or created or reset:
            seed.build(with_demo=with_demo or created or reset)
    return created


def main():
    parser = argparse.ArgumentParser(description="Serveur SunuERP")
    parser.add_argument("--port", type=int, default=int(os.environ.get("SUNUERP_PORT", 8090)))
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--demo", action="store_true",
                        help="charge le jeu de données de démonstration")
    parser.add_argument("--reset", action="store_true",
                        help="supprime la base existante avant de la recréer")
    parser.add_argument("--no-serve", action="store_true",
                        help="prépare la base puis s'arrête")
    args = parser.parse_args()

    bootstrap(with_demo=args.demo, reset=args.reset)
    if args.no_serve:
        print("Base prête : %s" % db.DB_PATH)
        return

    server = ThreadingHTTPServer((args.host, args.port), ErpHandler)
    company = db.query_one("SELECT name FROM companies WHERE code = ?", (db.default_company(),))
    print("=" * 68)
    print(" SunuERP — %s" % (company["name"] if company else "société non paramétrée"))
    print(" Interface  : http://localhost:%d" % args.port)
    print(" Base       : %s" % db.DB_PATH)
    print(" Comptes de démonstration : admin/admin123, compta/compta123,")
    print("                            commercial/commercial123, magasin/magasin123")
    print(" Arrêt : Ctrl+C")
    print("=" * 68)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nArrêt du serveur.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
