/* =====================================================================
   SunuERP — coquille applicative : connexion, menu, routage, accueil
   ===================================================================== */
'use strict';

(function () {
  const { h, api, fmt, state, toast, modal, Grid, charts, icon, ICONS } = SunuERP;
  const screens = SunuERP.screens = SunuERP.screens || {};

  /* --------------------------------------------------------------- menu */
  const MENU = [
    { id: 'home', label: 'Tableau de bord', icon: ICONS.dashboard, module: 'RP',
      items: [{ route: 'dashboard', label: "Vue d'ensemble" },
              { route: 'vat', label: 'Déclaration de TVA' }] },
    { id: 'ab', label: "Répertoire d'adresses", icon: ICONS.contacts, module: 'AB',
      items: [{ route: 'partners', label: 'Tous les tiers' },
              { route: 'partners-customers', label: 'Clients' },
              { route: 'partners-suppliers', label: 'Fournisseurs' }] },
    { id: 'ar', label: 'Ventes', icon: ICONS.sales, module: 'AR',
      items: [{ route: 'sales-orders', label: 'Commandes clients' },
              { route: 'sales-invoices', label: 'Factures clients' },
              { route: 'sales-receipts', label: 'Encaissements' },
              { route: 'sales-aging', label: 'Balance âgée clients' },
              { route: 'sales-analysis', label: 'Analyse des ventes' }] },
    { id: 'ap', label: 'Achats', icon: ICONS.purchase, module: 'AP',
      items: [{ route: 'purchase-orders', label: 'Commandes fournisseurs' },
              { route: 'purchase-invoices', label: 'Factures fournisseurs' },
              { route: 'purchase-payments', label: 'Règlements' },
              { route: 'purchase-aging', label: 'Balance âgée fournisseurs' }] },
    { id: 'in', label: 'Stocks', icon: ICONS.box, module: 'IN',
      items: [{ route: 'items', label: 'Articles' },
              { route: 'stock-valuation', label: 'Valorisation du stock' },
              { route: 'stock-movements', label: 'Mouvements de stock' },
              { route: 'stock-reorder', label: 'Réapprovisionnement' },
              { route: 'warehouses', label: 'Entrepôts' }] },
    { id: 'mf', label: 'Production', icon: ICONS.factory, module: 'MF',
      items: [{ route: 'boms', label: 'Nomenclatures' },
              { route: 'work-orders', label: 'Ordres de fabrication' },
              { route: 'mrp', label: 'Besoins en composants' }] },
    { id: 'hr', label: 'Ressources humaines', icon: ICONS.users, module: 'HR',
      items: [{ route: 'employees', label: 'Salariés' },
              { route: 'payroll', label: 'Campagnes de paie' },
              { route: 'leaves', label: 'Congés et absences' },
              { route: 'headcount', label: 'Effectifs' }] },
    { id: 'gl', label: 'Comptabilité', icon: ICONS.book, module: 'GL',
      items: [{ route: 'gl-batches', label: "Lots d'écritures" },
              { route: 'gl-entry', label: 'Saisie d\'écriture' },
              { route: 'gl-accounts', label: 'Plan comptable' },
              { route: 'gl-trial-balance', label: 'Balance générale' },
              { route: 'gl-ledger', label: 'Grand livre' },
              { route: 'gl-income', label: 'Compte de résultat' },
              { route: 'gl-balance-sheet', label: 'Bilan' },
              { route: 'gl-periods', label: 'Périodes comptables' },
              { route: 'gl-mapping', label: 'Comptes automatiques' },
              { route: 'gl-integrity', label: "États d'intégrité" }] },
    { id: 'adm', label: 'Administration', icon: ICONS.settings, module: 'ADM',
      items: [{ route: 'users', label: 'Utilisateurs et profils' },
              { route: 'udc', label: 'Codes utilisateur (UDC)' },
              { route: 'numbering', label: 'Numérotation des documents' },
              { route: 'organisation', label: 'Sociétés et centres' },
              { route: 'settings', label: 'Paramètres' },
              { route: 'audit', label: "Journal d'audit" }] },
  ];

  const ROUTE_LABELS = {};
  MENU.forEach((group) => group.items.forEach((item) => {
    ROUTE_LABELS[item.route] = { label: item.label, group: group.label, module: group.module };
  }));
  SunuERP.ROUTE_LABELS = ROUTE_LABELS;

  function canRead(module) {
    const permissions = state.user && state.user.permissions;
    return !module || !permissions || (permissions[module] && permissions[module].read);
  }
  SunuERP.can = function can(module, level = 'read') {
    const permissions = state.user && state.user.permissions;
    return !!(permissions && permissions[module] && permissions[module][level]);
  };

  /* --------------------------------------------------------------- connexion */
  function renderLogin(message) {
    const root = document.getElementById('root');
    root.innerHTML = '';
    const username = h('input', { name: 'username', autocomplete: 'username', required: true,
                                  placeholder: 'admin' });
    const password = h('input', { name: 'password', type: 'password', required: true,
                                  autocomplete: 'current-password', placeholder: '••••••••' });
    const error = h('div', { class: 'alert alert-danger', hidden: !message },
                    [h('span', { class: 'dot' }), h('span', { text: message || '' })]);

    const submit = async (event) => {
      event.preventDefault();
      error.hidden = true;
      try {
        const result = await api.post('/api/auth/login',
          { username: username.value.trim(), password: password.value });
        state.token = result.token;
        localStorage.setItem('sunuerp_token', result.token);
        await boot();
      } catch (err) {
        error.hidden = false;
        error.lastChild.textContent = err.message;
        password.value = '';
        password.focus();
      }
    };

    root.appendChild(h('div', { class: 'login' }, h('form', { class: 'login-card', onSubmit: submit }, [
      h('div', { class: 'login-brand' }, [
        h('img', { src: 'favicon.svg', alt: '', class: 'mark' }),
        h('h1', { text: 'SunuERP' }),
      ]),
      h('p', { class: 'sub', text: 'Progiciel de gestion intégré — connexion' }),
      error,
      SunuERP.field('Identifiant', username),
      h('div', { style: 'height:12px' }),
      SunuERP.field('Mot de passe', password),
      h('div', { style: 'height:18px' }),
      h('button', { class: 'btn btn-primary', style: 'width:100%;justify-content:center',
                    type: 'submit' }, 'Se connecter'),
      h('div', { class: 'login-hint', html:
        'Comptes de démonstration : <code>admin / admin123</code>, <code>compta / compta123</code>, ' +
        '<code>commercial / commercial123</code>, <code>magasin / magasin123</code>, ' +
        '<code>rh / rh123</code>.' }),
    ])));
    username.focus();
  }

  /* --------------------------------------------------------------- coquille */
  function renderShell() {
    const root = document.getElementById('root');
    root.innerHTML = '';

    const fastInput = h('input', { type: 'search', placeholder: 'Accès rapide (nom d\'écran)…',
                                   'aria-label': 'Accès rapide' });
    const fastResults = h('div', { class: 'fastpath-results', hidden: true });
    fastInput.addEventListener('input', () => {
      const term = fastInput.value.trim().toLowerCase();
      fastResults.innerHTML = '';
      if (term.length < 2) { fastResults.hidden = true; return; }
      const matches = Object.entries(ROUTE_LABELS)
        .filter(([route, meta]) => canRead(meta.module) &&
          (meta.label.toLowerCase().includes(term) || route.includes(term) ||
           meta.group.toLowerCase().includes(term)))
        .slice(0, 8);
      if (!matches.length) { fastResults.hidden = true; return; }
      matches.forEach(([route, meta]) => fastResults.appendChild(h('button', {
        onClick: () => { fastInput.value = ''; fastResults.hidden = true; location.hash = '#/' + route; },
      }, `${meta.group} › ${meta.label}`)));
      fastResults.hidden = false;
    });
    fastInput.addEventListener('blur', () => setTimeout(() => { fastResults.hidden = true; }, 200));

    const initials = (state.user.full_name || state.user.username)
      .split(/[\s—-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

    const topbar = h('header', { class: 'topbar' }, [
      h('button', { class: 'link', style: 'font-size:1.2rem', title: 'Menu',
                    onClick: () => document.querySelector('.sidebar').classList.toggle('is-open') },
        '☰'),
      h('div', { class: 'brand' }, [h('img', { src: 'favicon.svg', alt: '' }), 'SunuERP']),
      h('div', { class: 'company', text: state.company ? state.company.name : '' }),
      h('div', { class: 'fastpath' }, [icon(ICONS.search), fastInput, fastResults]),
      h('div', { class: 'topbar-user' }, [
        h('div', { class: 'avatar', text: initials }),
        h('div', {}, [
          h('div', { text: state.user.full_name }),
          h('div', { style: 'font-size:.72rem;color:#8896a6', text: state.user.role }),
        ]),
        h('button', { class: 'link', onClick: logout }, 'Déconnexion'),
      ]),
    ]);

    const sidebar = h('nav', { class: 'sidebar', 'aria-label': 'Menu principal' },
      MENU.filter((group) => canRead(group.module)).map((group) => {
        const items = h('div', { class: 'menu-items' }, group.items.map((item) => h('a', {
          href: '#/' + item.route, dataset: { route: item.route }, text: item.label,
        })));
        const node = h('div', { class: 'menu-group', dataset: { group: group.id } }, [
          h('button', { onClick: () => node.classList.toggle('is-open') }, [
            icon(group.icon), group.label, h('span', { class: 'chev', text: '›' }),
          ]),
          items,
        ]);
        return node;
      }));

    const main = h('main', { class: 'main', id: 'main' });
    root.appendChild(h('div', { class: 'app is-ready' }, [topbar, sidebar, main]));
  }

  /* --------------------------------------------------------------- routage */
  async function renderRoute() {
    const route = (location.hash.replace(/^#\/?/, '') || 'dashboard').split('?')[0];
    const meta = ROUTE_LABELS[route];
    const main = document.getElementById('main');
    if (!main) return;

    document.querySelectorAll('.menu-items a').forEach((link) => {
      const active = link.dataset.route === route;
      link.classList.toggle('is-active', active);
      if (active) link.closest('.menu-group').classList.add('is-open');
    });

    if (meta && !canRead(meta.module)) {
      main.innerHTML = '';
      main.appendChild(h('div', { class: 'card' }, h('div', { class: 'empty' },
        "Votre profil ne donne pas accès à cet écran.")));
      return;
    }

    const render = screens[route];
    if (!render) {
      main.innerHTML = '';
      main.appendChild(h('div', { class: 'card' }, h('div', { class: 'empty' },
        'Écran introuvable : ' + route)));
      return;
    }
    main.innerHTML = '';
    main.appendChild(h('div', { class: 'loading', text: 'Chargement…' }));
    try {
      const node = await render();
      main.innerHTML = '';
      main.appendChild(node);
      window.scrollTo({ top: 0 });
    } catch (err) {
      main.innerHTML = '';
      main.appendChild(h('div', { class: 'card' }, h('div', { class: 'empty' }, err.message)));
      toast.error(err.message);
    }
  }
  SunuERP.reload = renderRoute;

  SunuERP.pageHead = function pageHead(title, subtitle, actions) {
    return h('div', { class: 'page-head' }, [
      h('div', {}, [h('h2', { text: title }),
                    subtitle ? h('div', { class: 'sub', text: subtitle }) : null]),
      actions && actions.length ? h('div', { class: 'page-actions' }, actions) : null,
    ]);
  };

  /* --------------------------------------------------------------- accueil */
  screens.dashboard = async function dashboard() {
    const data = await api.get('/api/dashboard', { fy: state.fy });
    const k = data.kpi;
    const wrap = h('div', {});

    wrap.appendChild(SunuERP.pageHead(
      'Tableau de bord',
      `${state.company ? state.company.name : ''} — exercice ${data.fy}`,
      [h('button', { class: 'btn', onClick: () => location.hash = '#/gl-integrity' },
         "États d'intégrité"),
       h('button', { class: 'btn btn-primary', onClick: () => location.hash = '#/sales-orders' },
         'Nouvelle commande')]));

    const kpi = (label, value, foot, negative) => h('div', {
      class: 'kpi' + (negative ? ' is-negative' : '') }, [
      h('div', { class: 'label', text: label }),
      h('div', { class: 'value' }, [fmt.money(value), h('span', { class: 'unit', text: 'F CFA' })]),
      foot ? h('div', { class: 'foot', text: foot }) : null,
    ]);

    wrap.appendChild(h('div', { class: 'grid-4', style: 'margin-bottom:16px' }, [
      kpi("Chiffre d'affaires (exercice)", k.revenue_year, `dont ${fmt.money(k.revenue_month)} F ce mois`),
      kpi('Résultat de l\'exercice', k.result, k.result >= 0 ? 'Bénéfice' : 'Perte', k.result < 0),
      kpi('Trésorerie', k.treasury, 'Comptes de classe 5'),
      kpi('Valeur du stock', k.stock_value, `${k.items} articles actifs`),
    ]));
    wrap.appendChild(h('div', { class: 'grid-4', style: 'margin-bottom:16px' }, [
      kpi('Encours clients', k.ar_open, `dont ${fmt.money(k.overdue_ar)} F échus`, k.overdue_ar > 0),
      kpi('Dettes fournisseurs', k.ap_open, `${k.suppliers} fournisseurs référencés`),
      kpi('Achats (exercice)', k.purchases_year, 'Factures fournisseurs'),
      h('div', { class: 'kpi' }, [
        h('div', { class: 'label', text: 'Activité en cours' }),
        h('div', { class: 'value', text: k.open_sales_orders + k.open_work_orders }),
        h('div', { class: 'foot', text:
          `${k.open_sales_orders} commande(s) client · ${k.open_work_orders} ordre(s) de fabrication` }),
      ]),
    ]));

    const months = data.charts.revenue_by_month.map((row) => row.month);
    const purchaseByMonth = new Map(data.charts.purchases_by_month.map((r) => [r.month, r.amount]));
    wrap.appendChild(h('div', { class: 'card' }, [
      h('div', { class: 'card-head' }, [h('h3', { text: 'Ventes et achats par mois' }),
        h('div', { class: 'actions' },
          h('span', { style: 'font-size:.78rem;color:var(--ink-3)', text: 'Montants hors taxes' }))]),
      h('div', { class: 'card-body' }, charts.groupedBars({
        categories: months.map(fmt.month),
        series: [
          { label: "Chiffre d'affaires", values: data.charts.revenue_by_month.map((r) => r.amount) },
          { label: 'Achats', values: months.map((m) => purchaseByMonth.get(m) || 0) },
        ],
      })),
    ]));

    const aging = data.charts.aging;
    wrap.appendChild(h('div', { class: 'grid-2' }, [
      h('div', { class: 'card' }, [
        h('div', { class: 'card-head' }, h('h3', { text: 'Principaux clients (exercice)' })),
        h('div', { class: 'card-body' }, data.charts.top_customers.length
          ? charts.horizontalBars({ rows: data.charts.top_customers.map((row) => ({
              label: row.customer, value: row.revenue, hint: "Chiffre d'affaires" })) })
          : h('div', { class: 'empty', text: 'Aucune facture sur l\'exercice.' })),
      ]),
      h('div', { class: 'card' }, [
        h('div', { class: 'card-head' }, [h('h3', { text: 'Encours clients par ancienneté' }),
          h('div', { class: 'actions' }, h('button', { class: 'btn btn-sm',
            onClick: () => location.hash = '#/sales-aging' }, 'Détail'))]),
        h('div', { class: 'card-body' }, charts.horizontalBars({
          ordinal: true,
          rows: [
            { label: 'Non échu', value: aging.current },
            { label: 'Échu 1 à 30 j', value: aging.d30 },
            { label: 'Échu 31 à 60 j', value: aging.d60 },
            { label: 'Échu 61 à 90 j', value: aging.d90 },
            { label: 'Échu > 90 j', value: aging.d90p },
          ],
        })),
      ]),
    ]));

    wrap.appendChild(h('div', { class: 'grid-2' }, [
      h('div', { class: 'card' }, [
        h('div', { class: 'card-head' }, h('h3', { text: 'Alertes et tâches' })),
        h('div', { class: 'card-body' }, data.alerts.length
          ? data.alerts.map((alert) => h('div', {
              class: 'alert alert-' + (alert.level === 'danger' ? 'danger'
                : alert.level === 'warning' ? 'warning' : 'info') },
              [h('span', { class: 'dot' }), h('span', { text: alert.message })]))
          : h('div', { class: 'empty', text: 'Aucune alerte : tout est à jour.' })),
      ]),
      h('div', { class: 'card' }, [
        h('div', { class: 'card-head' }, [h('h3', { text: 'Dernières factures clients' }),
          h('div', { class: 'actions' }, h('button', { class: 'btn btn-sm',
            onClick: () => location.hash = '#/sales-invoices' }, 'Tout voir'))]),
        h('div', { class: 'card-body tight' }, Grid({
          columns: [
            { key: 'invoice_no', label: 'Numéro', mono: true },
            { key: 'customer_name', label: 'Client' },
            { key: 'invoice_date', label: 'Date', type: 'date' },
            { key: 'total_ttc', label: 'TTC', type: 'money' },
            { key: 'status', label: 'Statut', render: (row) => SunuERP.badge(row.status) },
          ],
          rows: data.recent.invoices,
          onRowClick: (row) => SunuERP.screensSales.openInvoice(row.id),
        })),
      ]),
    ]));

    wrap.appendChild(h('div', { class: 'card' }, [
      h('div', { class: 'card-head' }, h('h3', { text: 'Valeur du stock par catégorie' })),
      h('div', { class: 'card-body' }, data.charts.stock_by_category.length
        ? charts.horizontalBars({ rows: data.charts.stock_by_category.map((row) => ({
            label: row.category, value: row.value, hint: 'Valeur' })) })
        : h('div', { class: 'empty', text: 'Stock vide.' })),
    ]));

    return wrap;
  };

  screens.vat = async function vatScreen() {
    const now = new Date();
    const yearInput = h('input', { type: 'number', value: now.getFullYear(), style: 'width:100px' });
    const monthInput = SunuERP.select({}, Array.from({ length: 12 }, (_, i) => ({
      value: i + 1, label: fmt.month(`${now.getFullYear()}-${String(i + 1).padStart(2, '0')}`) })),
      now.getMonth() + 1);
    const body = h('div', { class: 'card-body' });

    async function load() {
      body.innerHTML = '';
      const data = await api.get('/api/reports/vat',
        { year: yearInput.value, month: monthInput.value });
      const line = (label, value, strong) => h('div', {
        style: 'display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--line-2)' +
               (strong ? ';font-weight:700;font-size:1.05rem' : '') }, [
        h('span', { text: label }),
        h('span', { style: 'font-variant-numeric:tabular-nums', text: fmt.money(value) + ' F CFA' }),
      ]);
      body.appendChild(h('div', { style: 'max-width:620px' }, [
        line('Base des ventes taxables (HT)', data.sales_base),
        line('TVA collectée sur ventes', data.vat_collected),
        line('Base des achats (HT)', data.purchases_base),
        line('TVA récupérable sur achats', data.vat_deductible),
        line(data.vat_due >= 0 ? 'TVA à reverser à l\'État' : 'Crédit de TVA reportable',
             Math.abs(data.vat_due), true),
      ]));
    }
    yearInput.addEventListener('change', load);
    monthInput.addEventListener('change', load);

    const wrap = h('div', {}, [
      SunuERP.pageHead('Déclaration de TVA', 'Taux en vigueur : 18 % — régime du réel'),
      h('div', { class: 'card' }, [
        h('div', { class: 'toolbar' }, [
          h('span', { style: 'font-size:.82rem;font-weight:600', text: 'Période :' }),
          monthInput, yearInput,
          h('div', { class: 'spacer' }),
          h('button', { class: 'btn btn-sm', onClick: () => SunuERP.printNode(body, 'Déclaration TVA') },
            'Imprimer'),
        ]),
        body,
      ]),
    ]);
    await load();
    return wrap;
  };

  /* --------------------------------------------------------------- démarrage */
  async function logout() {
    try { await api.post('/api/auth/logout', { token: state.token }); } catch (e) { /* ignoré */ }
    state.token = null;
    state.user = null;
    localStorage.removeItem('sunuerp_token');
    renderLogin();
  }

  SunuERP.app = {
    forceLogout(message) {
      state.token = null;
      state.user = null;
      localStorage.removeItem('sunuerp_token');
      renderLogin(message);
    },
  };

  async function boot() {
    if (!state.token) { renderLogin(); return; }
    let me;
    try {
      me = await api.get('/api/auth/me');
    } catch (err) {
      SunuERP.app.forceLogout();
      return;
    }
    state.user = me.user;
    state.company = me.company;
    if (me.fiscal_years && me.fiscal_years.length) {
      const years = me.fiscal_years.map((row) => row.fy);
      state.fy = years.includes(new Date().getFullYear()) ? new Date().getFullYear() : years[0];
    }
    renderShell();
    await renderRoute();
  }

  window.addEventListener('hashchange', renderRoute);
  document.addEventListener('DOMContentLoaded', boot);
})();
