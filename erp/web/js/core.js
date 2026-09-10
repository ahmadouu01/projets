/* =====================================================================
   SunuERP — noyau de l'interface : API, formatage, composants, graphiques
   ===================================================================== */
'use strict';

const SunuERP = window.SunuERP = {};

/* ------------------------------------------------------------------ état */
const State = SunuERP.state = {
  token: localStorage.getItem('sunuerp_token') || null,
  user: null,
  company: null,
  fy: new Date().getFullYear(),
  cache: {},
};

/* ------------------------------------------------------------------ API */
const Api = SunuERP.api = {
  async request(method, path, { params, body } = {}) {
    const url = new URL(path, window.location.origin);
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
    const headers = { 'Content-Type': 'application/json' };
    if (State.token) headers.Authorization = 'Bearer ' + State.token;

    let response;
    try {
      response = await fetch(url, {
        method, headers, body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new Error("Serveur injoignable. Vérifiez que run.py est démarré.");
    }
    let payload = null;
    const text = await response.text();
    if (text) { try { payload = JSON.parse(text); } catch (e) { payload = { error: text }; } }

    if (response.status === 401 && State.user) {
      SunuERP.app.forceLogout("Votre session a expiré, reconnectez-vous.");
      throw new Error("Session expirée.");
    }
    if (!response.ok) throw new Error((payload && payload.error) || ('Erreur ' + response.status));
    return payload;
  },
  get(path, params) { return Api.request('GET', path, { params }); },
  post(path, body) { return Api.request('POST', path, { body }); },
};

/* ------------------------------------------------------------------ formatage */
const NBSP = ' ';
const Fmt = SunuERP.fmt = {
  money(value, withUnit) {
    const n = Math.round(Number(value) || 0);
    const text = n.toLocaleString('fr-FR').replace(/ /g, NBSP);
    return withUnit ? text + NBSP + 'F' : text;
  },
  compact(value) {
    const n = Math.abs(Number(value) || 0);
    const sign = Number(value) < 0 ? '-' : '';
    if (n >= 1e9) return sign + (n / 1e9).toFixed(1).replace('.', ',') + NBSP + 'Md';
    if (n >= 1e6) return sign + (n / 1e6).toFixed(1).replace('.', ',') + NBSP + 'M';
    if (n >= 1e3) return sign + Math.round(n / 1e3) + NBSP + 'k';
    return sign + Math.round(n);
  },
  qty(value) {
    const n = Number(value) || 0;
    return (Math.abs(n % 1) < 0.001 ? n.toFixed(0) : n.toFixed(2)).replace('.', ',');
  },
  pct(value) { return (Number(value) || 0).toFixed(1).replace('.', ',') + '%'; },
  date(value) {
    if (!value) return '';
    const d = String(value).slice(0, 10).split('-');
    return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : value;
  },
  dateTime(value) {
    if (!value) return '';
    const [d, t] = String(value).split(' ');
    return Fmt.date(d) + (t ? ' ' + t.slice(0, 5) : '');
  },
  month(value) {
    const names = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août',
                   'sept.', 'oct.', 'nov.', 'déc.'];
    const [y, m] = String(value).split('-');
    return names[Number(m) - 1] + ' ' + String(y).slice(2);
  },
  today() { return new Date().toISOString().slice(0, 10); },
};

/* ------------------------------------------------------------------ DOM */
function h(tag, attrs, children) {
  const el = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === false) return;
    if (key === 'class') el.className = value;
    else if (key === 'html') el.innerHTML = value;
    else if (key === 'text') el.textContent = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, value);
  });
  (Array.isArray(children) ? children : children ? [children] : []).forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    el.appendChild(typeof child === 'object' ? child : document.createTextNode(String(child)));
  });
  return el;
}
SunuERP.h = h;

const icon = SunuERP.icon = (path, size) => {
  const wrap = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  wrap.setAttribute('viewBox', '0 0 24 24');
  wrap.setAttribute('fill', 'none');
  wrap.setAttribute('stroke', 'currentColor');
  wrap.setAttribute('stroke-width', '1.8');
  wrap.setAttribute('stroke-linecap', 'round');
  wrap.setAttribute('stroke-linejoin', 'round');
  if (size) { wrap.setAttribute('width', size); wrap.setAttribute('height', size); }
  wrap.innerHTML = path;
  return wrap;
};

