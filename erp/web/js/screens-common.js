/* =====================================================================
   SunuERP — composants partagés par les écrans de travail
   ===================================================================== */
'use strict';

(function () {
  const { h, api, fmt, toast, modal, Grid } = SunuERP;

  /**
   * Écran « travailler avec » : barre d'outils, filtres, grille, export.
   */
  SunuERP.workWith = async function workWith(config) {
    const filterNodes = {};
    const toolbar = h('div', { class: 'toolbar' });
    const gridHolder = h('div', { class: 'card-body tight' });
    const counter = h('span', { class: 'count' });
    let currentRows = [];

    async function refresh() {
      const values = {};
      Object.entries(filterNodes).forEach(([key, node]) => { values[key] = node.value; });
      gridHolder.innerHTML = '';
      gridHolder.appendChild(h('div', { class: 'loading', text: 'Chargement…' }));
      try {
        currentRows = await config.load(values);
      } catch (err) {
        gridHolder.innerHTML = '';
        gridHolder.appendChild(h('div', { class: 'empty', text: err.message }));
        return;
      }
      gridHolder.innerHTML = '';
      gridHolder.appendChild(Grid({
        columns: config.columns,
        rows: currentRows,
        onRowClick: config.onRowClick,
        empty: config.empty,
        footer: config.footer,
        maxHeight: config.maxHeight || '68vh',
      }));
      counter.textContent = currentRows.length + (currentRows.length > 1 ? ' lignes' : ' ligne');
    }

    (config.filters || []).forEach((filter) => {
      let node;
      if (filter.type === 'select') {
        node = SunuERP.select({}, filter.options, filter.value);
      } else if (filter.type === 'date') {
        node = h('input', { type: 'date', value: filter.value || '' });
      } else {
        node = h('input', { type: 'search', placeholder: filter.label || 'Rechercher…',
                            value: filter.value || '' });
      }
      node.addEventListener('change', refresh);
      if (filter.type !== 'select' && filter.type !== 'date') {
        let timer;
        node.addEventListener('input', () => {
          clearTimeout(timer);
          timer = setTimeout(refresh, 320);
        });
      }
      filterNodes[filter.key] = node;
      if (filter.label && filter.type === 'select') {
        toolbar.appendChild(h('span', { style: 'font-size:.8rem;color:var(--ink-2);font-weight:600',
                                        text: filter.label }));
      }
      toolbar.appendChild(node);
    });

    toolbar.appendChild(h('div', { class: 'spacer' }));
    toolbar.appendChild(counter);
    toolbar.appendChild(h('button', { class: 'btn btn-sm', onClick: refresh }, 'Actualiser'));
    if (config.exportName !== false) {
      toolbar.appendChild(h('button', { class: 'btn btn-sm', onClick: () =>
        SunuERP.toCsv(config.columns.filter((c) => c.key), currentRows,
                      (config.exportName || 'export') + '.csv') }, 'Export CSV'));
    }

    const wrap = h('div', {}, [
      SunuERP.pageHead(config.title, config.subtitle, config.actions),
      h('div', { class: 'card' }, [toolbar, gridHolder]),
      config.extra || null,
    ]);
    await refresh();
    wrap.refresh = refresh;
    return wrap;
  };

  /** Champ de sélection d'un tiers (client ou fournisseur). */
  SunuERP.partnerSelect = async function partnerSelect(role, selected, attrs) {
    const partners = await api.get('/api/partners', { role, limit: 500 });
    return SunuERP.select(Object.assign({ name: 'partner' }, attrs || {}),
      [{ value: '', label: '— Choisir —' }].concat(partners.map((p) => ({
        value: p.an8, label: `${p.an8} — ${p.alpha_name}` }))), selected);
  };

  /** Champ de sélection d'un article. */
  SunuERP.itemSelect = async function itemSelect(selected, attrs, filter) {
    const items = SunuERP.state.cache.items ||
      (SunuERP.state.cache.items = await api.get('/api/items', { limit: 500 }));
    const list = filter ? items.filter(filter) : items;
    return SunuERP.select(Object.assign({}, attrs || {}),
      [{ value: '', label: '— Article —' }].concat(list.map((item) => ({
        value: item.id, label: `${item.item_code} — ${item.description}` }))), selected);
  };

  SunuERP.warehouseSelect = async function warehouseSelect(selected, attrs) {
    const warehouses = SunuERP.state.cache.warehouses ||
      (SunuERP.state.cache.warehouses = await api.get('/api/warehouses'));
    return SunuERP.select(attrs || {}, warehouses.map((w) => ({
      value: w.code, label: `${w.code} — ${w.name}` })), selected);
  };

  /**
   * Éditeur de lignes de document (commandes client et fournisseur).
   * mode : 'sale' (prix de vente) ou 'purchase' (coût d'achat)
   */
  SunuERP.lineEditor = async function lineEditor(mode, initialLines) {
    const items = SunuERP.state.cache.items ||
      (SunuERP.state.cache.items = await api.get('/api/items', { limit: 500 }));
    const byId = new Map(items.map((item) => [String(item.id), item]));
    const priceField = mode === 'sale' ? 'sale_price' : 'standard_cost';

    const body = h('tbody', {});
    const totals = { ht: 0, vat: 0 };
    const totalHt = h('span', {});
    const totalVat = h('span', {});
    const totalTtc = h('span', {});

    function recalc() {
      totals.ht = 0; totals.vat = 0;
      body.querySelectorAll('tr').forEach((row) => {
        const qty = Number(row.querySelector('.l-qty').value) || 0;
        const price = Number(row.querySelector('.l-price').value) || 0;
        const discount = Number(row.querySelector('.l-disc') ? row.querySelector('.l-disc').value : 0) || 0;
        const vatRate = Number(row.querySelector('.l-vat').value) || 0;
        const amount = qty * price * (1 - discount / 100);
        totals.ht += amount;
        totals.vat += amount * vatRate / 100;
        row.querySelector('.row-total').textContent = fmt.money(amount);
      });
      totalHt.textContent = fmt.money(totals.ht) + ' F';
      totalVat.textContent = fmt.money(totals.vat) + ' F';
      totalTtc.textContent = fmt.money(totals.ht + totals.vat) + ' F';
    }

    function addLine(line) {
      const select = SunuERP.select({ class: 'l-item' },
        [{ value: '', label: '— Article —' }].concat(items.map((item) => ({
          value: item.id, label: `${item.item_code} — ${item.description}` }))),
        line && line.item_id);
      const qty = h('input', { class: 'l-qty', type: 'number', min: '0', step: '0.01',
                               value: line ? line.quantity : 1 });
      const price = h('input', { class: 'l-price', type: 'number', min: '0', step: '1',
                                 value: line ? (mode === 'sale' ? line.unit_price : line.unit_cost) : 0 });
      const discount = mode === 'sale'
        ? h('input', { class: 'l-disc', type: 'number', min: '0', max: '100', step: '1',
                       value: line ? line.discount_pct || 0 : 0 })
        : null;
      const vat = h('input', { class: 'l-vat', type: 'number', min: '0', max: '30', step: '1',
                               value: line ? line.vat_rate : 18 });
      const total = h('td', { class: 'row-total', text: '0' });

      select.addEventListener('change', () => {
        const item = byId.get(select.value);
        if (item) {
          price.value = Math.round(item[priceField] || item.average_cost || 0);
          vat.value = item.vat_rate;
        }
        recalc();
      });
      [qty, price, vat, discount].filter(Boolean).forEach((node) =>
        node.addEventListener('input', recalc));

      const row = h('tr', {}, [
        h('td', { style: 'min-width:260px' }, select),
        h('td', { class: 'num', style: 'width:90px' }, qty),
        h('td', { class: 'num', style: 'width:110px' }, price),
        discount ? h('td', { class: 'num', style: 'width:80px' }, discount) : null,
        h('td', { class: 'num', style: 'width:80px' }, vat),
        total,
        h('td', { style: 'width:30px' }, h('button', {
          class: 'line-remove', type: 'button', title: 'Supprimer la ligne',
          onClick: () => { row.remove(); recalc(); } }, '×')),
      ]);
      body.appendChild(row);
      recalc();
    }

    (initialLines || []).forEach(addLine);
    if (!body.children.length) addLine();

    const table = h('table', { class: 'lines' }, [
      h('thead', {}, h('tr', {}, [
        h('th', {}, 'Article'), h('th', {}, 'Quantité'),
        h('th', {}, mode === 'sale' ? 'Prix unitaire' : 'Coût unitaire'),
        mode === 'sale' ? h('th', {}, 'Remise %') : null,
        h('th', {}, 'TVA %'), h('th', {}, 'Montant HT'), h('th', {}, ''),
      ].filter(Boolean))),
      body,
    ]);

    const node = h('div', {}, [
      table,
      h('div', { style: 'display:flex;gap:16px;align-items:flex-start;margin-top:12px' }, [
        h('button', { class: 'btn btn-sm', type: 'button', onClick: () => addLine() },
          '+ Ajouter une ligne'),
        h('div', { class: 'doc-totals' }, [
          h('div', {}, [h('span', {}, 'Total HT'), totalHt]),
          h('div', {}, [h('span', {}, 'TVA'), totalVat]),
          h('div', { class: 'grand' }, [h('span', {}, 'Total TTC'), totalTtc]),
        ]),
      ]),
    ]);

    node.getLines = () => Array.from(body.querySelectorAll('tr')).map((row) => {
      const itemId = row.querySelector('.l-item').value;
      const item = byId.get(itemId);
      const line = {
        item_id: itemId ? Number(itemId) : null,
        description: item ? item.description : '',
        quantity: Number(row.querySelector('.l-qty').value) || 0,
        vat_rate: Number(row.querySelector('.l-vat').value) || 0,
      };
      if (mode === 'sale') {
        line.unit_price = Number(row.querySelector('.l-price').value) || 0;
        line.discount_pct = Number(row.querySelector('.l-disc').value) || 0;
      } else {
        line.unit_cost = Number(row.querySelector('.l-price').value) || 0;
      }
      return line;
    }).filter((line) => line.item_id && line.quantity > 0);

    return node;
  };

  /** Bouton d'action sur un document, avec confirmation et rechargement. */
  SunuERP.docAction = function docAction(label, run, options = {}) {
    return h('button', {
      class: 'btn ' + (options.primary ? 'btn-primary' : options.danger ? 'btn-danger' : ''),
      onClick: async () => {
        const execute = async () => {
          try {
            const result = await run();
            toast.success(options.success || 'Opération effectuée.');
            modal.closeAll();
            if (options.after) await options.after(result);
            else await SunuERP.reload();
          } catch (err) {
            toast.error(err.message);
          }
        };
        if (options.confirm) modal.confirm(options.confirm, execute, label);
        else await execute();
      },
    }, label);
  };

  /** Affiche un document imprimable (facture, bulletin, bon). */
  SunuERP.printableModal = function printableModal(title, node, extraActions) {
    modal.open({
      title, size: 'large', body: node,
      footer: (extraActions || []).concat([
        h('button', { class: 'btn', onClick: () => modal.close() }, 'Fermer'),
        h('button', { class: 'btn btn-primary',
                      onClick: () => SunuERP.printNode(node, title) }, 'Imprimer'),
      ]),
    });
  };
})();
