/* =====================================================================
   SunuERP — comptabilité générale
   ===================================================================== */
'use strict';

(function () {
  const { h, api, fmt, toast, modal, Grid } = SunuERP;
  const screens = SunuERP.screens;
  const can = SunuERP.can;

  async function accountOptions(postableOnly = true) {
    if (!SunuERP.state.cache.accounts) {
      SunuERP.state.cache.accounts = await api.get('/api/gl/accounts',
        postableOnly ? { postable: 1 } : {});
    }
    return SunuERP.state.cache.accounts;
  }

  const BATCH_TYPES = {
    G: 'Saisie manuelle', V: 'Ventes', A: 'Achats', S: 'Stocks',
    P: 'Paie', T: 'Trésorerie',
  };

  /* ---------------------------------------------------------------- lots */
  async function openBatch(batchId) {
    const batch = await api.get('/api/gl/batches/' + batchId);
    const actions = [];
    if (can('GL', 'post') && batch.status === 'DRAFT') {
      actions.push(SunuERP.docAction('Comptabiliser', () =>
        api.post(`/api/gl/batches/${batchId}/post`),
        { primary: true, confirm: 'Comptabiliser définitivement ce lot ?',
          success: 'Lot comptabilisé.' }));
      actions.push(SunuERP.docAction('Annuler le lot', () =>
        api.post(`/api/gl/batches/${batchId}/void`),
        { danger: true, confirm: 'Annuler ce lot non comptabilisé ?', success: 'Lot annulé.' }));
    }
    if (can('GL', 'post') && batch.status === 'POSTED') {
      actions.push(SunuERP.docAction('Contrepasser', () =>
        api.post(`/api/gl/batches/${batchId}/reverse`, { date: fmt.today() }),
        { confirm: "Générer l'écriture inverse à la date du jour ?",
          success: 'Contrepassation comptabilisée.' }));
    }

    modal.open({
      title: `Lot ${batch.batch_no} — ${BATCH_TYPES[batch.batch_type] || batch.batch_type}`,
      size: 'large',
      body: h('div', {}, [
        h('div', { class: 'form-grid cols-3', style: 'margin-bottom:14px' }, [
          field('Libellé', batch.description),
          field('Date', fmt.date(batch.doc_date)),
          field('Exercice / période', `${batch.fy} — période ${batch.period}`),
          field('Statut', '', SunuERP.badge(batch.status)),
          field('Total débit', fmt.money(batch.total_debit) + ' F'),
          field('Total crédit', fmt.money(batch.total_credit) + ' F'),
          field('Créé par', batch.created_by || '—'),
          field('Comptabilisé par', batch.posted_by || '—'),
          field('Origine', batch.source || 'Saisie'),
        ]),
        Grid({ columns: [
          { key: 'line_no', label: '#', type: 'num', width: '40px' },
          { key: 'account_code', label: 'Compte', mono: true },
          { key: 'account_name', label: 'Intitulé' },
          { key: 'description', label: 'Libellé' },
          { key: 'business_unit', label: 'Centre' },
          { key: 'debit', label: 'Débit', type: 'money' },
          { key: 'credit', label: 'Crédit', type: 'money' },
        ], rows: batch.lines }),
      ]),
      footer: actions.concat([h('button', { class: 'btn', onClick: () => modal.close() }, 'Fermer')]),
    });
  }

  function field(label, value, node) {
    return h('div', {}, [
      h('div', { style: 'font-size:.74rem;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3);font-weight:600',
                 text: label }),
      node || h('div', { style: 'font-weight:600;margin-top:2px', text: value || '—' }),
    ]);
  }

  screens['gl-batches'] = () => SunuERP.workWith({
    title: "Lots d'écritures", subtitle: 'Brouillard et écritures comptabilisées',
    exportName: 'lots-ecritures',
    filters: [
      { key: 'status', type: 'select', label: 'Statut', options: [
        { value: '', label: 'Tous' }, { value: 'DRAFT', label: 'À comptabiliser' },
        { value: 'POSTED', label: 'Comptabilisés' }, { value: 'VOID', label: 'Annulés' }] },
      { key: 'type', type: 'select', label: 'Journal', options: [
        { value: '', label: 'Tous les journaux' }].concat(
        Object.entries(BATCH_TYPES).map(([value, label]) => ({ value, label }))) },
    ],
    actions: can('GL', 'write')
      ? [h('button', { class: 'btn btn-primary', onClick: () => { location.hash = '#/gl-entry'; } },
           '+ Saisir une écriture')] : [],
    load: (filters) => api.get('/api/gl/batches', Object.assign({ fy: SunuERP.state.fy }, filters)),
    columns: [
      { key: 'batch_no', label: 'Lot', mono: true },
      { key: 'doc_date', label: 'Date', type: 'date' },
      { key: 'batch_type', label: 'Journal', render: (row) =>
        BATCH_TYPES[row.batch_type] || row.batch_type },
      { key: 'description', label: 'Libellé' },
      { key: 'lines', label: 'Lignes', type: 'num' },
      { key: 'total_debit', label: 'Débit', type: 'money' },
      { key: 'total_credit', label: 'Crédit', type: 'money' },
      { key: 'status', label: 'Statut', render: (row) => SunuERP.badge(row.status) },
    ],
    onRowClick: (row) => openBatch(row.id),
  });

  /* ---------------------------------------------------------------- saisie */
  screens['gl-entry'] = async function entryScreen() {
    const accounts = await accountOptions();
    const options = accounts.map((account) => ({
      value: account.code, label: `${account.code} — ${account.name}` }));

    const body = h('tbody', {});
    const totalDebit = h('span', { text: '0' });
    const totalCredit = h('span', { text: '0' });
    const balanceInfo = h('div', { class: 'badge badge-warn', text: 'Lot déséquilibré' });

    function recalc() {
      let debit = 0, credit = 0;
      body.querySelectorAll('tr').forEach((row) => {
        debit += Number(row.querySelector('.e-debit').value) || 0;
        credit += Number(row.querySelector('.e-credit').value) || 0;
      });
      totalDebit.textContent = fmt.money(debit) + ' F';
      totalCredit.textContent = fmt.money(credit) + ' F';
      const balanced = Math.round(debit) === Math.round(credit) && debit > 0;
      balanceInfo.className = 'badge ' + (balanced ? 'badge-good' : 'badge-warn');
      balanceInfo.textContent = balanced ? 'Lot équilibré'
        : `Écart : ${fmt.money(Math.abs(debit - credit))} F`;
    }

    function addLine() {
      const account = SunuERP.select({ class: 'e-account' },
        [{ value: '', label: '— Compte —' }].concat(options));
      const description = h('input', { class: 'e-desc', placeholder: 'Libellé de la ligne' });
      const debit = h('input', { class: 'e-debit', type: 'number', step: '1', min: '0', value: 0 });
      const credit = h('input', { class: 'e-credit', type: 'number', step: '1', min: '0', value: 0 });
      debit.addEventListener('input', () => { if (Number(debit.value) > 0) credit.value = 0; recalc(); });
      credit.addEventListener('input', () => { if (Number(credit.value) > 0) debit.value = 0; recalc(); });
      const row = h('tr', {}, [
        h('td', { style: 'min-width:280px' }, account),
        h('td', {}, description),
        h('td', { class: 'num', style: 'width:130px' }, debit),
        h('td', { class: 'num', style: 'width:130px' }, credit),
        h('td', { style: 'width:30px' }, h('button', { class: 'line-remove', type: 'button',
          onClick: () => { row.remove(); recalc(); } }, '×')),
      ]);
      body.appendChild(row);
      recalc();
    }
    addLine(); addLine();

    const header = h('div', { class: 'form-grid cols-3' }, [
      SunuERP.field('Date de l\'écriture',
        h('input', { name: 'date', type: 'date', value: fmt.today() })),
      SunuERP.field('Journal', SunuERP.select({ name: 'batch_type' },
        Object.entries(BATCH_TYPES).map(([value, label]) => ({ value, label })), 'G')),
      SunuERP.field('Libellé du lot', h('input', { name: 'description',
        value: 'Écriture diverse' })),
    ]);

    async function submit(post) {
      const values = SunuERP.formValues(header);
      const lines = Array.from(body.querySelectorAll('tr')).map((row) => ({
        account: row.querySelector('.e-account').value,
        description: row.querySelector('.e-desc').value,
        debit: Number(row.querySelector('.e-debit').value) || 0,
        credit: Number(row.querySelector('.e-credit').value) || 0,
      })).filter((line) => line.account && (line.debit > 0 || line.credit > 0));
      if (!lines.length) { toast.error('Saisissez au moins une ligne mouvementée.'); return; }
      try {
        const batch = await api.post('/api/gl/batches', Object.assign(values, { lines, post }));
        toast.success(post ? 'Écriture comptabilisée.' : 'Écriture enregistrée en brouillard.');
        location.hash = '#/gl-batches';
        setTimeout(() => openBatch(batch.id), 300);
      } catch (err) { toast.error(err.message); }
    }

    return h('div', {}, [
      SunuERP.pageHead('Saisie d\'écriture', 'Écriture en partie double, contrôlée à l\'équilibre'),
      h('div', { class: 'card' }, [
        h('div', { class: 'card-body' }, [
          header,
          h('div', { style: 'height:16px' }),
          h('table', { class: 'lines' }, [
            h('thead', {}, h('tr', {}, [h('th', {}, 'Compte'), h('th', {}, 'Libellé'),
                                        h('th', {}, 'Débit'), h('th', {}, 'Crédit'), h('th', {}, '')])),
            body,
          ]),
          h('div', { style: 'display:flex;gap:16px;align-items:center;margin-top:12px' }, [
            h('button', { class: 'btn btn-sm', type: 'button', onClick: addLine },
              '+ Ajouter une ligne'),
            balanceInfo,
            h('div', { class: 'doc-totals', style: 'margin-left:auto' }, [
              h('div', {}, [h('span', {}, 'Total débit'), totalDebit]),
              h('div', {}, [h('span', {}, 'Total crédit'), totalCredit]),
            ]),
          ]),
        ]),
        h('div', { class: 'modal-foot', style: 'border-radius:0 0 8px 8px' }, [
          h('button', { class: 'btn', onClick: () => submit(false) }, 'Enregistrer en brouillard'),
          can('GL', 'post')
            ? h('button', { class: 'btn btn-primary', onClick: () => submit(true) },
                'Enregistrer et comptabiliser')
            : null,
        ].filter(Boolean)),
      ]),
    ]);
  };

  /* ---------------------------------------------------------------- plan comptable */
  async function accountForm(code) {
    const accounts = await accountOptions(false);
    const account = code ? accounts.find((a) => a.code === code) : null;
    const form = h('div', { class: 'form-grid' }, [
      SunuERP.field('Numéro de compte', h('input', { name: 'code', value: account ? account.code : '',
                                                     readonly: !!account })),
      SunuERP.field('Intitulé', h('input', { name: 'name', value: account ? account.name : '' })),
      SunuERP.field('Type', SunuERP.select({ name: 'account_type' },
        [{ value: 'ACTIF', label: 'Actif' }, { value: 'PASSIF', label: 'Passif' },
         { value: 'CAPITAUX', label: 'Capitaux propres' }, { value: 'PRODUIT', label: 'Produit' },
         { value: 'CHARGE', label: 'Charge' }], account ? account.account_type : 'CHARGE')),
      h('div', { class: 'field checkbox' }, [
        h('input', { type: 'checkbox', name: 'postable', id: 'acc-post',
                     checked: account ? !!account.postable : true }),
        h('label', { for: 'acc-post', text: 'Compte mouvementable' }),
      ]),
    ]);
    modal.open({
      title: account ? 'Compte ' + account.code : 'Nouveau compte', body: form,
      footer: [
        h('button', { class: 'btn', onClick: () => modal.close() }, 'Fermer'),
        can('GL', 'write') ? h('button', { class: 'btn btn-primary', onClick: async () => {
          try {
            await api.post('/api/gl/accounts', SunuERP.formValues(form));
            SunuERP.state.cache.accounts = null;
            toast.success('Compte enregistré.');
            modal.close();
            await SunuERP.reload();
          } catch (err) { toast.error(err.message); }
        } }, 'Enregistrer') : null,
      ].filter(Boolean),
    });
  }

  screens['gl-accounts'] = () => SunuERP.workWith({
    title: 'Plan comptable', subtitle: 'Référentiel SYSCOHADA de la société',
    exportName: 'plan-comptable',
    filters: [{ key: 'search', label: 'Numéro ou intitulé…' }],
    actions: can('GL', 'write')
      ? [h('button', { class: 'btn btn-primary', onClick: () => accountForm(null) },
           '+ Nouveau compte')] : [],
    load: (filters) => api.get('/api/gl/accounts', filters),
    columns: [
      { key: 'code', label: 'Compte', mono: true },
      { key: 'name', label: 'Intitulé' },
      { key: 'account_type', label: 'Type' },
      { key: 'class', label: 'Classe', type: 'num' },
      { key: 'postable', label: 'Mouvementable',
        render: (row) => (row.postable ? 'Oui' : 'Non') },
    ],
    onRowClick: (row) => accountForm(row.code),
  });

  /* ---------------------------------------------------------------- balance */
  screens['gl-trial-balance'] = async function trialBalance() {
    const periodSelect = SunuERP.select({}, [{ value: '', label: 'Exercice complet' }].concat(
      Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: 'Jusqu\'à la période ' + (i + 1) }))));
    const draftToggle = SunuERP.select({}, [
      { value: '0', label: 'Écritures comptabilisées' },
      { value: '1', label: 'Y compris le brouillard' }], '0');

    const holder = h('div', { class: 'card-body tight' });
    async function load() {
      holder.innerHTML = '';
      holder.appendChild(h('div', { class: 'loading', text: 'Calcul…' }));
      const data = await api.get('/api/gl/trial-balance', {
        fy: SunuERP.state.fy, period: periodSelect.value, draft: draftToggle.value });
      holder.innerHTML = '';
      holder.appendChild(Grid({
        columns: [
          { key: 'account_code', label: 'Compte', mono: true },
          { key: 'name', label: 'Intitulé' },
          { key: 'debit', label: 'Mouvements débit', type: 'money' },
          { key: 'credit', label: 'Mouvements crédit', type: 'money' },
          { key: 'balance_debit', label: 'Solde débiteur', type: 'money' },
          { key: 'balance_credit', label: 'Solde créditeur', type: 'money' },
        ],
        rows: data.lines, maxHeight: '62vh',
        onRowClick: (row) => { location.hash = '#/gl-ledger?account=' + row.account_code; },
        footer: (rows) => h('tr', {}, [
          h('td', { colspan: 2 }, 'Totaux'),
          h('td', { class: 'num', text: fmt.money(data.total_debit) }),
          h('td', { class: 'num', text: fmt.money(data.total_credit) }),
          h('td', { class: 'num', text: fmt.money(rows.reduce((s, r) => s + r.balance_debit, 0)) }),
          h('td', { class: 'num', text: fmt.money(rows.reduce((s, r) => s + r.balance_credit, 0)) }),
        ]),
      }));
    }
    periodSelect.addEventListener('change', load);
    draftToggle.addEventListener('change', load);
    const wrap = h('div', {}, [
      SunuERP.pageHead('Balance générale', 'Exercice ' + SunuERP.state.fy),
      h('div', { class: 'card' }, [
        h('div', { class: 'toolbar' }, [periodSelect, draftToggle,
          h('div', { class: 'spacer' }),
          h('button', { class: 'btn btn-sm',
                        onClick: () => SunuERP.printNode(holder, 'Balance générale') }, 'Imprimer')]),
        holder,
      ]),
    ]);
    await load();
    return wrap;
  };

  /* ---------------------------------------------------------------- grand livre */
  screens['gl-ledger'] = async function ledger() {
    const accounts = await accountOptions();
    const params = new URLSearchParams((location.hash.split('?')[1] || ''));
    const accountSelect = SunuERP.select({}, accounts.map((account) => ({
      value: account.code, label: `${account.code} — ${account.name}` })),
      params.get('account') || (accounts[0] && accounts[0].code));
    const from = h('input', { type: 'date' });
    const to = h('input', { type: 'date' });
    const holder = h('div', { class: 'card-body tight' });

    async function load() {
      holder.innerHTML = '';
      holder.appendChild(h('div', { class: 'loading', text: 'Chargement…' }));
      const rows = await api.get('/api/gl/ledger', {
        account: accountSelect.value, fy: SunuERP.state.fy,
        from: from.value, to: to.value });
      holder.innerHTML = '';
      holder.appendChild(Grid({
        columns: [
          { key: 'doc_date', label: 'Date', type: 'date' },
          { key: 'batch_no', label: 'Lot', mono: true },
          { key: 'description', label: 'Libellé' },
          { key: 'sub_id', label: 'Tiers / article' },
          { key: 'debit', label: 'Débit', type: 'money' },
          { key: 'credit', label: 'Crédit', type: 'money' },
          { key: 'running_balance', label: 'Solde progressif', type: 'money' },
          { key: 'status', label: 'Statut', render: (row) => SunuERP.badge(row.status) },
        ],
        rows, maxHeight: '62vh', empty: 'Aucun mouvement sur ce compte.',
        onRowClick: (row) => openBatch(row.batch_id),
      }));
    }
    [accountSelect, from, to].forEach((node) => node.addEventListener('change', load));
    const wrap = h('div', {}, [
      SunuERP.pageHead('Grand livre', 'Mouvements détaillés par compte'),
      h('div', { class: 'card' }, [
        h('div', { class: 'toolbar' }, [
          h('span', { style: 'font-size:.8rem;font-weight:600', text: 'Compte :' }), accountSelect,
          h('span', { style: 'font-size:.8rem', text: 'du' }), from,
          h('span', { style: 'font-size:.8rem', text: 'au' }), to,
          h('div', { class: 'spacer' }),
          h('button', { class: 'btn btn-sm',
                        onClick: () => SunuERP.printNode(holder, 'Grand livre') }, 'Imprimer'),
        ]),
        holder,
      ]),
    ]);
    await load();
    return wrap;
  };

  /* ---------------------------------------------------------------- états financiers */
  screens['gl-income'] = async function income() {
    const data = await api.get('/api/gl/income-statement', { fy: SunuERP.state.fy });
    const section = (title, rows, total) => h('div', { class: 'card' }, [
      h('div', { class: 'card-head' }, [h('h3', { text: title }),
        h('div', { class: 'actions' }, h('strong', { text: fmt.money(total) + ' F CFA' }))]),
      h('div', { class: 'card-body tight' }, Grid({
        columns: [
          { key: 'code', label: 'Compte', mono: true },
          { key: 'name', label: 'Intitulé' },
          { key: 'amount', label: 'Montant', type: 'money' },
        ], rows, empty: 'Aucun mouvement.' })),
    ]);
    const node = h('div', {}, [
      h('div', { class: 'grid-2' }, [
        section('Produits', data.products, data.total_products),
        section('Charges', data.charges, data.total_charges),
      ]),
      h('div', { class: 'card' }, h('div', { class: 'card-body',
        style: 'display:flex;justify-content:space-between;align-items:center' }, [
        h('div', {}, [
          h('div', { style: 'font-size:.8rem;color:var(--ink-3);text-transform:uppercase;letter-spacing:.06em;font-weight:600',
                     text: 'Résultat de l\'exercice' }),
          h('div', { style: 'font-size:.82rem;color:var(--ink-3)',
                     text: `Produits ${fmt.money(data.total_products)} − charges ${fmt.money(data.total_charges)}` }),
        ]),
        h('div', { style: 'font-size:1.8rem;font-weight:700;' +
                          (data.result < 0 ? 'color:var(--critical)' : ''),
                   text: fmt.money(data.result) + ' F CFA' }),
      ])),
    ]);
    return h('div', {}, [
      SunuERP.pageHead('Compte de résultat', 'Exercice ' + data.fy,
        [h('button', { class: 'btn', onClick: () => SunuERP.printNode(node, 'Compte de résultat') },
           'Imprimer')]),
      node,
    ]);
  };

  screens['gl-balance-sheet'] = async function balanceSheet() {
    const data = await api.get('/api/gl/balance-sheet', { fy: SunuERP.state.fy });
    const section = (title, rows, total) => h('div', { class: 'card' }, [
      h('div', { class: 'card-head' }, [h('h3', { text: title }),
        h('div', { class: 'actions' }, h('strong', { text: fmt.money(total) + ' F CFA' }))]),
      h('div', { class: 'card-body tight' }, Grid({
        columns: [
          { key: 'code', label: 'Compte', mono: true },
          { key: 'name', label: 'Intitulé' },
          { key: 'amount', label: 'Montant', type: 'money' },
        ], rows, empty: 'Aucun solde.' })),
    ]);
    const node = h('div', { class: 'grid-2' }, [
      section('Actif', data.assets, data.total_assets),
      h('div', {}, [
        section('Capitaux propres', data.equity.concat([{
          code: '120000', name: "Résultat de l'exercice", amount: data.result }]),
          data.total_equity + data.result),
        section('Dettes', data.liabilities, data.total_liabilities),
      ]),
    ]);
    return h('div', {}, [
      SunuERP.pageHead('Bilan', `Exercice ${data.fy} — ` +
        (data.balanced ? 'actif et passif équilibrés' : 'DÉSÉQUILIBRE À ANALYSER'),
        [h('button', { class: 'btn', onClick: () => SunuERP.printNode(node, 'Bilan') }, 'Imprimer')]),
      h('div', { class: 'grid-2', style: 'margin-bottom:16px' }, [
        h('div', { class: 'kpi' }, [h('div', { class: 'label', text: 'Total actif' }),
          h('div', { class: 'value' }, [fmt.money(data.total_assets),
            h('span', { class: 'unit', text: 'F' })])]),
        h('div', { class: 'kpi' }, [h('div', { class: 'label', text: 'Total passif et capitaux' }),
          h('div', { class: 'value' }, [fmt.money(data.total_equity_and_liabilities),
            h('span', { class: 'unit', text: 'F' })])]),
      ]),
      node,
    ]);
  };

  /* ---------------------------------------------------------------- périodes */
  screens['gl-periods'] = async function periods() {
    const rows = await api.get('/api/gl/periods');
    const holder = h('div', { class: 'card-body tight' });
    function draw(data) {
      holder.innerHTML = '';
      holder.appendChild(Grid({
        columns: [
          { key: 'fy', label: 'Exercice', type: 'num' },
          { key: 'period', label: 'Période', type: 'num' },
          { key: 'date_from', label: 'Du', type: 'date' },
          { key: 'date_to', label: 'Au', type: 'date' },
          { key: 'status', label: 'Statut', render: (row) => h('span', {
            class: 'badge badge-' + (row.status === 'OPEN' ? 'good' : 'muted'),
            text: row.status === 'OPEN' ? 'Ouverte' : 'Clôturée' }) },
          { key: 'action', label: '', sortable: false, render: (row) => can('GL', 'post')
            ? h('button', { class: 'btn btn-sm', onClick: async (event) => {
                event.stopPropagation();
                try {
                  await api.post('/api/gl/periods', { fy: row.fy, period: row.period,
                    status: row.status === 'OPEN' ? 'CLOSED' : 'OPEN' });
                  toast.success('Statut de période mis à jour.');
                  draw(await api.get('/api/gl/periods'));
                } catch (err) { toast.error(err.message); }
              } }, row.status === 'OPEN' ? 'Clôturer' : 'Rouvrir')
            : '' },
        ], rows: data, maxHeight: '64vh' }));
    }
    draw(rows);
    return h('div', {}, [
      SunuERP.pageHead('Périodes comptables',
        'Une période clôturée refuse toute nouvelle écriture',
        can('GL', 'post') ? [h('button', { class: 'btn', onClick: async () => {
          const fy = prompt('Générer le calendrier de quel exercice ?',
                            String(new Date().getFullYear() + 1));
          if (!fy) return;
          try {
            const result = await api.post('/api/gl/periods', { action: 'generate', fy: Number(fy) });
            toast.success(result.created + ' période(s) créée(s).');
            draw(await api.get('/api/gl/periods'));
          } catch (err) { toast.error(err.message); }
        } }, 'Générer un exercice')] : []),
      h('div', { class: 'card' }, holder),
    ]);
  };

  /* ---------------------------------------------------------------- comptes automatiques */
  screens['gl-mapping'] = async function mapping() {
    const data = await api.get('/api/gl/mapping');
    const accounts = await accountOptions();
    const rows = Object.entries(data.keys).map(([key, label]) => {
      const current = data.mapping.find((m) => m.key === key);
      return { key, label, account_code: current ? current.account_code : '',
               account_name: current ? current.account_name : '' };
    });
    return h('div', {}, [
      SunuERP.pageHead('Comptes automatiques',
        'Comptes utilisés par les traitements (ventes, achats, stocks, paie)'),
      h('div', { class: 'card' }, h('div', { class: 'card-body tight' }, Grid({
        columns: [
          { key: 'key', label: 'Clé', mono: true },
          { key: 'label', label: 'Usage' },
          { key: 'account_code', label: 'Compte', mono: true },
          { key: 'account_name', label: 'Intitulé' },
          { key: 'action', label: '', sortable: false, render: (row) => can('GL', 'write')
            ? h('button', { class: 'btn btn-sm', onClick: () => {
                const select = SunuERP.select({}, accounts.map((account) => ({
                  value: account.code, label: `${account.code} — ${account.name}` })),
                  row.account_code);
                modal.open({
                  title: row.label, size: 'small',
                  body: SunuERP.field('Compte à utiliser', select),
                  footer: [
                    h('button', { class: 'btn', onClick: () => modal.close() }, 'Annuler'),
                    h('button', { class: 'btn btn-primary', onClick: async () => {
                      try {
                        await api.post('/api/gl/mapping',
                                       { key: row.key, account_code: select.value });
                        toast.success('Compte mis à jour.');
                        modal.close();
                        await SunuERP.reload();
                      } catch (err) { toast.error(err.message); }
                    } }, 'Enregistrer'),
                  ],
                });
              } }, 'Modifier')
            : '' },
        ], rows, maxHeight: '68vh' }))),
    ]);
  };

  /* ---------------------------------------------------------------- intégrité */
  screens['gl-integrity'] = async function integrity() {
    const data = await api.get('/api/gl/integrity', { fy: SunuERP.state.fy });
    return h('div', {}, [
      SunuERP.pageHead("États d'intégrité",
        data.total_anomalies === 0
          ? 'Aucune anomalie détectée : les auxiliaires concordent avec le grand livre'
          : `${data.total_anomalies} anomalie(s) à analyser`),
      h('div', { class: 'card' }, h('div', { class: 'card-body' },
        data.checks.map((check) => h('div', { style: 'margin-bottom:14px' }, [
          h('div', { class: 'alert alert-' + (check.anomalies ? 'danger' : 'good') }, [
            h('span', { class: 'dot' }),
            h('span', {}, [
              h('strong', { text: check.code + ' — ' + check.label }),
              h('div', { style: 'font-size:.8rem;margin-top:2px',
                         text: check.anomalies ? check.anomalies + ' anomalie(s)'
                                               : 'Contrôle conforme' }),
            ]),
          ]),
          check.details && check.details.length
            ? h('pre', { style: 'font-size:.75rem;background:var(--surface-2);padding:8px 10px;' +
                                'border-radius:6px;overflow-x:auto;margin-top:6px',
                         text: JSON.stringify(check.details, null, 1) })
            : null,
        ])))),
    ]);
  };
})();