const ICONS = SunuERP.ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  sales: '<path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/>',
  purchase: '<path d="M20 7H4l1.5 12h13z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>',
  box: '<path d="m21 8-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  factory: '<path d="M3 20V10l6 4V10l6 4V6l6 4v10z"/><path d="M7 16h2M13 16h2"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/>',
  chart: '<path d="M4 19V5M4 19h16"/><path d="m8 15 3-4 3 3 4-6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.5 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7.5l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.1A1.6 1.6 0 0 0 16.5 4.6l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  contacts: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="10" cy="10" r="2.5"/><path d="M6 17c.8-1.8 2.3-2.6 4-2.6s3.2.8 4 2.6M16 9h3M16 13h3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  print: '<path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M8 17h8v4H8z"/>',
  check: '<path d="m5 13 4 4L19 7"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  download: '<path d="M12 3v12"/><path d="m7 12 5 5 5-5"/><path d="M4 21h16"/>',
};

/* ------------------------------------------------------------------ messages */
const Toast = SunuERP.toast = {
  wrap: null,
  show(message, type = '') {
    if (!Toast.wrap) {
      Toast.wrap = h('div', { class: 'toast-wrap' });
      document.body.appendChild(Toast.wrap);
    }
    const node = h('div', { class: 'toast' + (type ? ' is-' + type : ''), text: message });
    Toast.wrap.appendChild(node);
    setTimeout(() => { node.style.opacity = '0'; setTimeout(() => node.remove(), 250); },
               type === 'error' ? 7000 : 3800);
  },
  error(message) { Toast.show(message, 'error'); },
  success(message) { Toast.show(message, 'success'); },
};

/* ------------------------------------------------------------------ modale */
const Modal = SunuERP.modal = {
  stack: [],
  open({ title, body, footer, size }) {
    const content = h('div', { class: 'modal' + (size ? ' ' + size : '') }, [
      h('div', { class: 'modal-head' }, [
        h('h3', { text: title }),
        h('button', { class: 'close', title: 'Fermer', onClick: () => Modal.close() }, '×'),
      ]),
      h('div', { class: 'modal-body' }, body),
      footer ? h('div', { class: 'modal-foot' }, footer) : null,
    ]);
    const backdrop = h('div', { class: 'modal-backdrop', onClick: (e) => {
      if (e.target === backdrop) Modal.close();
    } }, content);
    document.body.appendChild(backdrop);
    document.body.style.overflow = 'hidden';
    Modal.stack.push(backdrop);
    const focusable = content.querySelector('input, select, textarea, button.btn-primary');
    if (focusable) setTimeout(() => focusable.focus(), 30);
    return { backdrop, content };
  },
  close() {
    const top = Modal.stack.pop();
    if (top) top.remove();
    if (!Modal.stack.length) document.body.style.overflow = '';
  },
  closeAll() { while (Modal.stack.length) Modal.close(); },
  confirm(message, onConfirm, confirmLabel = 'Confirmer') {
    Modal.open({
      title: 'Confirmation', size: 'small',
      body: h('p', { text: message }),
      footer: [
        h('button', { class: 'btn', onClick: () => Modal.close() }, 'Annuler'),
        h('button', { class: 'btn btn-primary', onClick: async () => {
          Modal.close();
          await onConfirm();
        } }, confirmLabel),
      ],
    });
  },
};
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') Modal.close(); });

/* ------------------------------------------------------------------ grille */
/**
 * columns: [{ key, label, type: 'text|num|money|qty|date|badge|custom', width, render(row) }]
 */
