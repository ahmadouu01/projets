-- =====================================================================
-- SunuERP — schéma de la base de données (SQLite)
-- Progiciel de gestion intégré : référentiels, comptabilité, achats,
-- ventes, stocks, production, paie, administration.
-- =====================================================================
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- 1. ADMINISTRATION & SÉCURITÉ
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
  code            TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  legal_form      TEXT,
  tax_id          TEXT,               -- NINEA
  trade_register  TEXT,               -- RCCM
  address         TEXT,
  city            TEXT,
  country         TEXT DEFAULT 'Sénégal',
  phone           TEXT,
  email           TEXT,
  currency        TEXT NOT NULL DEFAULT 'XOF',
  fiscal_start_month INTEGER NOT NULL DEFAULT 1,
  vat_rate        REAL NOT NULL DEFAULT 18.0,
  active          INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS business_units (
  code        TEXT PRIMARY KEY,       -- centre de coût / établissement
  name        TEXT NOT NULL,
  company     TEXT NOT NULL REFERENCES companies(code),
  bu_type     TEXT NOT NULL DEFAULT 'DEPT',   -- DEPT, SITE, PROJET
  manager     TEXT,
  active      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt          TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  email         TEXT,
  role          TEXT NOT NULL DEFAULT 'READONLY',
  business_unit TEXT REFERENCES business_units(code),
  active        INTEGER NOT NULL DEFAULT 1,
  last_login    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role    TEXT NOT NULL,
  module  TEXT NOT NULL,              -- GL, AP, AR, IN, SO, PO, MF, HR, ADM
  can_read  INTEGER NOT NULL DEFAULT 0,
  can_write INTEGER NOT NULL DEFAULT 0,
  can_post  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (role, module)
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ts         TEXT NOT NULL DEFAULT (datetime('now')),
  username   TEXT,
  module     TEXT,
  action     TEXT NOT NULL,
  entity     TEXT,
  entity_id  TEXT,
  details    TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts DESC);

-- Codes définis par l'utilisateur (UDC), à la manière de JD Edwards
CREATE TABLE IF NOT EXISTS udc (
  system      TEXT NOT NULL,          -- 00, 01, 41, 42, 43, 07…
  code_type   TEXT NOT NULL,
  code        TEXT NOT NULL,
  description TEXT NOT NULL,
  handling    TEXT,                   -- code de traitement spécial
  active      INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (system, code_type, code)
);

