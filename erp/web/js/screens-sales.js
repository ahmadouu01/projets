/* =====================================================================
   SunuERP — répertoire d'adresses et cycle de vente
   ===================================================================== */
'use strict';

(function () {
  const { h, api, fmt, toast, modal, Grid, charts } = SunuERP;
  const screens = SunuERP.screens;
  const can = SunuERP.can;

  /* ================================================================ tiers */
  async function partnerForm(an8) {
    const partner = an8 ? await api.get('/api/partners/' + an8) : null;
    const value = (key, fallback) => (partner && partner[key] !== null && partner[key] !== undefined
      ? partner[key] : fallback);
    const customer = (partner && partner.customer) || {};
    const supplier = (partner && partner.supplier) || {};

    const form = h('div', { class: 'form-grid' }, [
      SunuERP.field('Nom du tiers', h('input', { name: 'alpha_name', value: value('alpha_name', ''),
                                                 required: true }), { full: true }),
      SunuERP.field('NINEA / identifiant fiscal',
        h('input', { name: 'tax_id', value: value('tax_id', '') })),
      SunuERP.field('Téléphone', h('input', { name: 'phone', value: value('phone', '') })),
      SunuERP.field('E-mail', h('input', { name: 'email', type: 'email', value: value('email', '') })),
      SunuERP.field('Contact', h('input', { name: 'contact_name', value: value('contact_name', '') })),
      SunuERP.field('Adresse', h('input', { name: 'address', value: value('address', '') })),
      SunuERP.field('Ville', h('input', { name: 'city', value: value('city', '') })),
      SunuERP.field('Région', h('input', { name: 'region', value: value('region', '') })),
      SunuERP.field('Pays', h('input', { name: 'country', value: value('country', 'Sénégal') })),
      h('div', { class: 'field checkbox' }, [
        h('input', { type: 'checkbox', name: 'is_customer', id: 'f-cust',
                     checked: !!value('is_customer', 1) }),
        h('label', { for: 'f-cust', text: 'Ce tiers est un client' }),
      ]),
      h('div', { class: 'field checkbox' }, [
        h('input', { type: 'checkbox', name: 'is_supplier', id: 'f-supp',
                     checked: !!value('is_supplier', 0) }),
        h('label', { for: 'f-supp', text: 'Ce tiers est un fournisseur' }),
      ]),
      SunuERP.field('Conditions de règlement', SunuERP.select({ name: 'payment_terms' },
        ['COMPTANT', '15J', '30J', '45J', '60J', '90J'], customer.payment_terms || '30J')),
      SunuERP.field('Plafond d\'encours (F CFA)',
        h('input', { name: 'credit_limit', type: 'number', min: '0', step: '1000',
                     value: customer.credit_limit || 0 }),
        { hint: '0 = pas de contrôle d\'encours' }),
      SunuERP.field('Notes', h('textarea', { name: 'notes', rows: 2 }, value('notes', '')),
                    { full: true }),
    ]);

    modal.open({
      title: an8 ? `Tiers ${an8} — ${partner.alpha_name}` : 'Nouveau tiers',
      body: h('div', {}, [
        form,
        partner ? h('div', { style: 'margin-top:16px;display:flex;gap:24px;font-size:.85rem' }, [
          h('div', {}, [h('strong', {}, 'Encours client : '),
                        fmt.money(partner.balance_ar) + ' F CFA']),
          h('div', {}, [h('strong', {}, 'Dette fournisseur : '),
                        fmt.money(partner.balance_ap) + ' F CFA']),
        ]) : null,
      ]),
      footer: [
        partner && partner.is_customer ? h('button', { class: 'btn', onClick: async () => {
          modal.close();
          await customerStatement(partner.an8);
        } }, 'Relevé de compte') : null,
        h('button', { class: 'btn', onClick: () => modal.close() }, 'Annuler'),
        can('AB', 'write') ? h('button', { class: 'btn btn-primary', onClick: async () => {
          const values = SunuERP.formValues(form);
          values.an8 = an8 || null;
          values.supplier_payment_terms = values.payment_terms;
          try {
            await api.post('/api/partners', values);
            toast.success('Tiers enregistré.');
            modal.close();
            await SunuERP.reload();
          } catch (err) { toast.error(err.message); }
        } }, 'Enregistrer') : null,
      ].filter(Boolean),
    });
  }

  async function customerStatement(an8) {
    const data = await api.get(`/api/partners/${an8}/statement`);
    const node = h('div', { class: 'print-doc' }, [
      h('div', { class: 'head' }, [
        h('div', {}, [h('h2', { text: 'Relevé de compte client' }),
                      h('div', { class: 'party', text: data.partner.alpha_name }),
                      h('div', { class: 'party', text: data.partner.city || '' })]),
        h('div', { class: 'party' }, [
          h('div', { text: 'Édité le ' + fmt.date(fmt.today()) }),
          h('div', {}, [h('strong', {}, 'Solde dû : '),
                        fmt.money(data.partner.balance_ar) + ' F CFA']),
        ]),
      ]),
      h('h3', { text: 'Factures', style: 'margin:10px 0 4px;font-size:.9rem' }),
      Grid({ columns: [
        { key: 'invoice_no', label: 'Facture', mono: true },
        { key: 'invoice_date', label: 'Date', type: 'date' },
        { key: 'due_date', label: 'Échéance', type: 'date' },
        { key: 'total_ttc', label: 'Montant TTC', type: 'money' },
        { key: 'amount_paid', label: 'Réglé', type: 'money' },
        { key: 'balance', label: 'Solde', type: 'money',
          render: (row) => fmt.money(row.total_ttc - row.amount_paid) },
        { key: 'status', label: 'Statut', render: (row) => SunuERP.badge(row.status) },
      ], rows: data.invoices, empty: 'Aucune facture.' }),
      h('h3', { text: 'Règlements', style: 'margin:14px 0 4px;font-size:.9rem' }),
      Grid({ columns: [
        { key: 'receipt_no', label: 'Règlement', mono: true },
        { key: 'receipt_date', label: 'Date', type: 'date' },
        { key: 'method', label: 'Mode' },
        { key: 'reference', label: 'Référence' },
        { key: 'amount', label: 'Montant', type: 'money' },
      ], rows: data.receipts, empty: 'Aucun règlement.' }),
    ]);
    SunuERP.printableModal('Relevé — ' + data.partner.alpha_name, node);
  }

  function partnersScreen(role, title, subtitle) {
    return () => SunuERP.workWith({
      title, subtitle,
      exportName: 'tiers',
      filters: [{ key: 'search', label: 'Rechercher un tiers…' }],
      actions: can('AB', 'write')
        ? [h('button', { class: 'btn btn-primary', onClick: () => partnerForm(null) },
             '+ Nouveau tiers')] : [],
      load: (filters) => api.get('/api/partners', { search: filters.search, role }),
      columns: [
        { key: 'an8', label: 'N°', type: 'num', width: '70px' },
        { key: 'alpha_name', label: 'Nom' },
        { key: 'city', label: 'Ville' },
        { key: 'phone', label: 'Téléphone' },
        { key: 'email', label: 'E-mail' },
        { key: 'roles', label: 'Rôles', sortable: false, render: (row) => h('span', {}, [
          row.is_customer ? h('span', { class: 'badge badge-info', text: 'Client' }) : null,
          row.is_supplier ? h('span', { class: 'badge badge-muted', text: 'Fournisseur',
                                        style: 'margin-left:4px' }) : null,
          row.is_employee ? h('span', { class: 'badge badge-muted', text: 'Salarié',
                                        style: 'margin-left:4px' }) : null,
        ].filter(Boolean)) },
        { key: 'credit_limit', label: 'Plafond', type: 'money' },
      ],
      onRowClick: (row) => partnerForm(row.an8),
    });
  }

  screens.partners = partnersScreen(null, "Répertoire d'adresses",
    'Clients, fournisseurs et autres tiers, sur une fiche unique');
  screens['partners-customers'] = partnersScreen('C', 'Clients',
    'Tiers avec un compte client ouvert');
  screens['partners-suppliers'] = partnersScreen('V', 'Fournisseurs',
    'Tiers avec un compte fournisseur ouvert');

  /* ================================================================ commandes clients */
  async function newOrderForm() {
    const customerSelect = await SunuERP.partnerSelect('C', '', { name: 'customer_an8' });
    const warehouse = await SunuERP.warehouseSelect(null, { name: 'warehouse' });
    const editor = await SunuERP.lineEditor('sale');
    const header = h('div', { class: 'form-grid cols-3' }, [
      SunuERP.field('Client', customerSelect),
      SunuERP.field('Date de commande',
        h('input', { name: 'order_date', type: 'date', value: fmt.today() })),
      SunuERP.field('Livraison souhaitée', h('input', { name: 'delivery_date', type: 'date' })),
      SunuERP.field('Entrepôt de départ', warehouse),
      SunuERP.field('Référence client', h('input', { name: 'notes' }), { full: false }),
    ]);

    modal.open({
      title: 'Nouvelle commande client', size: 'large',
      body: h('div', {}, [header, h('div', { style: 'height:18px' }), editor]),
      footer: [
        h('button', { class: 'btn', onClick: () => modal.close() }, 'Annuler'),
        h('button', { class: 'btn btn-primary', onClick: async () => {
          const values = SunuERP.formValues(header);
          const lines = editor.getLines();
          if (!values.customer_an8) { toast.error('Sélectionnez un client.'); return; }
          if (!lines.length) { toast.error('Ajoutez au moins une ligne.'); return; }
          try {
            const order = await api.post('/api/sales/orders', Object.assign(values, { lines }));
            toast.success('Commande ' + order.order_no + ' créée.');
            modal.close();
            await SunuERP.reload();
            openOrder(order.id);
          } catch (err) { toast.error(err.message); }
        } }, 'Créer la commande'),
      ],
    });
  }

  async function openOrder(orderId) {
    const order = await api.get('/api/sales/orders/' + orderId);
    const writable = can('AR', 'write');

    const lines = Grid({
      columns: [
        { key: 'line_no', label: '#', type: 'num', width: '40px' },
        { key: 'item_code', label: 'Article', mono: true },
        { key: 'description', label: 'Désignation' },
        { key: 'quantity', label: 'Qté', type: 'qty' },
        { key: 'qty_shipped', label: 'Livré', type: 'qty' },
        { key: 'qty_invoiced', label: 'Facturé', type: 'qty' },
        { key: 'unit_price', label: 'PU', type: 'money' },
        { key: 'discount_pct', label: 'Rem. %', type: 'num' },
        { key: 'amount_ht', label: 'Montant HT', type: 'money' },
      ],
      rows: order.lines,
    });

    const info = h('div', { class: 'form-grid cols-3', style: 'margin-bottom:14px' }, [
      infoBlock('Client', order.customer_name),
      infoBlock('Date', fmt.date(order.order_date)),
      infoBlock('Entrepôt', order.warehouse),
      infoBlock('Statut', '', SunuERP.badge(order.status)),
      infoBlock('Total HT', fmt.money(order.total_ht) + ' F'),
      infoBlock('Total TTC', fmt.money(order.total_ttc) + ' F'),
    ]);

    const actions = [];
    if (writable && order.status === 'DRAFT') {
      actions.push(SunuERP.docAction('Confirmer', () =>
        api.post(`/api/sales/orders/${orderId}/confirm`), {
          primary: true, success: 'Commande confirmée.',
          after: () => openOrder(orderId) }));
    }
    if (writable && ['CONFIRMED', 'SHIPPED'].includes(order.status) &&
        order.lines.some((l) => l.qty_shipped < l.quantity)) {
      actions.push(SunuERP.docAction('Livrer', () =>
        api.post(`/api/sales/orders/${orderId}/ship`, { date: fmt.today() }), {
          primary: true, confirm: 'Sortir du stock les quantités restantes et générer le bon de livraison ?',
          success: 'Livraison enregistrée.', after: () => openOrder(orderId) }));
    }
    if (writable && ['CONFIRMED', 'SHIPPED'].includes(order.status) &&
        order.lines.some((l) => l.qty_invoiced < l.quantity)) {
      actions.push(SunuERP.docAction('Facturer', () =>
        api.post(`/api/sales/orders/${orderId}/invoice`, { date: fmt.today() }), {
          primary: true, confirm: 'Générer la facture des quantités livrées ?',
          success: 'Facture générée.',
          after: async (invoice) => { await SunuERP.reload(); openInvoice(invoice.id); } }));
    }
    if (writable && ['DRAFT', 'CONFIRMED'].includes(order.status)) {
      actions.push(SunuERP.docAction('Annuler la commande', () =>
        api.post(`/api/sales/orders/${orderId}/cancel`), {
          danger: true, confirm: 'Annuler définitivement cette commande ?',
          success: 'Commande annulée.' }));
    }

    modal.open({
      title: `Commande ${order.order_no}`, size: 'large',
      body: h('div', {}, [
        info, lines,
        order.shipments.length ? h('div', { style: 'margin-top:16px' }, [
          h('h4', { text: 'Livraisons', style: 'font-size:.9rem;margin-bottom:6px' }),
          Grid({ columns: [
            { key: 'ship_no', label: 'Bon', mono: true },
            { key: 'ship_date', label: 'Date', type: 'date' },
            { key: 'cogs_amount', label: 'Coût des ventes', type: 'money' },
          ], rows: order.shipments }),
        ]) : null,
        order.invoices.length ? h('div', { style: 'margin-top:16px' }, [
          h('h4', { text: 'Factures', style: 'font-size:.9rem;margin-bottom:6px' }),
          Grid({ columns: [
            { key: 'invoice_no', label: 'Facture', mono: true },
            { key: 'invoice_date', label: 'Date', type: 'date' },
            { key: 'total_ttc', label: 'TTC', type: 'money' },
            { key: 'status', label: 'Statut', render: (row) => SunuERP.badge(row.status) },
          ], rows: order.invoices, onRowClick: (row) => { modal.close(); openInvoice(row.id); } }),
        ]) : null,
      ]),
      footer: actions.concat([h('button', { class: 'btn', onClick: () => modal.close() }, 'Fermer')]),
    });
  }

  function infoBlock(label, value, node) {
    return h('div', {}, [
      h('div', { style: 'font-size:.74rem;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3);font-weight:600',
                 text: label }),
      node || h('div', { style: 'font-weight:600;margin-top:2px', text: value }),
    ]);
  }

  screens['sales-orders'] = () => SunuERP.workWith({
    title: 'Commandes clients', subtitle: 'Du devis à la facturation',
    exportName: 'commandes-clients',
    filters: [
      { key: 'search', label: 'N° de commande ou client…' },
      { key: 'status', type: 'select', label: 'Statut',
        options: [{ value: '', label: 'Tous les statuts' }, { value: 'DRAFT', label: 'Brouillon' },
                  { value: 'CONFIRMED', label: 'Confirmée' }, { value: 'SHIPPED', label: 'Livrée' },
                  { value: 'INVOICED', label: 'Facturée' }, { value: 'CANCELLED', label: 'Annulée' }] },
    ],
    actions: can('AR', 'write')
      ? [h('button', { class: 'btn btn-primary', onClick: newOrderForm }, '+ Nouvelle commande')] : [],
    load: (filters) => api.get('/api/sales/orders', filters),
    columns: [
      { key: 'order_no', label: 'N°', mono: true },
      { key: 'order_date', label: 'Date', type: 'date' },
      { key: 'customer_name', label: 'Client' },
      { key: 'warehouse', label: 'Entrepôt' },
      { key: 'total_ht', label: 'Total HT', type: 'money' },
      { key: 'total_ttc', label: 'Total TTC', type: 'money' },
      { key: 'status', label: 'Statut', render: (row) => SunuERP.badge(row.status) },
    ],
    onRowClick: (row) => openOrder(row.id),
  });

  /* ================================================================ factures clients */
  async function openInvoice(invoiceId) {
    const invoice = await api.get('/api/sales/invoices/' + invoiceId);
    const company = SunuERP.state.company || {};
    const node = h('div', { class: 'print-doc' }, [
      h('div', { class: 'head' }, [
        h('div', {}, [
          h('h2', { text: 'Facture ' + invoice.invoice_no }),
          h('div', { class: 'party', text: company.name || '' }),
          h('div', { class: 'party', text: (company.address || '') + ' — ' + (company.city || '') }),
          h('div', { class: 'party', text: 'NINEA ' + (company.tax_id || '') }),
        ]),
        h('div', { class: 'party', style: 'text-align:right' }, [
          h('div', {}, [h('strong', {}, 'Client : '), invoice.customer_name]),
          h('div', { text: invoice.city || '' }),
          h('div', { text: 'NINEA ' + (invoice.tax_id || '—') }),
          h('div', { text: 'Date : ' + fmt.date(invoice.invoice_date) }),
          h('div', { text: 'Échéance : ' + fmt.date(invoice.due_date) }),
          invoice.order_no ? h('div', { text: 'Commande : ' + invoice.order_no }) : null,
        ]),
      ]),
      h('table', {}, [
        h('thead', {}, h('tr', {}, [h('th', {}, 'Référence'), h('th', {}, 'Désignation'),
          h('th', { style: 'text-align:right' }, 'Qté'),
          h('th', { style: 'text-align:right' }, 'PU HT'),
          h('th', { style: 'text-align:right' }, 'TVA'),
          h('th', { style: 'text-align:right' }, 'Montant HT')])),
        h('tbody', {}, invoice.lines.map((line) => h('tr', {}, [
          h('td', { class: 'mono', text: line.item_code || '' }),
          h('td', { text: line.description }),
          h('td', { style: 'text-align:right', text: fmt.qty(line.quantity) }),
          h('td', { style: 'text-align:right', text: fmt.money(line.unit_price) }),
          h('td', { style: 'text-align:right', text: fmt.pct(line.vat_rate) }),
          h('td', { style: 'text-align:right', text: fmt.money(line.amount_ht) }),
        ]))),
      ]),
      h('table', { class: 'totals' }, h('tbody', {}, [
        h('tr', {}, [h('td', {}, 'Total HT'), h('td', {}, fmt.money(invoice.total_ht) + ' F CFA')]),
        h('tr', {}, [h('td', {}, 'TVA'), h('td', {}, fmt.money(invoice.total_vat) + ' F CFA')]),
        h('tr', {}, [h('td', {}, h('strong', {}, 'Total TTC')),
                     h('td', {}, h('strong', {}, fmt.money(invoice.total_ttc) + ' F CFA'))]),
        h('tr', {}, [h('td', {}, 'Déjà réglé'), h('td', {}, fmt.money(invoice.amount_paid) + ' F CFA')]),
        h('tr', {}, [h('td', {}, h('strong', {}, 'Reste à payer')),
                     h('td', {}, h('strong', {}, fmt.money(invoice.balance) + ' F CFA'))]),
      ])),
      invoice.applications.length ? h('div', {}, [
        h('h4', { text: 'Règlements imputés', style: 'font-size:.85rem;margin:14px 0 4px' }),
        Grid({ columns: [
          { key: 'receipt_no', label: 'Règlement', mono: true },
          { key: 'receipt_date', label: 'Date', type: 'date' },
          { key: 'method', label: 'Mode' },
          { key: 'amount', label: 'Montant', type: 'money' },
        ], rows: invoice.applications }),
      ]) : null,
      h('p', { style: 'margin-top:18px;font-size:.78rem;color:var(--ink-3)',
               text: "Facture établie en francs CFA. TVA au taux de 18 %. " +
                     "Paiement par virement, chèque, Wave ou Orange Money." }),
    ]);

    const extra = [];
    if (can('AR', 'write') && invoice.balance > 0) {
      extra.push(h('button', { class: 'btn', onClick: () => {
        modal.close();
        receiptForm(invoice.customer_an8, invoice.balance);
      } }, 'Encaisser'));
    }
    SunuERP.printableModal('Facture ' + invoice.invoice_no, node, extra);
  }
  SunuERP.screensSales = { openInvoice, openOrder };

  screens['sales-invoices'] = () => SunuERP.workWith({
    title: 'Factures clients', subtitle: 'Factures émises et suivi des règlements',
    exportName: 'factures-clients',
    filters: [
      { key: 'search', label: 'N° de facture ou client…' },
      { key: 'status', type: 'select', label: 'Statut',
        options: [{ value: '', label: 'Toutes' }, { value: 'OPEN', label: 'À régler' },
                  { value: 'PAID', label: 'Réglées' }] },
    ],
    load: (filters) => api.get('/api/sales/invoices', filters),
    columns: [
      { key: 'invoice_no', label: 'Facture', mono: true },
      { key: 'invoice_date', label: 'Date', type: 'date' },
      { key: 'customer_name', label: 'Client' },
      { key: 'due_date', label: 'Échéance', type: 'date' },
      { key: 'total_ttc', label: 'TTC', type: 'money' },
      { key: 'amount_paid', label: 'Réglé', type: 'money' },
      { key: 'balance', label: 'Solde', type: 'money' },
      { key: 'status', label: 'Statut', render: (row) => SunuERP.badge(row.status) },
    ],
    onRowClick: (row) => openInvoice(row.id),
  });

  /* ================================================================ encaissements */
  async function receiptForm(customerAn8, amount) {
    const customerSelect = await SunuERP.partnerSelect('C', customerAn8 || '',
      { name: 'customer_an8' });
    const form = h('div', { class: 'form-grid' }, [
      SunuERP.field('Client', customerSelect, { full: true }),
      SunuERP.field('Date', h('input', { name: 'date', type: 'date', value: fmt.today() })),
      SunuERP.field('Montant encaissé (F CFA)',
        h('input', { name: 'amount', type: 'number', min: '1', step: '1',
                     value: amount ? Math.round(amount) : '' })),
      SunuERP.field('Mode de règlement', SunuERP.select({ name: 'method' },
        ['VIREMENT', 'CHEQUE', 'ESPECES', 'WAVE', 'OM'], 'VIREMENT')),
      SunuERP.field('Référence', h('input', { name: 'reference' })),
    ]);
    modal.open({
      title: 'Encaissement client',
      body: h('div', {}, [form, h('p', {
        style: 'margin-top:12px;font-size:.8rem;color:var(--ink-3)',
        text: "Le règlement est imputé automatiquement sur les factures les plus anciennes, " +
              "et l'écriture de trésorerie est comptabilisée." })]),
      footer: [
        h('button', { class: 'btn', onClick: () => modal.close() }, 'Annuler'),
        h('button', { class: 'btn btn-primary', onClick: async () => {
          const values = SunuERP.formValues(form);
          try {
            await api.post('/api/sales/receipts', values);
            toast.success('Encaissement enregistré.');
            modal.close();
            await SunuERP.reload();
          } catch (err) { toast.error(err.message); }
        } }, 'Enregistrer'),
      ],
    });
  }

  screens['sales-receipts'] = () => SunuERP.workWith({
    title: 'Encaissements clients', subtitle: 'Règlements reçus et lettrage automatique',
    exportName: 'encaissements',
    filters: [],
    actions: can('AR', 'write')
      ? [h('button', { class: 'btn btn-primary', onClick: () => receiptForm() },
           '+ Nouvel encaissement')] : [],
    load: () => api.get('/api/sales/receipts'),
    columns: [
      { key: 'receipt_no', label: 'N°', mono: true },
      { key: 'receipt_date', label: 'Date', type: 'date' },
      { key: 'customer_name', label: 'Client' },
      { key: 'method', label: 'Mode' },
      { key: 'reference', label: 'Référence' },
      { key: 'amount', label: 'Montant', type: 'money' },
    ],
  });

  /* ================================================================ balance âgée */
  screens['sales-aging'] = async function aging() {
    const data = await api.get('/api/sales/aging');
    const columns = [
      { key: 'customer_name', label: 'Client' },
      { key: 'current', label: 'Non échu', type: 'money' },
      { key: 'd30', label: '1 à 30 j', type: 'money' },
      { key: 'd60', label: '31 à 60 j', type: 'money' },
      { key: 'd90', label: '61 à 90 j', type: 'money' },
      { key: 'd90p', label: '+ 90 j', type: 'money' },
      { key: 'total', label: 'Total dû', type: 'money' },
    ];
    return h('div', {}, [
      SunuERP.pageHead('Balance âgée clients', 'Encours au ' + fmt.date(data.as_of),
        [h('button', { class: 'btn', onClick: () => SunuERP.toCsv(columns, data.lines,
           'balance-agee-clients.csv') }, 'Export CSV')]),
      h('div', { class: 'grid-4', style: 'margin-bottom:16px' }, [
        ['Non échu', data.totals.current], ['Échu 1 à 30 j', data.totals.d30],
        ['Échu 31 à 90 j', data.totals.d60 + data.totals.d90], ['Échu + 90 j', data.totals.d90p],
      ].map(([label, value]) => h('div', { class: 'kpi' }, [
        h('div', { class: 'label', text: label }),
        h('div', { class: 'value' }, [fmt.money(value), h('span', { class: 'unit', text: 'F' })]),
      ]))),
      h('div', { class: 'card' }, h('div', { class: 'card-body tight' }, Grid({
        columns, rows: data.lines, maxHeight: '60vh',
        onRowClick: (row) => customerStatement(row.an8),
        footer: (rows) => h('tr', {}, [h('td', {}, 'Total général')].concat(
          ['current', 'd30', 'd60', 'd90', 'd90p', 'total'].map((key) =>
            h('td', { class: 'num', text: fmt.money(data.totals[key]) })))),
      }))),
    ]);
  };

  /* ================================================================ analyse */
  screens['sales-analysis'] = async function analysis() {
    const data = await api.get('/api/sales/analysis', { fy: SunuERP.state.fy });
    return h('div', {}, [
      SunuERP.pageHead('Analyse des ventes', 'Exercice ' + data.fy),
      h('div', { class: 'card' }, [
        h('div', { class: 'card-head' }, h('h3', { text: "Chiffre d'affaires mensuel (HT)" })),
        h('div', { class: 'card-body' }, charts.groupedBars({
          categories: data.by_month.map((row) => fmt.month(row.month)),
          series: [{ label: "Chiffre d'affaires", values: data.by_month.map((r) => r.revenue) }],
        })),
      ]),
      h('div', { class: 'grid-2' }, [
        h('div', { class: 'card' }, [
          h('div', { class: 'card-head' }, h('h3', { text: 'Meilleurs clients' })),
          h('div', { class: 'card-body' }, charts.horizontalBars({
            rows: data.by_customer.map((row) => ({ label: row.customer, value: row.revenue })) })),
        ]),
        h('div', { class: 'card' }, [
          h('div', { class: 'card-head' }, h('h3', { text: 'Articles les plus vendus' })),
          h('div', { class: 'card-body tight' }, Grid({
            columns: [
              { key: 'item_code', label: 'Référence', mono: true },
              { key: 'description', label: 'Article' },
              { key: 'qty', label: 'Quantité', type: 'qty' },
              { key: 'revenue', label: 'CA HT', type: 'money' },
            ], rows: data.by_item })),
        ]),
      ]),
    ]);
  };
})();