function Grid({ columns, rows, onRowClick, empty, footer, maxHeight }) {
  const state = { sort: null, dir: 1 };
  const wrap = h('div', { class: 'table-wrap', style: maxHeight ? `max-height:${maxHeight};overflow-y:auto` : '' });

  function cellContent(column, row) {
    if (column.render) return column.render(row);
    const value = row[column.key];
    switch (column.type) {
      case 'money': return Fmt.money(value);
      case 'qty': return Fmt.qty(value);
      case 'date': return Fmt.date(value);
      case 'datetime': return Fmt.dateTime(value);
      case 'pct': return Fmt.pct(value);
      default: return value === null || value === undefined ? '' : String(value);
    }
  }

  function draw() {
    wrap.innerHTML = '';
    const data = rows.slice();
    if (state.sort) {
      const column = columns.find((c) => c.key === state.sort);
      data.sort((a, b) => {
        const va = a[state.sort], vb = b[state.sort];
        const numeric = ['num', 'money', 'qty', 'pct'].includes(column && column.type);
        if (numeric) return ((Number(va) || 0) - (Number(vb) || 0)) * state.dir;
        return String(va === null ? '' : va).localeCompare(String(vb === null ? '' : vb),
                                                            'fr', { numeric: true }) * state.dir;
      });
    }
    if (!data.length) {
      wrap.appendChild(h('div', { class: 'table-empty', text: empty || 'Aucune donnée à afficher.' }));
      return;
    }
    const table = h('table', { class: 'data' });
    const head = h('tr', {}, columns.map((column) => h('th', {
      class: (['num', 'money', 'qty', 'pct'].includes(column.type) ? 'num' : '') +
             (column.sortable === false ? ' no-sort' : ''),
      style: column.width ? `width:${column.width}` : '',
      onClick: column.sortable === false ? null : () => {
        state.dir = state.sort === column.key ? -state.dir : 1;
        state.sort = column.key;
        draw();
      },
    }, [column.label, state.sort === column.key
        ? h('span', { class: 'arrow', text: state.dir > 0 ? '▲' : '▼' }) : null])));
    table.appendChild(h('thead', {}, head));

    const body = h('tbody', {}, data.map((row) => {
      const tr = h('tr', {
        class: onRowClick ? 'is-clickable' : '',
        onClick: onRowClick ? () => onRowClick(row) : null,
      }, columns.map((column) => {
        const content = cellContent(column, row);
        return h('td', {
          class: (['num', 'money', 'qty', 'pct'].includes(column.type) ? 'num ' : '') +
                 (column.mono ? 'mono ' : '') + (column.cellClass ? column.cellClass(row) : ''),
        }, typeof content === 'object' ? content : String(content));
      }));
      return tr;
    }));
    table.appendChild(body);
    if (footer) table.appendChild(h('tfoot', {}, footer(data)));
    wrap.appendChild(table);
  }

  draw();
  wrap.update = (nextRows) => { rows = nextRows; draw(); };
  return wrap;
}
SunuERP.Grid = Grid;

/* ------------------------------------------------------------------ badges */
const STATUS_LABELS = {
  DRAFT: ['Brouillon', 'muted'], CONFIRMED: ['Confirmée', 'info'], SHIPPED: ['Livrée', 'info'],
  INVOICED: ['Facturée', 'good'], CANCELLED: ['Annulée', 'muted'], APPROVED: ['Approuvée', 'info'],
  RECEIVED: ['Réceptionnée', 'info'], OPEN: ['À régler', 'warn'], PARTIAL: ['Partiel', 'warn'],
  PAID: ['Réglée', 'good'], POSTED: ['Comptabilisé', 'good'], VOID: ['Annulé', 'muted'],
  PLANNED: ['Planifié', 'muted'], RELEASED: ['Lancé', 'info'], COMPLETED: ['Terminé', 'good'],
  CLOSED: ['Clôturé', 'muted'], VALIDATED: ['Validée', 'info'], DEMANDE: ['Demandé', 'warn'],
  APPROUVE: ['Approuvé', 'good'], REFUSE: ['Refusé', 'danger'], CLOSED_P: ['Clôturée', 'muted'],
};
SunuERP.badge = function badge(status) {
  const [label, tone] = STATUS_LABELS[status] || [status, 'muted'];
  return h('span', { class: 'badge badge-' + tone, text: label });
};

/* ------------------------------------------------------------------ graphiques */
const Charts = SunuERP.charts = {};
const SERIES = ['var(--series-1)', 'var(--series-2)'];
const RAMP = ['var(--seq-1)', 'var(--seq-2)', 'var(--seq-3)', 'var(--seq-4)', 'var(--seq-5)'];

