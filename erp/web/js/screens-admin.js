/* =====================================================================
   SunuERP — administration : utilisateurs, UDC, paramétrage, audit
   ===================================================================== */
'use strict';

(function () {
  const { h, api, fmt, toast, modal, Grid } = SunuERP;
  const screens = SunuERP.screens;
  const can = SunuERP.can;

  const ROLES = ['ADMIN', 'COMPTABLE', 'COMMERCIAL', 'ACHETEUR', 'MAGASINIER', 'RH', 'READONLY'];

  async function userForm(user) {
    const units = (await api.get('/api/admin/companies')).business_units || [];
    const form = h('div', { class: 'form-grid' }, [
      SunuERP.field('Identifiant', h('input', { name: 'username', value: user ? user.username : '',
                                                readonly: !!user })),
      SunuERP.field('Nom complet', h('input', { name: 'full_name',
                                                value: user ? user.full_name : '' })),
      SunuERP.field('E-mail', h('input', { name: 'email', type: 'email',
                                           value: user ? user.email || '' : '' })),
      SunuERP.field('Profil', SunuERP.select({ name: 'role' }, ROLES, user ? user.role : 'READONLY')),
      SunuERP.field('Centre de rattachement', SunuERP.select({ name: 'business_unit' },
        [{ value: '', label: '—' }].concat(units.map((u) => ({ value: u.code, label: u.name }))),
        user ? user.business_unit || '' : '')),
      SunuERP.field(user ? 'Nouveau mot de passe (facultatif)' : 'Mot de passe',
        h('input', { name: 'password', type: 'password', autocomplete: 'new-password' })),
      h('div', { class: 'field checkbox' }, [
        h('input', { type: 'checkbox', name: 'active', id: 'u-active',
                     checked: user ? !!user.active : true }),
        h('label', { for: 'u-active', text: 'Compte actif' }),
      ]),
    ]);
    modal.open({
      title: user ? 'Utilisateur ' + user.username : 'Nouvel utilisateur', body: form,
      footer: [
        h('button', { class: 'btn', onClick: () => modal.close() }, 'Annuler'),
        h('button', { class: 'btn btn-primary', onClick: async () => {
          const values = SunuERP.formValues(form);
          if (user) values.id = user.id;
          if (!user && !values.password) { toast.error('Le mot de passe est obligatoire.'); return; }
          try {
            await api.post('/api/admin/users', values);
            toast.success('Utilisateur enregistré.');
            modal.close();
            await SunuERP.reload();
          } catch (err) { toast.error(err.message); }
        } }, 'Enregistrer'),
      ],
    });
  }

  screens.users = async function usersScreen() {
    const roles = await api.get('/api/admin/roles');
    const matrix = {};
    roles.roles.forEach((row) => {
      matrix[row.role] = matrix[row.role] || {};
      matrix[row.role][row.module] = row;
    });
    const moduleCodes = Object.keys(roles.modules);

    return h('div', {}, [
      SunuERP.pageHead('Utilisateurs et profils',
        'Comptes de connexion et habilitations par module',
        can('ADM', 'write')
          ? [h('button', { class: 'btn btn-primary', onClick: () => userForm(null) },
               '+ Nouvel utilisateur')] : []),
      h('div', { class: 'card' }, [
        h('div', { class: 'card-head' }, h('h3', { text: 'Comptes utilisateurs' })),
        h('div', { class: 'card-body tight' }, Grid({
          columns: [
            { key: 'username', label: 'Identifiant', mono: true },
            { key: 'full_name', label: 'Nom' },
            { key: 'role', label: 'Profil' },
            { key: 'business_unit', label: 'Centre' },
            { key: 'last_login', label: 'Dernière connexion', type: 'datetime' },
            { key: 'active', label: 'Statut',
              render: (row) => SunuERP.badge(row.active ? 'APPROUVE' : 'VOID') },
          ],
          rows: await api.get('/api/admin/users'),
          onRowClick: (row) => userForm(row),
        })),
      ]),
      h('div', { class: 'card' }, [
        h('div', { class: 'card-head' }, [h('h3', { text: 'Matrice des habilitations' }),
          h('div', { class: 'actions' }, h('span', {
            style: 'font-size:.78rem;color:var(--ink-3)',
            text: 'L = lecture · É = écriture · C = comptabilisation' }))]),
        h('div', { class: 'card-body tight' }, h('div', { class: 'table-wrap' },
          h('table', { class: 'data' }, [
            h('thead', {}, h('tr', {}, [h('th', {}, 'Profil')].concat(
              moduleCodes.map((code) => h('th', { title: roles.modules[code] }, code))))),
            h('tbody', {}, Object.keys(matrix).sort().map((role) => h('tr', {}, [
              h('td', {}, h('strong', {}, role))].concat(moduleCodes.map((code) => {
                const permission = matrix[role][code] || {};
                const marks = [permission.can_read ? 'L' : '', permission.can_write ? 'É' : '',
                               permission.can_post ? 'C' : ''].filter(Boolean).join(' ');
                return h('td', { style: marks ? '' : 'color:var(--ink-3)', text: marks || '—' });
              }))))),
          ]))),
      ]),
    ]);
  };

  screens.udc = () => SunuERP.workWith({
    title: 'Codes utilisateur (UDC)',
    subtitle: 'Listes de valeurs paramétrables : conditions de règlement, unités, catégories…',
    exportName: 'udc',
    filters: [{ key: 'system', type: 'select', label: 'Système', options: [
      { value: '', label: 'Tous' }, { value: '00', label: '00 — Général' },
      { value: '01', label: '01 — Tiers' }, { value: '07', label: '07 — Paie' },
      { value: '41', label: '41 — Articles' }] }],
    actions: can('ADM', 'write') ? [h('button', { class: 'btn btn-primary', onClick: () => {
      const form = h('div', { class: 'form-grid' }, [
        SunuERP.field('Système', h('input', { name: 'system', value: '00' })),
        SunuERP.field('Type de code', h('input', { name: 'code_type' })),
        SunuERP.field('Code', h('input', { name: 'code' })),
        SunuERP.field('Description', h('input', { name: 'description' })),
      ]);
      modal.open({ title: 'Nouveau code utilisateur', body: form, footer: [
        h('button', { class: 'btn', onClick: () => modal.close() }, 'Annuler'),
        h('button', { class: 'btn btn-primary', onClick: async () => {
          try {
            await api.post('/api/admin/udc', SunuERP.formValues(form));
            toast.success('Code enregistré.');
            modal.close();
            await SunuERP.reload();
          } catch (err) { toast.error(err.message); }
        } }, 'Enregistrer'),
      ] });
    } }, '+ Nouveau code')] : [],
    load: (filters) => api.get('/api/admin/udc', filters),
    columns: [
      { key: 'system', label: 'Système', mono: true },
      { key: 'code_type', label: 'Type', mono: true },
      { key: 'code', label: 'Code', mono: true },
      { key: 'description', label: 'Description' },
      { key: 'handling', label: 'Traitement spécial' },
    ],
  });

  screens.numbering = () => SunuERP.workWith({
    title: 'Numérotation des documents',
    subtitle: 'Séquences automatiques par type de document',
    exportName: 'numerotation', filters: [],
    load: () => api.get('/api/admin/next-numbers'),
    columns: [
      { key: 'doc_type', label: 'Type', mono: true },
      { key: 'prefix', label: 'Préfixe' },
      { key: 'next_value', label: 'Prochain numéro', type: 'num' },
      { key: 'padding', label: 'Longueur', type: 'num' },
      { key: 'sample', label: 'Exemple', sortable: false, render: (row) =>
        `${row.prefix}-${new Date().getFullYear()}-${String(row.next_value).padStart(row.padding, '0')}` },
    ],
  });

  screens.organisation = async function organisation() {
    const data = await api.get('/api/admin/companies');
    const company = data.companies[0] || {};
    return h('div', {}, [
      SunuERP.pageHead('Société et centres de coût',
        'Identité de la société et découpage analytique',
        can('ADM', 'write') ? [h('button', { class: 'btn btn-primary', onClick: () => {
          const form = h('div', { class: 'form-grid' }, [
            SunuERP.field('Code', h('input', { name: 'code' })),
            SunuERP.field('Libellé', h('input', { name: 'name' })),
            SunuERP.field('Type', SunuERP.select({ name: 'bu_type' },
              ['DEPT', 'SITE', 'PROJET'], 'DEPT')),
            SunuERP.field('Responsable', h('input', { name: 'manager' })),
          ]);
          modal.open({ title: 'Nouveau centre', body: form, footer: [
            h('button', { class: 'btn', onClick: () => modal.close() }, 'Annuler'),
            h('button', { class: 'btn btn-primary', onClick: async () => {
              try {
                await api.post('/api/admin/business-units', SunuERP.formValues(form));
                toast.success('Centre enregistré.');
                modal.close();
                await SunuERP.reload();
              } catch (err) { toast.error(err.message); }
            } }, 'Enregistrer'),
          ] });
        } }, '+ Nouveau centre')] : []),
      h('div', { class: 'card' }, [
        h('div', { class: 'card-head' }, h('h3', { text: 'Société' })),
        h('div', { class: 'card-body' }, h('div', { class: 'form-grid cols-3' },
          [['Raison sociale', company.name], ['Forme juridique', company.legal_form],
           ['NINEA', company.tax_id], ['RCCM', company.trade_register],
           ['Adresse', `${company.address || ''} — ${company.city || ''}`],
           ['Téléphone', company.phone], ['E-mail', company.email],
           ['Devise', company.currency], ['Taux de TVA', (company.vat_rate || 0) + ' %']]
          .map(([label, value]) => h('div', {}, [
            h('div', { style: 'font-size:.74rem;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3);font-weight:600',
                       text: label }),
            h('div', { style: 'font-weight:600;margin-top:2px', text: value || '—' }),
          ])))),
      ]),
      h('div', { class: 'card' }, [
        h('div', { class: 'card-head' }, h('h3', { text: 'Centres de coût' })),
        h('div', { class: 'card-body tight' }, Grid({
          columns: [
            { key: 'code', label: 'Code', mono: true },
            { key: 'name', label: 'Libellé' },
            { key: 'bu_type', label: 'Type' },
            { key: 'manager', label: 'Responsable' },
          ], rows: data.business_units })),
      ]),
    ]);
  };

  screens.settings = async function settingsScreen() {
    const rows = await api.get('/api/admin/settings');
    const payrollParams = await api.get('/api/hr/params').catch(() => null);
    const editable = can('ADM', 'write');

    const inputs = {};
    const list = h('div', { class: 'form-grid' }, rows.map((row) => {
      const input = h('input', { value: row.value === null ? '' : row.value,
                                 readonly: !editable });
      inputs[row.key] = input;
      return SunuERP.field(row.key, input);
    }));

    return h('div', {}, [
      SunuERP.pageHead('Paramètres', 'Réglages généraux du progiciel',
        editable ? [h('button', { class: 'btn btn-primary', onClick: async () => {
          const values = {};
          Object.entries(inputs).forEach(([key, input]) => { values[key] = input.value; });
          try {
            await api.post('/api/admin/settings', values);
            toast.success('Paramètres enregistrés.');
          } catch (err) { toast.error(err.message); }
        } }, 'Enregistrer')] : []),
      h('div', { class: 'card' }, [
        h('div', { class: 'card-head' }, h('h3', { text: 'Paramètres généraux' })),
        h('div', { class: 'card-body' }, list),
      ]),
      payrollParams ? h('div', { class: 'card' }, [
        h('div', { class: 'card-head' }, [h('h3', { text: 'Paramètres de paie en vigueur' }),
          h('div', { class: 'actions' }, h('span', {
            style: 'font-size:.78rem;color:var(--ink-3)',
            text: 'Taux à valider avec votre expert-comptable' }))]),
        h('div', { class: 'card-body tight' }, Grid({
          columns: [
            { key: 'key', label: 'Paramètre' },
            { key: 'value', label: 'Valeur' },
          ],
          rows: Object.entries(payrollParams).map(([key, value]) => ({
            key, value: Array.isArray(value) ? JSON.stringify(value) : String(value) })),
          maxHeight: '400px',
        })),
      ]) : null,
    ]);
  };

  screens.audit = () => SunuERP.workWith({
    title: "Journal d'audit",
    subtitle: 'Toutes les opérations sensibles sont tracées : qui, quand, quoi',
    exportName: 'journal-audit',
    filters: [
      { key: 'module', type: 'select', label: 'Module', options: [
        { value: '', label: 'Tous' }, { value: 'GL', label: 'Comptabilité' },
        { value: 'AR', label: 'Ventes' }, { value: 'AP', label: 'Achats' },
        { value: 'IN', label: 'Stocks' }, { value: 'MF', label: 'Production' },
        { value: 'HR', label: 'Paie' }, { value: 'AB', label: 'Tiers' },
        { value: 'ADM', label: 'Administration' }] },
      { key: 'username', label: 'Utilisateur…' },
    ],
    load: (filters) => api.get('/api/reports/audit', Object.assign({ limit: 400 }, filters)),
    columns: [
      { key: 'ts', label: 'Horodatage', type: 'datetime' },
      { key: 'username', label: 'Utilisateur' },
      { key: 'module', label: 'Module' },
      { key: 'action', label: 'Action' },
      { key: 'entity', label: 'Objet' },
      { key: 'entity_id', label: 'Identifiant', mono: true },
      { key: 'details', label: 'Détail' },
    ],
  });
})();