-- Numérotation automatique des documents
CREATE TABLE IF NOT EXISTS next_numbers (
  doc_type   TEXT PRIMARY KEY,        -- SO, SH, INV, PO, GR, API, PAY, REC, JE, WO, PR
  prefix     TEXT NOT NULL,
  next_value INTEGER NOT NULL DEFAULT 1,
  padding    INTEGER NOT NULL DEFAULT 5,
  use_year   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS currencies (
  code     TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  symbol   TEXT,
  decimals INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  from_ccy TEXT NOT NULL REFERENCES currencies(code),
  to_ccy   TEXT NOT NULL REFERENCES currencies(code),
  rate_date TEXT NOT NULL,
  rate     REAL NOT NULL,
  PRIMARY KEY (from_ccy, to_ccy, rate_date)
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- ---------------------------------------------------------------------
-- 2. RÉPERTOIRE D'ADRESSES (tiers uniques : clients, fournisseurs, salariés)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS address_book (
  an8          INTEGER PRIMARY KEY AUTOINCREMENT,   -- numéro de tiers
  alpha_name   TEXT NOT NULL,
  search_type  TEXT NOT NULL DEFAULT 'C',           -- C client, V fournisseur, E salarié, O autre
  is_customer  INTEGER NOT NULL DEFAULT 0,
  is_supplier  INTEGER NOT NULL DEFAULT 0,
  is_employee  INTEGER NOT NULL DEFAULT 0,
  tax_id       TEXT,                                 -- NINEA
  address      TEXT,
  city         TEXT,
  region       TEXT,
  country      TEXT DEFAULT 'Sénégal',
  phone        TEXT,
  email        TEXT,
  contact_name TEXT,
  notes        TEXT,
  active       INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ab_name ON address_book(alpha_name);

CREATE TABLE IF NOT EXISTS customers (
  an8            INTEGER PRIMARY KEY REFERENCES address_book(an8) ON DELETE CASCADE,
  credit_limit   REAL NOT NULL DEFAULT 0,
  payment_terms  TEXT NOT NULL DEFAULT '30J',
  price_group    TEXT,
  ar_account     TEXT,
  sales_rep      TEXT,
  vat_exempt     INTEGER NOT NULL DEFAULT 0,
  on_hold        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS suppliers (
  an8            INTEGER PRIMARY KEY REFERENCES address_book(an8) ON DELETE CASCADE,
  payment_terms  TEXT NOT NULL DEFAULT '30J',
  ap_account     TEXT,
  bank_account   TEXT,
  category       TEXT,
  lead_time_days INTEGER NOT NULL DEFAULT 7
);

-- ---------------------------------------------------------------------
-- 3. COMPTABILITÉ GÉNÉRALE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
  code         TEXT PRIMARY KEY,      -- compte SYSCOHADA
  name         TEXT NOT NULL,
  account_type TEXT NOT NULL,         -- ACTIF, PASSIF, CAPITAUX, PRODUIT, CHARGE
  class        INTEGER,               -- classe 1 à 7
  parent       TEXT,
  postable     INTEGER NOT NULL DEFAULT 1,
  currency     TEXT NOT NULL DEFAULT 'XOF',
  active       INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS fiscal_periods (
  company    TEXT NOT NULL REFERENCES companies(code),
  fy         INTEGER NOT NULL,        -- exercice
  period     INTEGER NOT NULL,        -- 1 à 12
  date_from  TEXT NOT NULL,
  date_to    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'OPEN',   -- OPEN, CLOSED
  PRIMARY KEY (company, fy, period)
);

CREATE TABLE IF NOT EXISTS gl_batches (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_no    TEXT NOT NULL UNIQUE,
  batch_type  TEXT NOT NULL,          -- G saisie, V ventes, A achats, S stock, P paie, T trésorerie
  description TEXT,
  doc_date    TEXT NOT NULL,
  fy          INTEGER NOT NULL,
  period      INTEGER NOT NULL,
  company     TEXT NOT NULL REFERENCES companies(code),
  status      TEXT NOT NULL DEFAULT 'DRAFT',  -- DRAFT, POSTED, VOID
  total_debit  REAL NOT NULL DEFAULT 0,
  total_credit REAL NOT NULL DEFAULT 0,
  source      TEXT,                   -- module d'origine
  source_id   INTEGER,
  created_by  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  posted_by   TEXT,
  posted_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_batch_status ON gl_batches(status);

CREATE TABLE IF NOT EXISTS gl_entries (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id      INTEGER NOT NULL REFERENCES gl_batches(id) ON DELETE CASCADE,
  line_no       INTEGER NOT NULL,
  account_code  TEXT NOT NULL REFERENCES accounts(code),
  business_unit TEXT REFERENCES business_units(code),
  doc_date      TEXT NOT NULL,
  fy            INTEGER NOT NULL,
  period        INTEGER NOT NULL,
  description   TEXT,
  debit         REAL NOT NULL DEFAULT 0,
  credit        REAL NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'XOF',
  rate          REAL NOT NULL DEFAULT 1,
  sub_type      TEXT,                 -- AB tiers, IT article, WO ordre de fabrication
  sub_id        TEXT,
  posted        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_gl_account ON gl_entries(account_code, fy, period);
CREATE INDEX IF NOT EXISTS idx_gl_batch ON gl_entries(batch_id);

-- Correspondance des comptes utilisés par les traitements automatiques
CREATE TABLE IF NOT EXISTS gl_mapping (
  key         TEXT PRIMARY KEY,       -- AR_CONTROL, SALES, VAT_OUT, INVENTORY…
  account_code TEXT NOT NULL REFERENCES accounts(code),
  description TEXT
);

-- ---------------------------------------------------------------------
-- 4. ARTICLES & STOCKS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS warehouses (
  code    TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  business_unit TEXT REFERENCES business_units(code),
  address TEXT,
  city    TEXT,
  active  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  item_code     TEXT NOT NULL UNIQUE,
  description   TEXT NOT NULL,
  item_type     TEXT NOT NULL DEFAULT 'STOCK',  -- STOCK, MATIERE, FINI, SERVICE
  category      TEXT,
  uom           TEXT NOT NULL DEFAULT 'U',
  sale_price    REAL NOT NULL DEFAULT 0,
  standard_cost REAL NOT NULL DEFAULT 0,
  average_cost  REAL NOT NULL DEFAULT 0,
  vat_rate      REAL NOT NULL DEFAULT 18.0,
  min_stock     REAL NOT NULL DEFAULT 0,
  lead_time_days INTEGER NOT NULL DEFAULT 0,
  supplier_an8  INTEGER REFERENCES address_book(an8),
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_item_code ON items(item_code);

CREATE TABLE IF NOT EXISTS stock (
  item_id      INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  warehouse    TEXT NOT NULL REFERENCES warehouses(code),
  qty_on_hand  REAL NOT NULL DEFAULT 0,
  qty_reserved REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, warehouse)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  move_date   TEXT NOT NULL,
  item_id     INTEGER NOT NULL REFERENCES items(id),
  warehouse   TEXT NOT NULL REFERENCES warehouses(code),
  move_type   TEXT NOT NULL,          -- IN, OUT, ADJ, TRF_IN, TRF_OUT
  quantity    REAL NOT NULL,
  unit_cost   REAL NOT NULL DEFAULT 0,
  value       REAL NOT NULL DEFAULT 0,
  balance_after REAL NOT NULL DEFAULT 0,
  doc_type    TEXT,
  doc_number  TEXT,
  reason      TEXT,
  username    TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mov_item ON stock_movements(item_id, move_date);

-- ---------------------------------------------------------------------
-- 5. VENTES (commande → livraison → facture → encaissement)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no    TEXT NOT NULL UNIQUE,
  customer_an8 INTEGER NOT NULL REFERENCES address_book(an8),
  order_date  TEXT NOT NULL,
  delivery_date TEXT,
  warehouse   TEXT NOT NULL REFERENCES warehouses(code),
  business_unit TEXT REFERENCES business_units(code),
  currency    TEXT NOT NULL DEFAULT 'XOF',
  status      TEXT NOT NULL DEFAULT 'DRAFT',  -- DRAFT, CONFIRMED, SHIPPED, INVOICED, CANCELLED
  total_ht    REAL NOT NULL DEFAULT 0,
  total_vat   REAL NOT NULL DEFAULT 0,
  total_ttc   REAL NOT NULL DEFAULT 0,
  notes       TEXT,
  created_by  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sales_order_lines (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    INTEGER NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  line_no     INTEGER NOT NULL,
  item_id     INTEGER REFERENCES items(id),
  description TEXT NOT NULL,
  quantity    REAL NOT NULL,
  uom         TEXT NOT NULL DEFAULT 'U',
  unit_price  REAL NOT NULL,
  discount_pct REAL NOT NULL DEFAULT 0,
  vat_rate    REAL NOT NULL DEFAULT 18.0,
  amount_ht   REAL NOT NULL DEFAULT 0,
  qty_shipped REAL NOT NULL DEFAULT 0,
  qty_invoiced REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS shipments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ship_no    TEXT NOT NULL UNIQUE,
  order_id   INTEGER NOT NULL REFERENCES sales_orders(id),
  ship_date  TEXT NOT NULL,
  warehouse  TEXT NOT NULL REFERENCES warehouses(code),
  status     TEXT NOT NULL DEFAULT 'DONE',
  cogs_amount REAL NOT NULL DEFAULT 0,
  gl_batch_id INTEGER REFERENCES gl_batches(id),
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shipment_lines (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  shipment_id INTEGER NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  order_line_id INTEGER NOT NULL REFERENCES sales_order_lines(id),
  item_id     INTEGER REFERENCES items(id),
  quantity    REAL NOT NULL,
  unit_cost   REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ar_invoices (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no  TEXT NOT NULL UNIQUE,
  customer_an8 INTEGER NOT NULL REFERENCES address_book(an8),
  order_id    INTEGER REFERENCES sales_orders(id),
  invoice_date TEXT NOT NULL,
  due_date    TEXT NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'XOF',
  total_ht    REAL NOT NULL DEFAULT 0,
  total_vat   REAL NOT NULL DEFAULT 0,
  total_ttc   REAL NOT NULL DEFAULT 0,
  amount_paid REAL NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'OPEN',   -- OPEN, PARTIAL, PAID, CANCELLED
  gl_batch_id INTEGER REFERENCES gl_batches(id),
  created_by  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ari_cust ON ar_invoices(customer_an8, status);

CREATE TABLE IF NOT EXISTS ar_invoice_lines (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES ar_invoices(id) ON DELETE CASCADE,
  line_no    INTEGER NOT NULL,
  item_id    INTEGER REFERENCES items(id),
  description TEXT NOT NULL,
  quantity   REAL NOT NULL,
  unit_price REAL NOT NULL,
  vat_rate   REAL NOT NULL DEFAULT 18.0,
  amount_ht  REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ar_receipts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_no  TEXT NOT NULL UNIQUE,
  customer_an8 INTEGER NOT NULL REFERENCES address_book(an8),
  receipt_date TEXT NOT NULL,
  amount      REAL NOT NULL,
  method      TEXT NOT NULL DEFAULT 'VIREMENT', -- ESPECES, VIREMENT, CHEQUE, WAVE, OM
  reference   TEXT,
  gl_batch_id INTEGER REFERENCES gl_batches(id),
  created_by  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ar_applications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_id INTEGER NOT NULL REFERENCES ar_receipts(id) ON DELETE CASCADE,
  invoice_id INTEGER NOT NULL REFERENCES ar_invoices(id),
  amount     REAL NOT NULL
);

-- ---------------------------------------------------------------------
-- 6. ACHATS (commande → réception → facture → paiement)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_orders (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no     TEXT NOT NULL UNIQUE,
  supplier_an8 INTEGER NOT NULL REFERENCES address_book(an8),
  order_date   TEXT NOT NULL,
  expected_date TEXT,
  warehouse    TEXT NOT NULL REFERENCES warehouses(code),
  business_unit TEXT REFERENCES business_units(code),
  currency     TEXT NOT NULL DEFAULT 'XOF',
  status       TEXT NOT NULL DEFAULT 'DRAFT',  -- DRAFT, APPROVED, RECEIVED, INVOICED, CANCELLED
  total_ht     REAL NOT NULL DEFAULT 0,
  total_vat    REAL NOT NULL DEFAULT 0,
  total_ttc    REAL NOT NULL DEFAULT 0,
  notes        TEXT,
  created_by   TEXT,
  approved_by  TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  line_no     INTEGER NOT NULL,
  item_id     INTEGER REFERENCES items(id),
  description TEXT NOT NULL,
  quantity    REAL NOT NULL,
  uom         TEXT NOT NULL DEFAULT 'U',
  unit_cost   REAL NOT NULL,
  vat_rate    REAL NOT NULL DEFAULT 18.0,
  amount_ht   REAL NOT NULL DEFAULT 0,
  qty_received REAL NOT NULL DEFAULT 0,
  qty_invoiced REAL NOT NULL DEFAULT 0,
  expense_account TEXT REFERENCES accounts(code)
);

CREATE TABLE IF NOT EXISTS goods_receipts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_no  TEXT NOT NULL UNIQUE,
  order_id    INTEGER NOT NULL REFERENCES purchase_orders(id),
  receipt_date TEXT NOT NULL,
  warehouse   TEXT NOT NULL REFERENCES warehouses(code),
  total_value REAL NOT NULL DEFAULT 0,
  gl_batch_id INTEGER REFERENCES gl_batches(id),
  created_by  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS goods_receipt_lines (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_id  INTEGER NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  order_line_id INTEGER NOT NULL REFERENCES purchase_order_lines(id),
  item_id     INTEGER REFERENCES items(id),
  quantity    REAL NOT NULL,
  unit_cost   REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS ap_invoices (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no   TEXT NOT NULL UNIQUE,
  supplier_ref TEXT,
  supplier_an8 INTEGER NOT NULL REFERENCES address_book(an8),
  order_id     INTEGER REFERENCES purchase_orders(id),
  invoice_date TEXT NOT NULL,
  due_date     TEXT NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'XOF',
  total_ht     REAL NOT NULL DEFAULT 0,
  total_vat    REAL NOT NULL DEFAULT 0,
  total_ttc    REAL NOT NULL DEFAULT 0,
  amount_paid  REAL NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'OPEN',
  gl_batch_id  INTEGER REFERENCES gl_batches(id),
  created_by   TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ap_invoice_lines (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES ap_invoices(id) ON DELETE CASCADE,
  line_no    INTEGER NOT NULL,
  item_id    INTEGER REFERENCES items(id),
  description TEXT NOT NULL,
  quantity   REAL NOT NULL DEFAULT 1,
  unit_cost  REAL NOT NULL,
  vat_rate   REAL NOT NULL DEFAULT 18.0,
  amount_ht  REAL NOT NULL DEFAULT 0,
  account_code TEXT REFERENCES accounts(code)
);

CREATE TABLE IF NOT EXISTS ap_payments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_no  TEXT NOT NULL UNIQUE,
  supplier_an8 INTEGER NOT NULL REFERENCES address_book(an8),
  payment_date TEXT NOT NULL,
  amount      REAL NOT NULL,
  method      TEXT NOT NULL DEFAULT 'VIREMENT',
  reference   TEXT,
  gl_batch_id INTEGER REFERENCES gl_batches(id),
  created_by  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ap_applications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id INTEGER NOT NULL REFERENCES ap_payments(id) ON DELETE CASCADE,
  invoice_id INTEGER NOT NULL REFERENCES ap_invoices(id),
  amount     REAL NOT NULL
);

-- ---------------------------------------------------------------------
-- 7. PRODUCTION
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS boms (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id   INTEGER NOT NULL REFERENCES items(id),
  version   TEXT NOT NULL DEFAULT '01',
  quantity  REAL NOT NULL DEFAULT 1,      -- quantité produite par la nomenclature
  active    INTEGER NOT NULL DEFAULT 1,
  UNIQUE (item_id, version)
);

CREATE TABLE IF NOT EXISTS bom_lines (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  bom_id        INTEGER NOT NULL REFERENCES boms(id) ON DELETE CASCADE,
  line_no       INTEGER NOT NULL,
  component_id  INTEGER NOT NULL REFERENCES items(id),
  quantity      REAL NOT NULL,
  scrap_pct     REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS work_orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  wo_no       TEXT NOT NULL UNIQUE,
  item_id     INTEGER NOT NULL REFERENCES items(id),
  bom_id      INTEGER REFERENCES boms(id),
  warehouse   TEXT NOT NULL REFERENCES warehouses(code),
  business_unit TEXT REFERENCES business_units(code),
  qty_planned REAL NOT NULL,
  qty_produced REAL NOT NULL DEFAULT 0,
  start_date  TEXT,
  due_date    TEXT,
  status      TEXT NOT NULL DEFAULT 'PLANNED', -- PLANNED, RELEASED, COMPLETED, CLOSED, CANCELLED
  wip_value   REAL NOT NULL DEFAULT 0,
  gl_batch_id INTEGER REFERENCES gl_batches(id),
  created_by  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wo_components (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  wo_id        INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  component_id INTEGER NOT NULL REFERENCES items(id),
  qty_required REAL NOT NULL,
  qty_issued   REAL NOT NULL DEFAULT 0,
  unit_cost    REAL NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
-- 8. RESSOURCES HUMAINES & PAIE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  matricule     TEXT NOT NULL UNIQUE,
  an8           INTEGER REFERENCES address_book(an8),
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  gender        TEXT,
  birth_date    TEXT,
  hire_date     TEXT NOT NULL,
  end_date      TEXT,
  position      TEXT,
  business_unit TEXT REFERENCES business_units(code),
  contract_type TEXT NOT NULL DEFAULT 'CDI',
  base_salary   REAL NOT NULL DEFAULT 0,
  housing_allowance REAL NOT NULL DEFAULT 0,
  transport_allowance REAL NOT NULL DEFAULT 0,
  seniority_pct REAL NOT NULL DEFAULT 0,
  dependents    INTEGER NOT NULL DEFAULT 0,
  bank_account  TEXT,
  payment_method TEXT NOT NULL DEFAULT 'VIREMENT',
  social_number TEXT,
  active        INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  run_no      TEXT NOT NULL UNIQUE,
  fy          INTEGER NOT NULL,
  period      INTEGER NOT NULL,
  pay_date    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'DRAFT',  -- DRAFT, VALIDATED, POSTED
  total_gross REAL NOT NULL DEFAULT 0,
  total_net   REAL NOT NULL DEFAULT 0,
  total_employee_cont REAL NOT NULL DEFAULT 0,
  total_employer_cont REAL NOT NULL DEFAULT 0,
  gl_batch_id INTEGER REFERENCES gl_batches(id),
  created_by  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payslips (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id      INTEGER NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  gross       REAL NOT NULL DEFAULT 0,
  taxable     REAL NOT NULL DEFAULT 0,
  employee_cont REAL NOT NULL DEFAULT 0,
  income_tax  REAL NOT NULL DEFAULT 0,
  other_deductions REAL NOT NULL DEFAULT 0,
  net_pay     REAL NOT NULL DEFAULT 0,
  employer_cont REAL NOT NULL DEFAULT 0,
  total_cost  REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payslip_lines (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  payslip_id INTEGER NOT NULL REFERENCES payslips(id) ON DELETE CASCADE,
  code       TEXT NOT NULL,
  label      TEXT NOT NULL,
  line_type  TEXT NOT NULL,      -- GAIN, RETENUE, PATRONALE
  base       REAL NOT NULL DEFAULT 0,
  rate       REAL NOT NULL DEFAULT 0,
  amount     REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  leave_type  TEXT NOT NULL DEFAULT 'CONGE',
  date_from   TEXT NOT NULL,
  date_to     TEXT NOT NULL,
  days        REAL NOT NULL,
  status      TEXT NOT NULL DEFAULT 'DEMANDE',   -- DEMANDE, APPROUVE, REFUSE
  approved_by TEXT,
  notes       TEXT
);