let tooltipNode = null;
function showTooltip(event, html) {
  if (!tooltipNode) {
    tooltipNode = h('div', { class: 'chart-tooltip' });
    document.body.appendChild(tooltipNode);
  }
  tooltipNode.innerHTML = html;
  tooltipNode.style.display = 'block';
  const rect = tooltipNode.getBoundingClientRect();
  let left = event.clientX + 14;
  if (left + rect.width > window.innerWidth - 8) left = event.clientX - rect.width - 14;
  tooltipNode.style.left = left + 'px';
  tooltipNode.style.top = Math.max(8, event.clientY - rect.height - 10) + 'px';
}
function hideTooltip() { if (tooltipNode) tooltipNode.style.display = 'none'; }

function svgEl(tag, attrs) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs || {}).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

function niceMax(value) {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  return Math.ceil(value / magnitude * 2) / 2 * magnitude;
}

/** Barres groupées : jusqu'à deux séries comparables sur le même axe. */
Charts.groupedBars = function groupedBars({ categories, series, height = 220, formatter }) {
  const format = formatter || Fmt.compact;
  const W = 720, H = height, padL = 54, padR = 12, padT = 12, padB = 26;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values.map((v) => Number(v) || 0))));
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img',
                             'aria-label': series.map((s) => s.label).join(' et ') });

  for (let i = 0; i <= 4; i += 1) {
    const y = padT + plotH - (plotH * i) / 4;
    svg.appendChild(svgEl('line', { class: 'grid-line', x1: padL, x2: W - padR, y1: y, y2: y }));
    const label = svgEl('text', { class: 'axis-label', x: padL - 8, y: y + 3, 'text-anchor': 'end' });
    label.textContent = format((max * i) / 4);
    svg.appendChild(label);
  }
  svg.appendChild(svgEl('line', { class: 'axis-line', x1: padL, x2: W - padR,
                                  y1: padT + plotH, y2: padT + plotH }));

  const slot = plotW / Math.max(categories.length, 1);
  const barW = Math.max(4, Math.min(22, (slot - 8) / series.length - 2));
  categories.forEach((category, index) => {
    const centre = padL + slot * index + slot / 2;
    const groupW = barW * series.length + 2 * (series.length - 1);
    series.forEach((serie, si) => {
      const value = Number(serie.values[index]) || 0;
      const barH = Math.max(value > 0 ? 2 : 0, (value / max) * plotH);
      const x = centre - groupW / 2 + si * (barW + 2);
      const y = padT + plotH - barH;
      const rect = svgEl('rect', {
        x, y, width: barW, height: barH, rx: 4, ry: 4, fill: SERIES[si % SERIES.length],
      });
      rect.addEventListener('mousemove', (event) => showTooltip(event,
        `<div class="t-title">${category}</div>` + series.map((s, k) =>
          `<div class="t-row"><span>${s.label}</span><span>${Fmt.money(s.values[index])} F</span></div>`
        ).join('')));
      rect.addEventListener('mouseleave', hideTooltip);
      svg.appendChild(rect);
    });
    if (categories.length <= 14 || index % 2 === 0) {
      const label = svgEl('text', { class: 'axis-label', x: centre, y: H - 8,
                                    'text-anchor': 'middle' });
      label.textContent = category;
      svg.appendChild(label);
    }
  });

  const legend = h('div', { class: 'chart-legend' }, series.map((serie, index) => h('span',
    { class: 'key' }, [
      h('span', { class: 'swatch', style: `background:${SERIES[index % SERIES.length]}` }),
      serie.label,
    ])));
  const wrap = h('div', { class: 'chart' }, [legend]);
  wrap.appendChild(svg);
  return wrap;
};

