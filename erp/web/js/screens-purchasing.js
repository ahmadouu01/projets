/* =====================================================================
   SunuERP — cycle d'achat : commandes, réceptions, factures, règlements
   ===================================================================== */
'use strict';

(function () {
  const { h, api, fmt, toast, modal, Grid } = SunuERP;
  const screens = SunuERP.screens;
  const can = SunuERP.can;

  async function newPurchaseOrder() {
    const supplierSelect = await SunuERP.partnerSelect('V', '', { name: 'supplier_an8' });
    const warehouse = await SunuERP.warehouseSelect(null, { name: 'warehouse' });
    const editor = await SunuERP.lineEditor('purchase');
    const header = h('div', { class: 'form-grid cols-3' }, [
      SunuERP.field('Fournisseur', supplierSelect),
      SunuERP.field('Date de commande',
        h('input', { name: 'order_date', type: 'date', value: fmt.today() })),
      SunuERP.field('Livraison attendue', h('input', { name: 'expected_date', type: 'date' })),
      SunuERP.field('Entrepôt de réception', warehouse),
      SunuERP.field('Observations', h('input', { name: 'notes' })),
    ]);

    modal.open({
      title: 'Nouvelle commande fournisseur', size: 'large',
      body: h('div', {}, [header, h('div', { style: 'height:18px' }), editor]),
      footer: [
        h('button', { class: 'btn', onClick: () => modal.close() }, 'Annuler'),
        h('button', { class: 'btn btn-primary', onClick: async () => {
          const values = SunuERP.formValues(header);
          const lines = editor.getLines();
          if (!values.supplier_an8) { toast.error('Sélectionnez un fournisseur.'); return; }
          if (!lines.length) { toast.error('Ajoutez au moins une ligne.'); return; }
          try {
            const order = await api.post('/api/purchasing/orders',
                                         Object.assign(values, { lines }));
            toast.success('Commande ' + order.order_no + ' créée.');
            modal.close();
            await SunuERP.reload();
            openPurchaseOrder(order.id);
          } catch (err) { toast.error(err.message); }
        } }, 'Créer la commande'),
      ],
    });
  }

  async function openPurchaseOrder(orderId) {
    const order = await api.get('/api/purchasing/orders/' + orderId);
    const writable = can('AP', 'write');

    const info = h('div', { class: 'form-grid cols-3', style: 'margin-bottom:14px' }, [
      block('Fournisseur', order.supplier_name),
      block('Date', fmt.date(order.order_date)),
      block('Entrepôt', order.warehouse),
      block('Statut', '', SunuERP.badge(order.status)),
      block('Total HT', fmt.money(order.total_ht) + ' F'),
      block('Total TTC', fmt.money(order.total_ttc) + ' F'),
    ]);

    const lines = Grid({
      columns: [
        { key: 'line_no', label: '#', type: 'num', width: '40px' },
        { key: 'item_code', label: 'Article', mono: true },
        { key: 'description', label: 'Désignation' },
        { key: 'quantity', label: 'Qté', type: 'qty' },
        { key: 'qty_received', label: 'Reçu', type: 'qty' },
        { key: 'qty_invoiced', label: 'Facturé', type: 'qty' },
        { key: 'unit_cost', label: 'Coût unitaire', type: 'money' },
        { key: 'amount_ht', label: 'Montant HT', type: 'money' },
      ],
      rows: order.lines,
    });

    const actions = [];
    if (writable && order.status === 'DRAFT') {
      actions.push(SunuERP.docAction('Approuver', () =>
        api.post(`/api/purchasing/orders/${orderId}/approve`),
        { primary: true, success: 'Commande approuvée.', after: () => openPurchaseOrder(orderId) }));
    }
    if (writable && ['APPROVED', 'RECEIVED'].includes(order.status) &&
        order.lines.some((l) => l.qty_received < l.quantity)) {
      actions.push(SunuERP.docAction('Réceptionner', () =>
        api.post(`/api/purchasing/orders/${orderId}/receive`, { date: fmt.today() }),
        { primary: true, confirm: 'Entrer en stock les quantités restantes ?',
          success: 'Réception enregistrée.', after: () => openPurchaseOrder(orderId) }));
    }
    if (writable && ['APPROVED', 'RECEIVED'].includes(order.status) &&
        order.lines.some((l) => l.qty_invoiced < l.qty_received)) {
      actions.push(SunuERP.docAction('Saisir la facture', () =>
        api.post(`/api/purchasing/orders/${orderId}/invoice`, { date: fmt.today() }),
        { primary: true, confirm: 'Créer la facture fournisseur des quantités reçues ?',
          success: 'Facture enregistrée.', after: () => openPurchaseOrder(orderId) }));
    }
    if (writable && ['DRAFT', 'APPROVED'].includes(order.status)) {
      actions.push(SunuERP.docAction('Annuler', () =>
        api.post(`/api/purchasing/orders/${orderId}/cancel`),
        { danger: true, confirm: 'Annuler cette commande ?', success: 'Commande annulée.' }));
    }

    modal.open({
      title: `Commande fournisseur ${order.order_no}`, size: 'large',
      body: h('div', {}, [
        info, lines,
        order.receipts.length ? h('div', { style: 'margin-top:16px' }, [
          h('h4', { text: 'Réceptions', style: 'font-size:.9rem;margin-bottom:6px' }),
          Grid({ columns: [
            { key: 'receipt_no', label: 'Bon de réception', mono: true },
            { key: 'receipt_date', label: 'Date', type: 'date' },
            { key: 'total_value', label: 'Valeur entrée', type: 'money' },
          ], rows: order.receipts }),
        ]) : null,
        order.invoices.length ? h('div', { style: 'margin-top:16px' }, [
          h('h4', { text: 'Factures', style: 'font-size:.9rem;margin-bottom:6px' }),
          Grid({ columns: [
            { key: 'invoice_no', label: 'Facture', mono: true },
            { key: 'invoice_date', label: 'Date', type: 'date' },
            { key: 'total_ttc', label: 'TTC', type: 'money' },
            { key: 'status', label: 'Statut', render: (row) => SunuERP.badge(row.status) },
          ], rows: order.invoices, onRowClick: (row) => { modal.close(); openApInvoice(row.id); } }),
        ]) : null,
      ]),
      footer: actions.concat([h('button', { class: 'btn', onClick: () => modal.close() }, 'Fermer')]),
    });
  }

  function block(label, value, node) {
    return h('div', {}, [
      h('div', { style: 'font-size:.74rem;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3);font-weight:600',
                 text: label }),
      node || h('div', { style: 'font-weight:600;margin-top:2px', text: value }),
    ]);
  }

  screens['purchase-orders'] = () => SunuERP.workWith({
    title: 'Commandes fournisseurs', subtitle: 'Approbation, réception et facturation',
    exportName: 'commandes-achats',
    filters: [
      { key: 'search', label: 'N° ou fournisseur…' },
      { key: 'status', type: 'select', label: 'Statut',
        options: [{ value: '', label: 'Tous les statuts' }, { value: 'DRAFT', label: 'Brouillon' },
                  { value: 'APPROVED', label: 'Approuvée' }, { value: 'RECEIVED', label: 'Réceptionnée' },
                  { value: 'INVOICED', label: 'Facturée' }, { value: 'CANCELLED', label: 'Annulée' }] },
    ],
    actions: can('AP', 'write')
      ? [h('button', { class: 'btn btn-primary', onClick: newPurchaseOrder }, '+ Nouvelle commande')]
      : [],
    load: (filters) => api.get('/api/purchasing/orders', filters),
    columns: [
      { key: 'order_no', label: 'N°', mono: true },
      { key: 'order_date', label: 'Date', type: 'date' },
      { key: 'supplier_name', label: 'Fournisseur' },
      { key: 'warehouse', label: 'Entrepôt' },
      { key: 'total_ht', label: 'Total HT', type: 'money' },
      { key: 'total_ttc', label: 'Total TTC', type: 'money' },
      { key: 'status', label: 'Statut', render: (row) => SunuERP.badge(row.status) },
    ],
    onRowClick: (row) => openPurchaseOrder(row.id),
  });

  /* ---------------------------------------------------------------- factures */
  async function openApInvoice(invoiceId) {
    const invoice = await api.get('/api/purchasing/invoices/' + invoiceId);
    const node = h('div', { class: 'print-doc' }, [
      h('div', { class: 'head' }, [
        h('div', {}, [h('h2', { text: 'Facture fournisseur ' + invoice.invoice_no }),
                      h('div', { class: 'party', text: invoice.supplier_name }),
                      invoice.supplier_ref
                        ? h('div', { class: 'party', text: 'Référence : ' + invoice.supplier_ref })
                        : null]),
        h('div', { class: 'party', style: 'text-align:right' }, [
          h('div', { text: 'Date : ' + fmt.date(invoice.invoice_date) }),
          h('div', { text: 'Échéance : ' + fmt.date(invoice.due_date) }),
          invoice.order_no ? h('div', { text: 'Commande : ' + invoice.order_no }) : null,
        ]),
      ]),
      Grid({ columns: [
        { key: 'item_code', label: 'Article', mono: true },
        { key: 'description', label: 'Désignation' },
        { key: 'quantity', label: 'Qté', type: 'qty' },
        { key: 'unit_cost', label: 'PU', type: 'money' },
        { key: 'vat_rate', label: 'TVA', type: 'pct' },
        { key: 'amount_ht', label: 'Montant HT', type: 'money' },
        { key: 'account_code', label: 'Compte', mono: true },
      ], rows: invoice.lines }),
      h('table', { class: 'totals' }, h('tbody', {}, [
        h('tr', {}, [h('td', {}, 'Total HT'), h('td', {}, fmt.money(invoice.total_ht) + ' F CFA')]),
        h('tr', {}, [h('td', {}, 'TVA récupérable'),
                     h('td', {}, fmt.money(invoice.total_vat) + ' F CFA')]),
        h('tr', {}, [h('td', {}, h('strong', {}, 'Total TTC')),
                     h('td', {}, h('strong', {}, fmt.money(invoice.total_ttc) + ' F CFA'))]),
        h('tr', {}, [h('td', {}, 'Réglé'), h('td', {}, fmt.money(invoice.amount_paid) + ' F CFA')]),
        h('tr', {}, [h('td', {}, h('strong', {}, 'Reste dû')),
                     h('td', {}, h('strong', {}, fmt.money(invoice.balance) + ' F CFA'))]),
      ])),
    ]);
    const extra = [];
    if (can('AP', 'write') && invoice.balance > 0) {
      extra.push(h('button', { class: 'btn', onClick: () => {
        modal.close();
        paymentForm(invoice.supplier_an8, invoice.balance);
      } }, 'Payer'));
    }
    SunuERP.printableModal('Facture ' + invoice.invoice_no, node, extra);
  }

  async function expenseInvoiceForm() {
    const supplierSelect = await SunuERP.partnerSelect('V', '', { name: 'supplier_an8' });
    const accounts = await api.get('/api/gl/accounts', { postable: 1 });
    const charges = accounts.filter((a) => a.account_type === 'CHARGE');
    const accountSelect = SunuERP.select({ name: 'account_code' },
      charges.map((a) => ({ value: a.code, label: `${a.code} — ${a.name}` })), '622000');

    const form = h('div', { class: 'form-grid' }, [
      SunuERP.field('Fournisseur', supplierSelect, { full: true }),
      SunuERP.field('Date de facture',
        h('input', { name: 'invoice_date', type: 'date', value: fmt.today() })),
      SunuERP.field('Référence fournisseur', h('input', { name: 'supplier_ref' })),
      SunuERP.field('Libellé', h('input', { name: 'description', value: '' }), { full: true }),
      SunuERP.field('Compte de charge', accountSelect),
      SunuERP.field('Montant HT (F CFA)',
        h('input', { name: 'amount_ht', type: 'number', min: '1', step: '1' })),
      SunuERP.field('Taux de TVA (%)',
        h('input', { name: 'vat_rate', type: 'number', value: 18, min: '0', max: '30' })),
    ]);
    modal.open({
      title: 'Facture fournisseur sans commande',
      body: h('div', {}, [form, h('p', {
        style: 'margin-top:12px;font-size:.8rem;color:var(--ink-3)',
        text: 'Pour les charges externes : loyer, électricité, honoraires, transport…' })]),
      footer: [
        h('button', { class: 'btn', onClick: () => modal.close() }, 'Annuler'),
        h('button', { class: 'btn btn-primary', onClick: async () => {
          const values = SunuERP.formValues(form);
          try {
            await api.post('/api/purchasing/invoices', {
              supplier_an8: values.supplier_an8, invoice_date: values.invoice_date,
              supplier_ref: values.supplier_ref, description: values.description,
              lines: [{ description: values.description || 'Charges externes',
                        amount_ht: values.amount_ht, vat_rate: values.vat_rate,
                        account_code: values.account_code }],
            });
            toast.success('Facture enregistrée et comptabilisée.');
            modal.close();
            await SunuERP.reload();
          } catch (err) { toast.error(err.message); }
        } }, 'Enregistrer'),
      ],
    });
  }

  screens['purchase-invoices'] = () => SunuERP.workWith({
    title: 'Factures fournisseurs', subtitle: 'Dettes à régler et historique',
    exportName: 'factures-achats',
    filters: [
      { key: 'search', label: 'N°, référence ou fournisseur…' },
      { key: 'status', type: 'select', label: 'Statut',
        options: [{ value: '', label: 'Toutes' }, { value: 'OPEN', label: 'À régler' },
                  { value: 'PAID', label: 'Réglées' }] },
    ],
    actions: can('AP', 'write')
      ? [h('button', { class: 'btn btn-primary', onClick: expenseInvoiceForm },
           '+ Facture de charges')] : [],
    load: (filters) => api.get('/api/purchasing/invoices', filters),
    columns: [
      { key: 'invoice_no', label: 'Facture', mono: true },
      { key: 'supplier_ref', label: 'Réf. fournisseur' },
      { key: 'invoice_date', label: 'Date', type: 'date' },
      { key: 'supplier_name', label: 'Fournisseur' },
      { key: 'due_date', label: 'Échéance', type: 'date' },
      { key: 'total_ttc', label: 'TTC', type: 'money' },
      { key: 'balance', label: 'Reste dû', type: 'money' },
      { key: 'status', label: 'Statut', render: (row) => SunuERP.badge(row.status) },
    ],
    onRowClick: (row) => openApInvoice(row.id),
  });

  /* ---------------------------------------------------------------- règlements */
  async function paymentForm(supplierAn8, amount) {
    const supplierSelect = await SunuERP.partnerSelect('V', supplierAn8 || '',
      { name: 'supplier_an8' });
    const form = h('div', { class: 'form-grid' }, [
      SunuERP.field('Fournisseur', supplierSelect, { full: true }),
      SunuERP.field('Date', h('input', { name: 'date', type: 'date', value: fmt.today() })),
      SunuERP.field('Montant (F CFA)', h('input', { name: 'amount', type: 'number', min: '1',
                                                    step: '1', value: amount ? Math.round(amount) : '' })),
      SunuERP.field('Mode de règlement', SunuERP.select({ name: 'method' },
        ['VIREMENT', 'CHEQUE', 'ESPECES', 'WAVE', 'OM'], 'VIREMENT')),
      SunuERP.field('Référence', h('input', { name: 'reference' })),
    ]);
    modal.open({
      title: 'Règlement fournisseur',
      body: form,
      footer: [
        h('button', { class: 'btn', onClick: () => modal.close() }, 'Annuler'),
        h('button', { class: 'btn btn-primary', onClick: async () => {
          try {
            await api.post('/api/purchasing/payments', SunuERP.formValues(form));
            toast.success('Règlement enregistré.');
            modal.close();
            await SunuERP.reload();
          } catch (err) { toast.error(err.message); }
        } }, 'Enregistrer'),
      ],
    });
  }

  screens['purchase-payments'] = () => SunuERP.workWith({
    title: 'Règlements fournisseurs', subtitle: 'Décaissements et lettrage',
    exportName: 'reglements',
    filters: [],
    actions: can('AP', 'write')
      ? [h('button', { class: 'btn btn-primary', onClick: () => paymentForm() },
           '+ Nouveau règlement')] : [],
    load: () => api.get('/api/purchasing/payments'),
    columns: [
      { key: 'payment_no', label: 'N°', mono: true },
      { key: 'payment_date', label: 'Date', type: 'date' },
      { key: 'supplier_name', label: 'Fournisseur' },
      { key: 'method', label: 'Mode' },
      { key: 'reference', label: 'Référence' },
      { key: 'amount', label: 'Montant', type: 'money' },
    ],
  });

  screens['purchase-aging'] = async function apAging() {
    const data = await api.get('/api/purchasing/aging');
    const columns = [
      { key: 'supplier_name', label: 'Fournisseur' },
      { key: 'current', label: 'Non échu', type: 'money' },
      { key: 'd30', label: '1 à 30 j', type: 'money' },
      { key: 'd60', label: '31 à 60 j', type: 'money' },
      { key: 'd90', label: '61 à 90 j', type: 'money' },
      { key: 'd90p', label: '+ 90 j', type: 'money' },
      { key: 'total', label: 'Total dû', type: 'money' },
    ];
    return h('div', {}, [
      SunuERP.pageHead('Balance âgée fournisseurs', 'Dettes au ' + fmt.date(data.as_of),
        [h('button', { class: 'btn', onClick: () =>
          SunuERP.toCsv(columns, data.lines, 'balance-agee-fournisseurs.csv') }, 'Export CSV')]),
      h('div', { class: 'card' }, h('div', { class: 'card-body tight' }, Grid({
        columns, rows: data.lines, maxHeight: '65vh',
        footer: () => h('tr', {}, [h('td', {}, 'Total général')].concat(
          ['current', 'd30', 'd60', 'd90', 'd90p', 'total'].map((key) =>
            h('td', { class: 'num', text: fmt.money(data.totals[key]) })))),
      }))),
    ]);
  };
})();
