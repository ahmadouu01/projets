/* =====================================================================
   SunuERP — ressources humaines et paie
   ===================================================================== */
'use strict';

(function () {
  const { h, api, fmt, toast, modal, Grid, charts } = SunuERP;
  const screens = SunuERP.screens;
  const can = SunuERP.can;

  async function employeeForm(employeeId) {
    const employee = employeeId ? await api.get('/api/hr/employees/' + employeeId) : null;
    const units = (await api.get('/api/admin/companies').catch(() => ({ business_units: [] })))
      .business_units || [];
    const get = (key, fallback) => (employee && employee[key] !== null &&
      employee[key] !== undefined ? employee[key] : fallback);

    const form = h('div', { class: 'form-grid' }, [
      SunuERP.field('Matricule', h('input', { name: 'matricule', value: get('matricule', ''),
                                              placeholder: 'attribué automatiquement' })),
      SunuERP.field('Nom', h('input', { name: 'last_name', value: get('last_name', '') })),
      SunuERP.field('Prénom', h('input', { name: 'first_name', value: get('first_name', '') })),
      SunuERP.field('Poste', h('input', { name: 'position', value: get('position', '') })),
      SunuERP.field('Centre de coût', SunuERP.select({ name: 'business_unit' },
        [{ value: '', label: '—' }].concat(units.map((u) => ({ value: u.code, label: u.name }))),
        get('business_unit', ''))),
      SunuERP.field('Type de contrat', SunuERP.select({ name: 'contract_type' },
        ['CDI', 'CDD', 'CADRE', 'STAGE'], get('contract_type', 'CDI'))),
      SunuERP.field('Date d\'embauche',
        h('input', { name: 'hire_date', type: 'date', value: get('hire_date', fmt.today()) })),
      SunuERP.field('Salaire de base (F CFA)',
        h('input', { name: 'base_salary', type: 'number', step: '1000',
                     value: get('base_salary', 0) })),
      SunuERP.field('Indemnité de logement',
        h('input', { name: 'housing_allowance', type: 'number', step: '1000',
                     value: get('housing_allowance', 0) })),
      SunuERP.field('Indemnité de transport',
        h('input', { name: 'transport_allowance', type: 'number', step: '1000',
                     value: get('transport_allowance', 0) }),
        { hint: 'Exonérée d\'impôt jusqu\'à 26 000 F CFA' }),
      SunuERP.field('Prime d\'ancienneté (%)',
        h('input', { name: 'seniority_pct', type: 'number', step: '1',
                     value: get('seniority_pct', 0) })),
      SunuERP.field('Personnes à charge',
        h('input', { name: 'dependents', type: 'number', step: '1', value: get('dependents', 0) })),
      SunuERP.field('Compte bancaire',
        h('input', { name: 'bank_account', value: get('bank_account', '') })),
      h('div', { class: 'field checkbox' }, [
        h('input', { type: 'checkbox', name: 'active', id: 'emp-active',
                     checked: !!get('active', 1) }),
        h('label', { for: 'emp-active', text: 'Salarié actif' }),
      ]),
    ]);

    const body = h('div', {}, [form]);
    if (employee && employee.payslips.length) {
      body.appendChild(h('div', { style: 'margin-top:18px' }, [
        h('h4', { text: 'Bulletins de paie', style: 'font-size:.9rem;margin-bottom:6px' }),
        Grid({ columns: [
          { key: 'period', label: 'Période', render: (row) => `${row.period}/${row.fy}` },
          { key: 'gross', label: 'Brut', type: 'money' },
          { key: 'employee_cont', label: 'Cotisations', type: 'money' },
          { key: 'income_tax', label: 'Impôts', type: 'money' },
          { key: 'net_pay', label: 'Net à payer', type: 'money' },
          { key: 'status', label: 'Campagne', render: (row) => SunuERP.badge(row.status) },
        ], rows: employee.payslips, maxHeight: '240px',
           onRowClick: (row) => { modal.close(); openPayslip(row.id); } }),
      ]));
    }

    modal.open({
      title: employee ? `${employee.last_name} ${employee.first_name}` : 'Nouveau salarié',
      size: 'large', body,
      footer: [
        h('button', { class: 'btn', onClick: () => modal.close() }, 'Fermer'),
        can('HR', 'write') ? h('button', { class: 'btn btn-primary', onClick: async () => {
          const values = SunuERP.formValues(form);
          values.id = employeeId || null;
          try {
            await api.post('/api/hr/employees', values);
            toast.success('Salarié enregistré.');
            modal.close();
            await SunuERP.reload();
          } catch (err) { toast.error(err.message); }
        } }, 'Enregistrer') : null,
      ].filter(Boolean),
    });
  }

  screens.employees = () => SunuERP.workWith({
    title: 'Salariés', subtitle: 'Dossiers du personnel et éléments de paie',
    exportName: 'salaries',
    filters: [{ key: 'search', label: 'Nom, matricule, poste…' }],
    actions: can('HR', 'write')
      ? [h('button', { class: 'btn btn-primary', onClick: () => employeeForm(null) },
           '+ Nouveau salarié')] : [],
    load: (filters) => api.get('/api/hr/employees', filters),
    columns: [
      { key: 'matricule', label: 'Matricule', mono: true },
      { key: 'last_name', label: 'Nom' },
      { key: 'first_name', label: 'Prénom' },
      { key: 'position', label: 'Poste' },
      { key: 'bu_name', label: 'Centre' },
      { key: 'contract_type', label: 'Contrat' },
      { key: 'hire_date', label: 'Embauche', type: 'date' },
      { key: 'base_salary', label: 'Salaire de base', type: 'money' },
    ],
    onRowClick: (row) => employeeForm(row.id),
  });

  /* ---------------------------------------------------------------- paie */
  async function openPayslip(payslipId) {
    const payslip = await api.get('/api/hr/payslips/' + payslipId);
    const company = SunuERP.state.company || {};
    const rows = (type) => payslip.lines.filter((line) => line.line_type === type);
    const table = (title, lines, total) => h('div', { style: 'margin-top:12px' }, [
      h('h4', { text: title, style: 'font-size:.85rem;margin-bottom:4px' }),
      h('table', {}, [
        h('thead', {}, h('tr', {}, [h('th', {}, 'Libellé'),
          h('th', { style: 'text-align:right' }, 'Base'),
          h('th', { style: 'text-align:right' }, 'Taux'),
          h('th', { style: 'text-align:right' }, 'Montant')])),
        h('tbody', {}, lines.map((line) => h('tr', {}, [
          h('td', { text: line.label }),
          h('td', { style: 'text-align:right', text: line.base ? fmt.money(line.base) : '' }),
          h('td', { style: 'text-align:right', text: line.rate ? fmt.pct(line.rate) : '' }),
          h('td', { style: 'text-align:right', text: fmt.money(line.amount) }),
        ]))),
        h('tfoot', {}, h('tr', {}, [h('td', { colspan: 3 }, h('strong', {}, 'Total')),
          h('td', { style: 'text-align:right' }, h('strong', {}, fmt.money(total)))])),
      ]),
    ]);

    const node = h('div', { class: 'print-doc' }, [
      h('div', { class: 'head' }, [
        h('div', {}, [h('h2', { text: 'Bulletin de paie' }),
          h('div', { class: 'party', text: company.name || '' }),
          h('div', { class: 'party', text: 'NINEA ' + (company.tax_id || '') })]),
        h('div', { class: 'party', style: 'text-align:right' }, [
          h('div', {}, [h('strong', {}, `${payslip.last_name} ${payslip.first_name}`)]),
          h('div', { text: 'Matricule : ' + payslip.matricule }),
          h('div', { text: payslip.position || '' }),
          h('div', { text: `Période : ${payslip.period}/${payslip.fy}` }),
          h('div', { text: 'Payé le ' + fmt.date(payslip.pay_date) }),
        ]),
      ]),
      table('Gains', rows('GAIN'), payslip.gross),
      table('Retenues salariales', rows('RETENUE'),
            payslip.employee_cont + payslip.income_tax + payslip.other_deductions),
      h('table', { class: 'totals', style: 'margin-top:14px' }, h('tbody', {}, [
        h('tr', {}, [h('td', {}, 'Salaire brut'), h('td', {}, fmt.money(payslip.gross) + ' F CFA')]),
        h('tr', {}, [h('td', {}, 'Base imposable'), h('td', {}, fmt.money(payslip.taxable) + ' F CFA')]),
        h('tr', {}, [h('td', {}, h('strong', {}, 'Net à payer')),
                     h('td', {}, h('strong', {}, fmt.money(payslip.net_pay) + ' F CFA'))]),
      ])),
      table('Charges patronales', rows('PATRONALE'), payslip.employer_cont),
      h('p', { style: 'margin-top:14px;font-size:.78rem;color:var(--ink-3)',
               text: `Coût total employeur : ${fmt.money(payslip.total_cost)} F CFA. ` +
                     'Document généré par SunuERP — à conserver sans limitation de durée.' }),
    ]);
    SunuERP.printableModal(`Bulletin ${payslip.matricule} — ${payslip.period}/${payslip.fy}`, node);
  }

  async function openRun(runId) {
    const run = await api.get('/api/hr/runs/' + runId);
    const actions = [];
    if (can('HR', 'write') && run.status === 'DRAFT') {
      actions.push(SunuERP.docAction('Valider la campagne', () =>
        api.post(`/api/hr/runs/${runId}/validate`),
        { primary: true, success: 'Campagne validée.', after: () => openRun(runId) }));
    }
    if (can('HR', 'post') && run.status === 'VALIDATED') {
      actions.push(SunuERP.docAction('Comptabiliser', () =>
        api.post(`/api/hr/runs/${runId}/post`, { date: run.pay_date }),
        { primary: true, confirm: 'Générer et comptabiliser les écritures de paie ?',
          success: 'Paie comptabilisée.', after: () => openRun(runId) }));
    }
    if (can('HR', 'post') && run.status === 'POSTED') {
      actions.push(SunuERP.docAction('Payer les salaires', () =>
        api.post(`/api/hr/runs/${runId}/pay`, { date: fmt.today(), method: 'VIREMENT' }),
        { confirm: 'Enregistrer le virement des salaires nets ?',
          success: 'Décaissement comptabilisé.', after: () => openRun(runId) }));
    }

    modal.open({
      title: `Campagne de paie ${run.run_no} — ${run.period}/${run.fy}`, size: 'large',
      body: h('div', {}, [
        h('div', { class: 'grid-4', style: 'margin-bottom:14px' }, [
          kpi('Masse salariale brute', run.total_gross),
          kpi('Cotisations et impôts', run.total_employee_cont),
          kpi('Charges patronales', run.total_employer_cont),
          kpi('Net à payer', run.total_net),
        ]),
        Grid({ columns: [
          { key: 'matricule', label: 'Matricule', mono: true },
          { key: 'last_name', label: 'Nom' },
          { key: 'first_name', label: 'Prénom' },
          { key: 'position', label: 'Poste' },
          { key: 'gross', label: 'Brut', type: 'money' },
          { key: 'employee_cont', label: 'Cotisations', type: 'money' },
          { key: 'income_tax', label: 'IR + TRIMF', type: 'money' },
          { key: 'net_pay', label: 'Net', type: 'money' },
          { key: 'employer_cont', label: 'Patronales', type: 'money' },
        ], rows: run.payslips, maxHeight: '46vh',
           onRowClick: (row) => { modal.close(); openPayslip(row.id); } }),
      ]),
      footer: actions.concat([h('button', { class: 'btn', onClick: () => modal.close() }, 'Fermer')]),
    });
  }

  function kpi(label, value) {
    return h('div', { class: 'kpi' }, [
      h('div', { class: 'label', text: label }),
      h('div', { class: 'value' }, [fmt.money(value), h('span', { class: 'unit', text: 'F' })]),
    ]);
  }

  async function newRunForm() {
    const now = new Date();
    const form = h('div', { class: 'form-grid' }, [
      SunuERP.field('Exercice', h('input', { name: 'fy', type: 'number',
                                             value: now.getFullYear() })),
      SunuERP.field('Période (mois)', SunuERP.select({ name: 'period' },
        Array.from({ length: 12 }, (_, i) => ({ value: i + 1,
          label: fmt.month(`${now.getFullYear()}-${String(i + 1).padStart(2, '0')}`) })),
        now.getMonth() + 1)),
      SunuERP.field('Date de paiement',
        h('input', { name: 'pay_date', type: 'date', value: fmt.today() })),
    ]);
    modal.open({
      title: 'Nouvelle campagne de paie',
      body: h('div', {}, [form, h('p', {
        style: 'margin-top:12px;font-size:.8rem;color:var(--ink-3)',
        text: 'Les bulletins sont calculés pour tous les salariés actifs : IPRES, CSS, IPM, ' +
              'impôt sur le revenu et TRIMF selon le paramétrage en vigueur.' })]),
      footer: [
        h('button', { class: 'btn', onClick: () => modal.close() }, 'Annuler'),
        h('button', { class: 'btn btn-primary', onClick: async () => {
          try {
            const run = await api.post('/api/hr/runs', SunuERP.formValues(form));
            toast.success('Campagne créée : ' + run.payslips.length + ' bulletins.');
            modal.close();
            await SunuERP.reload();
            openRun(run.id);
          } catch (err) { toast.error(err.message); }
        } }, 'Préparer la paie'),
      ],
    });
  }

  screens.payroll = () => SunuERP.workWith({
    title: 'Campagnes de paie', subtitle: 'Préparation, validation, comptabilisation et paiement',
    exportName: 'campagnes-paie', filters: [],
    actions: can('HR', 'write')
      ? [h('button', { class: 'btn btn-primary', onClick: newRunForm }, '+ Nouvelle campagne')] : [],
    load: () => api.get('/api/hr/runs'),
    columns: [
      { key: 'run_no', label: 'N°', mono: true },
      { key: 'period', label: 'Période', render: (row) => `${row.period}/${row.fy}` },
      { key: 'pay_date', label: 'Date de paie', type: 'date' },
      { key: 'employees', label: 'Bulletins', type: 'num' },
      { key: 'total_gross', label: 'Brut', type: 'money' },
      { key: 'total_employer_cont', label: 'Charges patronales', type: 'money' },
      { key: 'total_net', label: 'Net à payer', type: 'money' },
      { key: 'status', label: 'Statut', render: (row) => SunuERP.badge(row.status) },
    ],
    onRowClick: (row) => openRun(row.id),
  });

  /* ---------------------------------------------------------------- congés */
  async function leaveForm() {
    const employees = await api.get('/api/hr/employees');
    const select = SunuERP.select({ name: 'employee_id' }, employees.map((e) => ({
      value: e.id, label: `${e.matricule} — ${e.last_name} ${e.first_name}` })));
    const form = h('div', { class: 'form-grid' }, [
      SunuERP.field('Salarié', select, { full: true }),
      SunuERP.field('Type', SunuERP.select({ name: 'leave_type' },
        ['CONGE', 'MALADIE', 'MATERNITE', 'SANS_SOLDE', 'AUTORISATION'], 'CONGE')),
      SunuERP.field('Nombre de jours',
        h('input', { name: 'days', type: 'number', step: '0.5', min: '0.5', value: 1 })),
      SunuERP.field('Du', h('input', { name: 'date_from', type: 'date', value: fmt.today() })),
      SunuERP.field('Au', h('input', { name: 'date_to', type: 'date', value: fmt.today() })),
      SunuERP.field('Motif', h('input', { name: 'notes' }), { full: true }),
    ]);
    modal.open({
      title: 'Demande de congé', body: form,
      footer: [
        h('button', { class: 'btn', onClick: () => modal.close() }, 'Annuler'),
        h('button', { class: 'btn btn-primary', onClick: async () => {
          try {
            await api.post('/api/hr/leaves', SunuERP.formValues(form));
            toast.success('Demande enregistrée.');
            modal.close();
            await SunuERP.reload();
          } catch (err) { toast.error(err.message); }
        } }, 'Enregistrer'),
      ],
    });
  }

  screens.leaves = () => SunuERP.workWith({
    title: 'Congés et absences', subtitle: 'Demandes, validations et historique',
    exportName: 'conges', filters: [],
    actions: can('HR', 'write')
      ? [h('button', { class: 'btn btn-primary', onClick: leaveForm }, '+ Nouvelle demande')] : [],
    load: () => api.get('/api/hr/leaves'),
    columns: [
      { key: 'matricule', label: 'Matricule', mono: true },
      { key: 'last_name', label: 'Nom' },
      { key: 'first_name', label: 'Prénom' },
      { key: 'leave_type', label: 'Type' },
      { key: 'date_from', label: 'Du', type: 'date' },
      { key: 'date_to', label: 'Au', type: 'date' },
      { key: 'days', label: 'Jours', type: 'num' },
      { key: 'status', label: 'Statut', render: (row) => SunuERP.badge(row.status) },
      { key: 'action', label: '', sortable: false, render: (row) =>
        (can('HR', 'write') && row.status === 'DEMANDE'
          ? h('span', {}, [
              h('button', { class: 'btn btn-sm', onClick: async (event) => {
                event.stopPropagation();
                await api.post('/api/hr/leaves', { id: row.id, status: 'APPROUVE' });
                toast.success('Congé approuvé.');
                await SunuERP.reload();
              } }, 'Approuver'),
              h('button', { class: 'btn btn-sm btn-danger', style: 'margin-left:4px',
                onClick: async (event) => {
                  event.stopPropagation();
                  await api.post('/api/hr/leaves', { id: row.id, status: 'REFUSE' });
                  toast.success('Congé refusé.');
                  await SunuERP.reload();
                } }, 'Refuser'),
            ])
          : '') },
    ],
  });

  screens.headcount = async function headcount() {
    const data = await api.get('/api/hr/headcount');
    return h('div', {}, [
      SunuERP.pageHead('Effectifs', `${data.total} salariés actifs`),
      h('div', { class: 'grid-2' }, [
        h('div', { class: 'card' }, [
          h('div', { class: 'card-head' }, h('h3', { text: 'Effectif par centre de coût' })),
          h('div', { class: 'card-body' }, charts.horizontalBars({
            rows: data.by_unit.map((row) => ({ label: row.unit, value: row.headcount,
                                               hint: 'Salariés' })),
            formatter: (value) => Math.round(value) + ' pers.' })),
        ]),
        h('div', { class: 'card' }, [
          h('div', { class: 'card-head' }, h('h3', { text: 'Masse salariale de base par centre' })),
          h('div', { class: 'card-body tight' }, Grid({
            columns: [
              { key: 'unit', label: 'Centre' },
              { key: 'headcount', label: 'Effectif', type: 'num' },
              { key: 'payroll_base', label: 'Salaires de base', type: 'money' },
            ], rows: data.by_unit,
            footer: (rows) => h('tr', {}, [
              h('td', {}, 'Total'),
              h('td', { class: 'num', text: rows.reduce((s, r) => s + r.headcount, 0) }),
              h('td', { class: 'num',
                        text: fmt.money(rows.reduce((s, r) => s + (r.payroll_base || 0), 0)) }),
            ]) })),
        ]),
      ]),
      h('div', { class: 'card' }, [
        h('div', { class: 'card-head' }, h('h3', { text: 'Répartition par type de contrat' })),
        h('div', { class: 'card-body tight' }, Grid({
          columns: [{ key: 'contract_type', label: 'Contrat' },
                    { key: 'headcount', label: 'Effectif', type: 'num' }],
          rows: data.by_contract })),
      ]),
    ]);
  };
})();