/** Barres horizontales : une seule série ordonnée (rampe monochrome). */
Charts.horizontalBars = function horizontalBars({ rows, height, formatter, ordinal }) {
  const format = formatter || ((v) => Fmt.money(v) + ' F');
  const count = rows.length || 1;
  const rowH = 30;
  const W = 520, H = height || count * rowH + 14;
  const labelW = 150, valueW = 78;
  const plotW = W - labelW - valueW;
  const max = Math.max(1, ...rows.map((r) => Math.abs(Number(r.value) || 0)));
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Comparaison' });

  rows.forEach((row, index) => {
    const y = index * rowH + 4;
    const value = Number(row.value) || 0;
    const width = Math.max(value > 0 ? 3 : 0, (Math.abs(value) / max) * plotW);
    const label = svgEl('text', { class: 'axis-label', x: labelW - 10, y: y + rowH / 2 + 1,
                                  'text-anchor': 'end' });
    label.textContent = row.label.length > 24 ? row.label.slice(0, 23) + '…' : row.label;
    svg.appendChild(label);
    const bar = svgEl('rect', {
      x: labelW, y: y + 4, width, height: rowH - 12, rx: 4, ry: 4,
      fill: ordinal ? RAMP[Math.min(index, RAMP.length - 1)] : 'var(--seq-3)',
    });
    bar.addEventListener('mousemove', (event) => showTooltip(event,
      `<div class="t-title">${row.label}</div><div class="t-row"><span>${row.hint || 'Montant'}</span><span>${format(value)}</span></div>`));
    bar.addEventListener('mouseleave', hideTooltip);
    svg.appendChild(bar);
    const valueLabel = svgEl('text', { class: 'value-label', x: labelW + width + 8,
                                       y: y + rowH / 2 + 1 });
    valueLabel.textContent = format(value);
    svg.appendChild(valueLabel);
  });
  const wrap = h('div', { class: 'chart' });
  wrap.appendChild(svg);
  return wrap;
};

/* ------------------------------------------------------------------ divers */
SunuERP.tabs = function tabs(items) {
  const bar = h('div', { class: 'tabs' });
  const panel = h('div', {});
  items.forEach((item, index) => {
    const button = h('button', {
      class: index === 0 ? 'is-active' : '', text: item.label,
      onClick: () => {
        bar.querySelectorAll('button').forEach((b) => b.classList.remove('is-active'));
        button.classList.add('is-active');
        panel.innerHTML = '';
        panel.appendChild(item.render());
      },
    });
    bar.appendChild(button);
  });
  if (items.length) panel.appendChild(items[0].render());
  return h('div', {}, [bar, panel]);
};

SunuERP.field = function field(label, input, options = {}) {
  return h('div', { class: 'field' + (options.full ? ' full' : '') }, [
    h('label', { text: label, for: input.id || null }),
    input,
    options.hint ? h('div', { class: 'hint', text: options.hint }) : null,
  ]);
};

SunuERP.input = function input(attrs) {
  return h('input', Object.assign({ type: 'text' }, attrs));
};

SunuERP.select = function select(attrs, options, selected) {
  const node = h('select', attrs, (options || []).map((option) => {
    const value = option.value !== undefined ? option.value : option;
    const label = option.label !== undefined ? option.label : option;
    return h('option', { value, selected: String(value) === String(selected) }, String(label));
  }));
  if (selected !== undefined && selected !== null && selected !== '') node.value = selected;
  return node;
};

SunuERP.formValues = function formValues(root) {
  const values = {};
  root.querySelectorAll('[name]').forEach((node) => {
    if (node.type === 'checkbox') values[node.name] = node.checked;
    else if (node.type === 'number') values[node.name] = node.value === '' ? null : Number(node.value);
    else values[node.name] = node.value;
  });
  return values;
};

SunuERP.printNode = function printNode(node, title) {
  const frame = h('iframe', { style: 'position:fixed;right:0;bottom:0;width:0;height:0;border:0' });
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  doc.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${title || 'Document'}</title>`);
  doc.write('<link rel="stylesheet" href="css/app.css"></head><body style="padding:24px">');
  doc.write(node.outerHTML);
  doc.write('</body></html>');
  doc.close();
  setTimeout(() => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 1500);
  }, 350);
};

SunuERP.toCsv = function toCsv(columns, rows, filename) {
  const escape = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[";\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  };
  const lines = [columns.map((c) => escape(c.label)).join(';')];
  rows.forEach((row) => lines.push(columns.map((c) => escape(
    c.csv ? c.csv(row) : row[c.key])).join(';')));
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = h('a', { href: url, download: filename || 'export.csv' });
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};
