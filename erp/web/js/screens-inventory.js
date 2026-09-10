/* =====================================================================
   SunuERP — articles, stocks, entrepôts et production
   ===================================================================== */
'use strict';

(function () {
  const { h, api, fmt, toast, modal, Grid, charts } = SunuERP;
  const screens = SunuERP.screens;
  const can = SunuERP.can;

  /* ================================================================ articles */
  async function itemForm(itemId) {
    const item = itemId ? await api.get('/api/items/' + itemId) : null;
    const get = (key, fallback) => (item && item[key] !== null && item[key] !== undefined
      ? item[key] : fallback);

    const form = h('div', { class: 'form-grid' }, [
      SunuERP.field('Référence', h('input', { name: 'item_code', value: get('item_code', ''),
                                              required: true })),
      SunuERP.field('Désignation', h('input', { name: 'description', value: get('description', ''),
                                                required: true })),
      SunuERP.field('Type', SunuERP.select({ name: 'item_type' }, [
        { value: 'STOCK', label: 'Marchandise stockée' },
        { value: 'MATIERE', label: 'Matière première' },
        { value: 'FINI', label: 'Produit fini' },
        { value: 'SERVICE', label: 'Service (non stocké)' },
      ], get('item_type', 'STOCK'))),
      SunuERP.field('Catégorie', h('input', { name: 'category', value: get('category', '') })),
      SunuERP.field('Unité', SunuERP.select({ name: 'uom' },
        ['U', 'KG', 'L', 'M', 'ROU'], get('uom', 'U'))),
      SunuERP.field('Prix de vente HT',
        h('input', { name: 'sale_price', type: 'number', step: '1', value: get('sale_price', 0) })),
      SunuERP.field('Coût standard',
        h('input', { name: 'standard_cost', type: 'number', step: '1',
                     value: get('standard_cost', 0) })),
      SunuERP.field('Taux de TVA (%)',
        h('input', { name: 'vat_rate', type: 'number', step: '1', value: get('vat_rate', 18) })),
      SunuERP.field('Stock de sécurité',
        h('input', { name: 'min_stock', type: 'number', step: '1', value: get('min_stock', 0) })),
      SunuERP.field('Délai d\'approvisionnement (jours)',
        h('input', { name: 'lead_time_days', type: 'number', step: '1',
                     value: get('lead_time_days', 0) })),
      h('div', { class: 'field checkbox' }, [
        h('input', { type: 'checkbox', name: 'active', id: 'it-active', checked: !!get('active', 1) }),
        h('label', { for: 'it-active', text: 'Article actif' }),
      ]),
    ]);

    const body = h('div', {}, [form]);
    if (item) {
      body.appendChild(h('div', { style: 'margin-top:18px' }, [
        h('h4', { text: 'Stock par entrepôt', style: 'font-size:.9rem;margin-bottom:6px' }),
        Grid({ columns: [
          { key: 'warehouse', label: 'Entrepôt' },
          { key: 'warehouse_name', label: 'Libellé' },
          { key: 'qty_on_hand', label: 'Quantité', type: 'qty' },
        ], rows: item.stock, empty: 'Aucun stock enregistré.' }),
        h('div', { style: 'display:flex;gap:20px;margin-top:10px;font-size:.85rem' }, [
          h('div', {}, [h('strong', {}, 'Coût moyen pondéré : '),
                        fmt.money(item.average_cost) + ' F CFA']),
        ]),
        h('h4', { text: 'Derniers mouvements', style: 'font-size:.9rem;margin:16px 0 6px' }),
        Grid({ columns: [
          { key: 'move_date', label: 'Date', type: 'date' },
          { key: 'move_type', label: 'Type' },
          { key: 'warehouse', label: 'Entrepôt' },
          { key: 'quantity', label: 'Quantité', type: 'qty' },
          { key: 'unit_cost', label: 'Coût unitaire', type: 'money' },
          { key: 'balance_after', label: 'Stock après', type: 'qty' },
          { key: 'doc_number', label: 'Document', mono: true },
        ], rows: item.movements, maxHeight: '260px', empty: 'Aucun mouvement.' }),
      ]));
    }

    modal.open({
      title: item ? `Article ${item.item_code}` : 'Nouvel article', size: 'large', body,
      footer: [
        item && can('IN', 'write') ? h('button', { class: 'btn', onClick: () => {
          modal.close();
          adjustForm(item);
        } }, 'Régulariser le stock') : null,
        h('button', { class: 'btn', onClick: () => modal.close() }, 'Fermer'),
        can('IN', 'write') ? h('button', { class: 'btn btn-primary', onClick: async () => {
          const values = SunuERP.formValues(form);
          values.id = itemId || null;
          try {
            await api.post('/api/items', values);
            SunuERP.state.cache.items = null;
            toast.success('Article enregistré.');
            modal.close();
            await SunuERP.reload();
          } catch (err) { toast.error(err.message); }
        } }, 'Enregistrer') : null,
      ].filter(Boolean),
    });
  }

  async function adjustForm(item) {
    const warehouseSelect = await SunuERP.warehouseSelect(null, { name: 'warehouse' });
    const form = h('div', { class: 'form-grid' }, [
      SunuERP.field('Article', h('input', { value: `${item.item_code} — ${item.description}`,
                                            readonly: true }), { full: true }),
      SunuERP.field('Entrepôt', warehouseSelect),
      SunuERP.field('Quantité comptée',
        h('input', { name: 'counted_qty', type: 'number', step: '0.01', required: true })),
      SunuERP.field('Date', h('input', { name: 'date', type: 'date', value: fmt.today() })),
      SunuERP.field('Motif', h('input', { name: 'reason', value: 'Inventaire tournant' }),
                    { full: true }),
    ]);
    modal.open({
      title: 'Régularisation de stock',
      body: h('div', {}, [form, h('p', {
        style: 'margin-top:12px;font-size:.8rem;color:var(--ink-3)',
        text: "L'écart entre le stock théorique et le stock compté génère un mouvement " +
              "et une écriture comptable sur le compte d'écarts d'inventaire." })]),
      footer: [
        h('button', { class: 'btn', onClick: () => modal.close() }, 'Annuler'),
        h('button', { class: 'btn btn-primary', onClick: async () => {
          const values = SunuERP.formValues(form);
          values.item_id = item.id;
          try {
            const result = await api.post('/api/stock/adjust', values);
            toast.success('Écart de ' + fmt.qty(result.delta) + ' régularisé.');
            modal.close();
            await SunuERP.reload();
          } catch (err) { toast.error(err.message); }
        } }, 'Régulariser'),
      ],
    });
  }

  async function transferForm() {
    const itemSelect = await SunuERP.itemSelect(null, { name: 'item_id' },
      (item) => item.item_type !== 'SERVICE');
    const from = await SunuERP.warehouseSelect(null, { name: 'from_warehouse' });
    const to = await SunuERP.warehouseSelect(null, { name: 'to_warehouse' });
    const form = h('div', { class: 'form-grid' }, [
      SunuERP.field('Article', itemSelect, { full: true }),
      SunuERP.field('Entrepôt d\'origine', from),
      SunuERP.field('Entrepôt de destination', to),
      SunuERP.field('Quantité', h('input', { name: 'quantity', type: 'number', step: '0.01',
                                             min: '0.01' })),
      SunuERP.field('Date', h('input', { name: 'date', type: 'date', value: fmt.today() })),
    ]);
    modal.open({
      title: 'Transfert entre entrepôts', body: form,
      footer: [
        h('button', { class: 'btn', onClick: () => modal.close() }, 'Annuler'),
        h('button', { class: 'btn btn-primary', onClick: async () => {
          try {
            await api.post('/api/stock/transfer', SunuERP.formValues(form));
            toast.success('Transfert enregistré.');
            modal.close();
            await SunuERP.reload();
          } catch (err) { toast.error(err.message); }
        } }, 'Transférer'),
      ],
    });
  }

  screens.items = () => SunuERP.workWith({
    title: 'Articles', subtitle: 'Fiches articles, prix, coût moyen et stock disponible',
    exportName: 'articles',
    filters: [
      { key: 'search', label: 'Référence, désignation, catégorie…' },
      { key: 'type', type: 'select', label: 'Type', options: [
        { value: '', label: 'Tous types' }, { value: 'STOCK', label: 'Marchandises' },
        { value: 'MATIERE', label: 'Matières' }, { value: 'FINI', label: 'Produits finis' },
        { value: 'SERVICE', label: 'Services' }] },
    ],
    actions: can('IN', 'write') ? [
      h('button', { class: 'btn', onClick: transferForm }, 'Transfert de stock'),
      h('button', { class: 'btn btn-primary', onClick: () => itemForm(null) }, '+ Nouvel article'),
    ] : [],
    load: (filters) => api.get('/api/items', filters),
    columns: [
      { key: 'item_code', label: 'Référence', mono: true },
      { key: 'description', label: 'Désignation' },
      { key: 'item_type', label: 'Type', render: (row) => h('span', {
        class: 'badge badge-muted', text: { STOCK: 'Marchandise', MATIERE: 'Matière',
          FINI: 'Produit fini', SERVICE: 'Service' }[row.item_type] || row.item_type }) },
      { key: 'category', label: 'Catégorie' },
      { key: 'uom', label: 'Unité' },
      { key: 'qty_on_hand', label: 'Stock', type: 'qty',
        cellClass: (row) => (row.min_stock > 0 && row.qty_on_hand <= row.min_stock
          ? 'is-low' : '') },
      { key: 'min_stock', label: 'Mini', type: 'qty' },
      { key: 'average_cost', label: 'Coût moyen', type: 'money' },
      { key: 'sale_price', label: 'Prix de vente', type: 'money' },
    ],
    onRowClick: (row) => itemForm(row.id),
  });

  screens['stock-valuation'] = async function valuation() {
    const warehouses = await api.get('/api/warehouses');
    return SunuERP.workWith({
      title: 'Valorisation du stock', subtitle: 'Quantités et valeur au coût moyen pondéré',
      exportName: 'valorisation-stock',
      filters: [{ key: 'warehouse', type: 'select', label: 'Entrepôt',
        options: [{ value: '', label: 'Tous les entrepôts' }].concat(
          warehouses.map((w) => ({ value: w.code, label: w.name }))) }],
      load: async (filters) => {
        const data = await api.get('/api/stock/valuation', filters);
        SunuERP.state.cache.valuationTotal = data.total_value;
        return data.lines;
      },
      columns: [
        { key: 'item_code', label: 'Référence', mono: true },
        { key: 'description', label: 'Article' },
        { key: 'warehouse', label: 'Entrepôt' },
        { key: 'qty_on_hand', label: 'Quantité', type: 'qty' },
        { key: 'uom', label: 'Unité' },
        { key: 'average_cost', label: 'Coût unitaire', type: 'money' },
        { key: 'value', label: 'Valeur', type: 'money' },
      ],
      footer: (rows) => h('tr', {}, [
        h('td', { colspan: 6 }, 'Valeur totale du stock'),
        h('td', { class: 'num', text: fmt.money(rows.reduce((sum, r) => sum + (r.value || 0), 0)) }),
      ]),
    });
  };

  screens['stock-movements'] = async function movements() {
    const warehouses = await api.get('/api/warehouses');
    return SunuERP.workWith({
      title: 'Mouvements de stock', subtitle: 'Journal des entrées, sorties et régularisations',
      exportName: 'mouvements-stock',
      filters: [
        { key: 'warehouse', type: 'select', label: 'Entrepôt',
          options: [{ value: '', label: 'Tous' }].concat(
            warehouses.map((w) => ({ value: w.code, label: w.name }))) },
        { key: 'from', type: 'date' },
        { key: 'to', type: 'date' },
      ],
      load: (filters) => api.get('/api/stock/movements', filters),
      columns: [
        { key: 'move_date', label: 'Date', type: 'date' },
        { key: 'item_code', label: 'Article', mono: true },
        { key: 'item_description', label: 'Désignation' },
        { key: 'warehouse', label: 'Entrepôt' },
        { key: 'move_type', label: 'Type', render: (row) => h('span', {
          class: 'badge badge-' + (row.quantity >= 0 ? 'good' : 'warn'),
          text: { IN: 'Entrée', OUT: 'Sortie', ADJ: 'Régularisation',
                  TRF_IN: 'Transfert +', TRF_OUT: 'Transfert −' }[row.move_type] || row.move_type }) },
        { key: 'quantity', label: 'Quantité', type: 'qty' },
        { key: 'unit_cost', label: 'Coût unitaire', type: 'money' },
        { key: 'value', label: 'Valeur', type: 'money' },
        { key: 'balance_after', label: 'Stock après', type: 'qty' },
        { key: 'doc_number', label: 'Document', mono: true },
        { key: 'username', label: 'Utilisateur' },
      ],
    });
  };

  screens['stock-reorder'] = () => SunuERP.workWith({
    title: 'Réapprovisionnement', subtitle: 'Articles au niveau ou en dessous du stock de sécurité',
    exportName: 'reappro',
    filters: [],
    load: () => api.get('/api/stock/reorder'),
    columns: [
      { key: 'item_code', label: 'Référence', mono: true },
      { key: 'description', label: 'Article' },
      { key: 'qty_on_hand', label: 'Stock', type: 'qty' },
      { key: 'min_stock', label: 'Stock mini', type: 'qty' },
      { key: 'lead_time_days', label: 'Délai (j)', type: 'num' },
      { key: 'supplier', label: 'Fournisseur habituel' },
    ],
    empty: 'Aucun article sous le seuil : les stocks sont suffisants.',
  });

  screens.warehouses = () => SunuERP.workWith({
    title: 'Entrepôts', subtitle: 'Sites de stockage et rattachement analytique',
    exportName: 'entrepots', filters: [],
    load: () => api.get('/api/warehouses'),
    columns: [
      { key: 'code', label: 'Code', mono: true },
      { key: 'name', label: 'Libellé' },
      { key: 'business_unit', label: 'Centre' },
      { key: 'city', label: 'Ville' },
    ],
  });

  /* ================================================================ production */
  async function bomForm(bomId) {
    const bom = bomId ? await api.get('/api/production/boms/' + bomId) : null;
    const itemSelect = await SunuERP.itemSelect(bom && bom.item_id, { name: 'item_id' },
      (item) => ['FINI', 'STOCK'].includes(item.item_type));
    const items = SunuERP.state.cache.items;
    const components = items.filter((item) => item.item_type !== 'SERVICE');

    const body = h('tbody', {});
    function addLine(line) {
      const select = SunuERP.select({ class: 'c-item' }, components.map((item) => ({
        value: item.id, label: `${item.item_code} — ${item.description}` })),
        line && line.component_id);
      const qty = h('input', { class: 'c-qty', type: 'number', step: '0.001', min: '0',
                               value: line ? line.quantity : 1 });
      const scrap = h('input', { class: 'c-scrap', type: 'number', step: '0.1', min: '0',
                                 value: line ? line.scrap_pct : 0 });
      const row = h('tr', {}, [
        h('td', {}, select), h('td', { class: 'num' }, qty), h('td', { class: 'num' }, scrap),
        h('td', {}, h('button', { class: 'line-remove', type: 'button',
                                  onClick: () => row.remove() }, '×')),
      ]);
      body.appendChild(row);
    }
    (bom ? bom.lines : []).forEach(addLine);
    if (!body.children.length) addLine();

    const header = h('div', { class: 'form-grid cols-3' }, [
      SunuERP.field('Article fabriqué', itemSelect),
      SunuERP.field('Version', h('input', { name: 'version', value: bom ? bom.version : '01' })),
      SunuERP.field('Quantité produite par nomenclature',
        h('input', { name: 'quantity', type: 'number', step: '1', value: bom ? bom.quantity : 1 })),
    ]);

    modal.open({
      title: bom ? `Nomenclature ${bom.item_code} (v${bom.version})` : 'Nouvelle nomenclature',
      body: h('div', {}, [
        header, h('div', { style: 'height:16px' }),
        h('table', { class: 'lines' }, [
          h('thead', {}, h('tr', {}, [h('th', {}, 'Composant'), h('th', {}, 'Quantité'),
                                      h('th', {}, 'Rebut %'), h('th', {}, '')])),
          body,
        ]),
        h('button', { class: 'btn btn-sm', type: 'button', style: 'margin-top:10px',
                      onClick: () => addLine() }, '+ Ajouter un composant'),
        bom ? h('p', { style: 'margin-top:12px;font-size:.85rem' },
          [h('strong', {}, 'Coût matière unitaire estimé : '),
           fmt.money(bom.unit_cost) + ' F CFA']) : null,
      ]),
      footer: [
        h('button', { class: 'btn', onClick: () => modal.close() }, 'Annuler'),
        can('MF', 'write') ? h('button', { class: 'btn btn-primary', onClick: async () => {
          const values = SunuERP.formValues(header);
          values.lines = Array.from(body.querySelectorAll('tr')).map((row) => ({
            component_id: Number(row.querySelector('.c-item').value),
            quantity: Number(row.querySelector('.c-qty').value) || 0,
            scrap_pct: Number(row.querySelector('.c-scrap').value) || 0,
          })).filter((line) => line.component_id && line.quantity > 0);
          try {
            await api.post('/api/production/boms', values);
            toast.success('Nomenclature enregistrée.');
            modal.close();
            await SunuERP.reload();
          } catch (err) { toast.error(err.message); }
        } }, 'Enregistrer') : null,
      ].filter(Boolean),
    });
  }

  screens.boms = () => SunuERP.workWith({
    title: 'Nomenclatures', subtitle: 'Composition des articles fabriqués',
    exportName: 'nomenclatures',
    filters: [{ key: 'search', label: 'Article…' }],
    actions: can('MF', 'write')
      ? [h('button', { class: 'btn btn-primary', onClick: () => bomForm(null) },
           '+ Nouvelle nomenclature')] : [],
    load: (filters) => api.get('/api/production/boms', filters),
    columns: [
      { key: 'item_code', label: 'Article', mono: true },
      { key: 'description', label: 'Désignation' },
      { key: 'version', label: 'Version' },
      { key: 'quantity', label: 'Lot de production', type: 'qty' },
      { key: 'components', label: 'Composants', type: 'num' },
      { key: 'active', label: 'Active', render: (row) => SunuERP.badge(row.active ? 'APPROUVE' : 'VOID') },
    ],
    onRowClick: (row) => bomForm(row.id),
  });

  async function newWorkOrder() {
    const itemSelect = await SunuERP.itemSelect(null, { name: 'item_id' },
      (item) => ['FINI', 'STOCK'].includes(item.item_type));
    const warehouse = await SunuERP.warehouseSelect(null, { name: 'warehouse' });
    const form = h('div', { class: 'form-grid' }, [
      SunuERP.field('Article à fabriquer', itemSelect, { full: true }),
      SunuERP.field('Quantité', h('input', { name: 'qty_planned', type: 'number', min: '1',
                                             step: '1', value: 100 })),
      SunuERP.field('Entrepôt', warehouse),
      SunuERP.field('Date de lancement',
        h('input', { name: 'start_date', type: 'date', value: fmt.today() })),
      SunuERP.field('Date de fin prévue', h('input', { name: 'due_date', type: 'date' })),
    ]);
    modal.open({
      title: 'Nouvel ordre de fabrication',
      body: h('div', {}, [form, h('p', {
        style: 'margin-top:12px;font-size:.8rem;color:var(--ink-3)',
        text: "La nomenclature active de l'article est éclatée automatiquement en besoins composants." })]),
      footer: [
        h('button', { class: 'btn', onClick: () => modal.close() }, 'Annuler'),
        h('button', { class: 'btn btn-primary', onClick: async () => {
          try {
            const wo = await api.post('/api/production/work-orders', SunuERP.formValues(form));
            toast.success('Ordre ' + wo.wo_no + ' créé.');
            modal.close();
            await SunuERP.reload();
            openWorkOrder(wo.id);
          } catch (err) { toast.error(err.message); }
        } }, 'Créer'),
      ],
    });
  }

  async function openWorkOrder(woId) {
    const wo = await api.get('/api/production/work-orders/' + woId);
    const writable = can('MF', 'write');
    const actions = [];
    if (writable && wo.status === 'PLANNED') {
      actions.push(SunuERP.docAction('Lancer en production', () =>
        api.post(`/api/production/work-orders/${woId}/release`),
        { primary: true, success: 'Ordre lancé.', after: () => openWorkOrder(woId) }));
    }
    if (writable && wo.status === 'RELEASED' &&
        wo.components.some((c) => c.qty_issued < c.qty_required)) {
      actions.push(SunuERP.docAction('Consommer les composants', () =>
        api.post(`/api/production/work-orders/${woId}/issue`, { date: fmt.today() }),
        { primary: true, confirm: 'Sortir du stock les composants requis ?',
          success: 'Composants consommés.', after: () => openWorkOrder(woId) }));
    }
    if (writable && wo.status === 'RELEASED' && wo.wip_value > 0) {
      actions.push(SunuERP.docAction('Déclarer la production', () =>
        api.post(`/api/production/work-orders/${woId}/complete`,
                 { qty_produced: wo.qty_planned, date: fmt.today() }),
        { primary: true, confirm: `Déclarer ${fmt.qty(wo.qty_planned)} unité(s) produite(s) ?`,
          success: 'Production déclarée.', after: () => openWorkOrder(woId) }));
    }

    modal.open({
      title: `Ordre de fabrication ${wo.wo_no}`, size: 'large',
      body: h('div', {}, [
        h('div', { class: 'form-grid cols-3', style: 'margin-bottom:14px' }, [
          info('Article', `${wo.item_code} — ${wo.description}`),
          info('Quantité planifiée', fmt.qty(wo.qty_planned)),
          info('Quantité produite', fmt.qty(wo.qty_produced)),
          info('Statut', '', SunuERP.badge(wo.status)),
          info('Entrepôt', wo.warehouse),
          info('En-cours valorisé', fmt.money(wo.wip_value) + ' F'),
        ]),
        Grid({ columns: [
          { key: 'item_code', label: 'Composant', mono: true },
          { key: 'description', label: 'Désignation' },
          { key: 'qty_required', label: 'Besoin', type: 'qty' },
          { key: 'qty_issued', label: 'Consommé', type: 'qty' },
          { key: 'qty_on_hand', label: 'Stock disponible', type: 'qty' },
          { key: 'unit_cost', label: 'Coût unitaire', type: 'money' },
        ], rows: wo.components }),
        wo.warnings && wo.warnings.length ? h('div', { style: 'margin-top:12px' },
          wo.warnings.map((warning) => h('div', { class: 'alert alert-warning' },
            [h('span', { class: 'dot' }), h('span', { text: warning })]))) : null,
      ]),
      footer: actions.concat([h('button', { class: 'btn', onClick: () => modal.close() }, 'Fermer')]),
    });
  }

  function info(label, value, node) {
    return h('div', {}, [
      h('div', { style: 'font-size:.74rem;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3);font-weight:600',
                 text: label }),
      node || h('div', { style: 'font-weight:600;margin-top:2px', text: value }),
    ]);
  }

  screens['work-orders'] = () => SunuERP.workWith({
    title: 'Ordres de fabrication', subtitle: 'Lancement, consommation et déclaration de production',
    exportName: 'ordres-fabrication',
    filters: [
      { key: 'search', label: 'N° ou article…' },
      { key: 'status', type: 'select', label: 'Statut', options: [
        { value: '', label: 'Tous' }, { value: 'PLANNED', label: 'Planifié' },
        { value: 'RELEASED', label: 'Lancé' }, { value: 'COMPLETED', label: 'Terminé' }] },
    ],
    actions: can('MF', 'write')
      ? [h('button', { class: 'btn btn-primary', onClick: newWorkOrder }, '+ Nouvel ordre')] : [],
    load: (filters) => api.get('/api/production/work-orders', filters),
    columns: [
      { key: 'wo_no', label: 'N°', mono: true },
      { key: 'item_code', label: 'Article', mono: true },
      { key: 'description', label: 'Désignation' },
      { key: 'qty_planned', label: 'Planifié', type: 'qty' },
      { key: 'qty_produced', label: 'Produit', type: 'qty' },
      { key: 'warehouse', label: 'Entrepôt' },
      { key: 'wip_value', label: 'En-cours', type: 'money' },
      { key: 'status', label: 'Statut', render: (row) => SunuERP.badge(row.status) },
    ],
    onRowClick: (row) => openWorkOrder(row.id),
  });

  screens.mrp = () => SunuERP.workWith({
    title: 'Besoins en composants', subtitle: 'Calcul simplifié des besoins nets des ordres lancés',
    exportName: 'besoins-composants', filters: [],
    load: () => api.get('/api/production/requirements'),
    columns: [
      { key: 'item_code', label: 'Composant', mono: true },
      { key: 'description', label: 'Désignation' },
      { key: 'required', label: 'Besoin', type: 'qty' },
      { key: 'available', label: 'Disponible', type: 'qty' },
      { key: 'gap', label: 'Écart', type: 'qty',
        render: (row) => h('span', { style: (row.available - row.required) < 0
          ? 'color:var(--critical);font-weight:600' : '',
          text: fmt.qty(row.available - row.required) }) },
    ],
    empty: 'Aucun besoin en attente : tous les ordres lancés sont servis.',
  });
})();
