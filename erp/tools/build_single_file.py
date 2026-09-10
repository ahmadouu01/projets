# -*- coding: utf-8 -*-
"""Assemble SunuERP en un fichier HTML autonome (démonstration hors ligne)."""
import base64, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
data = open("/tmp/erp_demo_data.json", encoding="utf-8").read()
css = (WEB / "css/app.css").read_text(encoding="utf-8")
favicon_uri = "data:image/svg+xml;base64," + base64.b64encode(
    (WEB / "favicon.svg").read_bytes()).decode()

SHIM = r"""
/* =====================================================================
   Version un-fichier : l'API réseau est remplacée par les réponses
   pré-calculées du jeu de démonstration (consultation seule).
   ===================================================================== */
(function () {
  const DATA = window.__SUNUERP_DEMO__;
  const PASSWORDS = { admin: 'admin123', compta: 'compta123', commercial: 'commercial123',
                      magasin: 'magasin123', rh: 'rh123' };
  const IGNORED = ['limit', 'offset', 'search'];

  function canonical(path, params) {
    const clean = {};
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '' || IGNORED.includes(k)) return;
      clean[k] = String(v);
    });
    const keys = Object.keys(clean).sort();
    return keys.length ? path + '?' + keys.map((k) => `${k}=${clean[k]}`).join('&') : path;
  }

  function lookup(path, params) {
    const attempts = [canonical(path, params)];
    const entries = Object.entries(params || {}).filter(([k, v]) =>
      v !== undefined && v !== null && v !== '' && !IGNORED.includes(k));
    // on retire les filtres un à un jusqu'à retrouver une réponse pré-calculée
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      const subset = Object.fromEntries(entries.slice(0, i));
      attempts.push(canonical(path, subset));
    }
    attempts.push(path);
    for (const attempt of attempts) {
      if (Object.prototype.hasOwnProperty.call(DATA.responses, attempt)) {
        return JSON.parse(JSON.stringify(DATA.responses[attempt]));
      }
    }
    return null;
  }

  function normalise(text) {
    return String(text === null || text === undefined ? '' : text)
      .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  function applySearch(result, term) {
    if (!term || !Array.isArray(result)) return result;
    const needle = normalise(term);
    return result.filter((row) => Object.values(row).some((value) =>
      value !== null && typeof value !== 'object' && normalise(value).includes(needle)));
  }

  const OFFLINE_MESSAGE =
    "Version de démonstration en un seul fichier : la consultation est complète, " +
    "mais les saisies ne sont pas enregistrées. Lancez « python3 run.py » pour la version complète.";

  SunuERP.api.request = async function request(method, path, options = {}) {
    const { params, body } = options;

    if (path === '/api/auth/login') {
      const username = (body && body.username || '').trim();
      const password = (body && body.password) || '';
      if (!DATA.accounts[username] || PASSWORDS[username] !== password) {
        throw new Error('Identifiant ou mot de passe incorrect.');
      }
      localStorage.setItem('sunuerp_demo_user', username);
      return { token: 'demo-' + username, user: DATA.accounts[username].user };
    }
    if (path === '/api/auth/logout') {
      localStorage.removeItem('sunuerp_demo_user');
      return { ok: true };
    }
    if (path === '/api/auth/me') {
      const username = (SunuERP.state.token || '').replace(/^demo-/, '') ||
                       localStorage.getItem('sunuerp_demo_user');
      if (!DATA.accounts[username]) throw new Error('Session expirée.');
      return JSON.parse(JSON.stringify(DATA.accounts[username]));
    }
    if (method !== 'GET') throw new Error(OFFLINE_MESSAGE);

    const result = lookup(path, params);
    if (result === null) {
      throw new Error("Cet écran n'est pas disponible dans la version un-fichier : " + path);
    }
    return applySearch(result, params && params.search);
  };

  // bandeau permanent rappelant le mode démonstration
  document.addEventListener('DOMContentLoaded', () => {
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:150;background:#17202b;' +
      'color:#fff;padding:9px 14px;border-radius:8px;font-size:.75rem;max-width:320px;' +
      'box-shadow:0 6px 24px rgba(20,30,45,.25);line-height:1.4;cursor:pointer;opacity:.94';
    banner.title = 'Cliquer pour masquer';
    banner.innerHTML = '<strong>Démonstration hors ligne</strong> — navigation complète, ' +
      'saisies désactivées.<br>Version complète : <code>python3 run.py</code>';
    banner.addEventListener('click', () => banner.remove());
    setTimeout(() => document.body.appendChild(banner), 800);
  });
})();
"""

parts = ["""<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SunuERP — démonstration hors ligne</title>
  <meta name="description" content="SunuERP : comptabilité, ventes, achats, stocks, production et paie. Démonstration complète en un seul fichier." />
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;utf8,%s" />
  <style>
%s
  </style>
</head>
<body>
  <div id="root"><div class="loading">Chargement de SunuERP…</div></div>
""" % (favicon_uri, css)]

parts.append('  <script id="demo-data" type="application/json">%s</script>\n' % data)
parts.append('  <script>window.__SUNUERP_DEMO__ = '
             'JSON.parse(document.getElementById("demo-data").textContent);</script>\n')

for name in ["core.js"]:
    parts.append("  <script>\n%s\n  </script>\n" % (WEB / "js" / name).read_text(encoding="utf-8"))
parts.append("  <script>\n%s\n  </script>\n" % SHIM)
for name in ["screens-common.js", "app.js", "screens-sales.js", "screens-purchasing.js",
             "screens-inventory.js", "screens-gl.js", "screens-hr.js", "screens-admin.js"]:
    source = (WEB / "js" / name).read_text(encoding="utf-8")
    source = source.replace("src: 'favicon.svg'", "src: FAVICON_URI")
    source = source.replace("h('img', { src: 'favicon.svg', alt: '' })",
                            "h('img', { src: window.FAVICON_URI, alt: '' })")
    parts.append("  <script>\n%s\n  </script>\n" % source)
parts.append("</body>\n</html>\n")

html = "".join(parts)
# le logo est référencé par app.js : on l'expose en data-URI
html = html.replace("<script>\n/* ====",
                    '<script>\nwindow.FAVICON_URI = "%s";\n/* ====' % favicon_uri, 1)
html = html.replace("src: 'favicon.svg'", "src: window.FAVICON_URI")

out = ROOT / "sunuerp-demo.html"
out.write_text(html, encoding="utf-8")
print("écrit :", out, "—", round(len(html.encode()) / 1024), "Ko")
