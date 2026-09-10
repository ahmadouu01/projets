# -*- coding: utf-8 -*-
"""Paramétrage initial et jeu de données de démonstration de SunuERP.

La démonstration simule une PME sénégalaise : blanchisserie industrielle et
location-entretien de textile professionnel (Setal Pro), avec ses achats, ses
ventes, sa production, sa paie et sa comptabilité sur l'exercice en cours.
"""
import random
from datetime import date, datetime, timedelta

from . import accounting, auth, db, hr, inventory, partners, production, purchasing, sales

SYSTEM = {"username": "system", "role": "ADMIN", "full_name": "Initialisation"}

COMPANY = {
    "code": "SP", "name": "Setal Pro SUARL",
    "legal_form": "SUARL", "tax_id": "005812345 2V2", "trade_register": "SN-DKR-2026-B-0421",
    "address": "Zone industrielle de Diamniadio, lot 214", "city": "Diamniadio",
    "country": "Sénégal", "phone": "+221 33 859 01 00", "email": "contact@setalpro.sn",
    "currency": "XOF", "fiscal_start_month": 1, "vat_rate": 18.0,
}

BUSINESS_UNITS = [
    ("DG", "Direction générale", "DEPT"),
    ("PROD", "Production - Diamniadio", "SITE"),
    ("PRODTH", "Production - Thiès", "SITE"),
    ("COM", "Direction commerciale", "DEPT"),
    ("LOG", "Logistique et tournées", "DEPT"),
    ("ADM", "Administration et finances", "DEPT"),
]

WAREHOUSES = [
    ("DIAM", "Entrepôt central Diamniadio", "PROD", "Diamniadio"),
    ("THIES", "Entrepôt Thiès", "PRODTH", "Thiès"),
    ("SALY", "Dépôt Saly", "LOG", "Mbour"),
]

ACCOUNTS = [
    ("101000", "Capital social", "CAPITAUX"),
    ("110000", "Report à nouveau", "CAPITAUX"),
    ("120000", "Résultat de l'exercice", "CAPITAUX"),
    ("162000", "Emprunts auprès des établissements de crédit", "PASSIF"),
    ("211000", "Logiciels et licences", "ACTIF"),
    ("231000", "Bâtiments industriels", "ACTIF"),
    ("241000", "Matériel industriel de blanchisserie", "ACTIF"),
    ("244000", "Matériel et mobilier de bureau", "ACTIF"),
    ("245000", "Matériel de transport", "ACTIF"),
    ("281000", "Amortissements des immobilisations", "ACTIF"),
    ("311000", "Stocks de marchandises", "ACTIF"),
    ("321000", "Stocks de matières premières et fournitures", "ACTIF"),
    ("331000", "Production en cours", "ACTIF"),
    ("361000", "Stocks de produits finis", "ACTIF"),
    ("401100", "Fournisseurs", "PASSIF"),
    ("408100", "Fournisseurs, factures non parvenues", "PASSIF"),
    ("411100", "Clients", "ACTIF"),
    ("418100", "Clients, factures à établir", "ACTIF"),
    ("421100", "Personnel, rémunérations dues", "PASSIF"),
    ("421200", "Personnel, oppositions et avances", "PASSIF"),
    ("431100", "Organismes sociaux (IPRES, CSS, IPM)", "PASSIF"),
    ("443100", "État, TVA facturée", "PASSIF"),
    ("445100", "État, TVA récupérable", "ACTIF"),
    ("447100", "État, impôts retenus à la source", "PASSIF"),
    ("521100", "Banque - compte principal", "ACTIF"),
    ("521200", "Banque - compte secondaire", "ACTIF"),
    ("571100", "Caisse", "ACTIF"),
    ("601000", "Achats de marchandises", "CHARGE"),
    ("602000", "Achats de matières premières", "CHARGE"),
    ("603100", "Variation des stocks de marchandises", "CHARGE"),
    ("603200", "Variation des stocks de matières", "CHARGE"),
    ("605000", "Achats d'eau, d'électricité et de carburant", "CHARGE"),
    ("612000", "Locations et charges locatives", "CHARGE"),
    ("614000", "Transports et tournées", "CHARGE"),
    ("622000", "Services extérieurs (entretien, télécoms, honoraires)", "CHARGE"),
    ("624000", "Publicité et relations publiques", "CHARGE"),
    ("631000", "Frais bancaires", "CHARGE"),
    ("641000", "Impôts et taxes", "CHARGE"),
    ("658100", "Écarts d'inventaire", "CHARGE"),
    ("661100", "Rémunérations du personnel", "CHARGE"),
    ("664100", "Charges sociales patronales", "CHARGE"),
    ("681000", "Dotations aux amortissements", "CHARGE"),
    ("701100", "Ventes de marchandises", "PRODUIT"),
    ("702100", "Ventes de produits finis", "PRODUIT"),
    ("706100", "Prestations de services vendues", "PRODUIT"),
    ("758100", "Produits divers", "PRODUIT"),
    ("771000", "Revenus financiers", "PRODUIT"),
]

MAPPING = {
    "AR_CONTROL": "411100", "AP_CONTROL": "401100", "VAT_OUT": "443100", "VAT_IN": "445100",
    "SALES_GOODS": "701100", "SALES_FINISHED": "702100", "SALES_SERVICES": "706100",
    "INVENTORY_GOODS": "311000", "INVENTORY_RAW": "321000", "INVENTORY_FINISHED": "361000",
    "COGS": "603100", "COGS_RAW": "603200", "GRNI": "408100",
    "PURCHASE_EXPENSE": "622000", "BANK": "521100", "CASH": "571100", "WIP": "331000",
    "STOCK_ADJ": "658100", "PAYROLL_EXPENSE": "661100", "PAYROLL_EMPLOYER": "664100",
    "PAYROLL_NET": "421100", "PAYROLL_SOCIAL": "431100", "PAYROLL_TAX": "447100",
    "RESULT": "120000",
}

NEXT_NUMBERS = [
    ("SO", "CV", 5), ("SH", "BL", 5), ("INV", "FV", 5), ("REC", "RC", 5),
    ("PO", "CA", 5), ("GR", "BR", 5), ("API", "FA", 5), ("PAY", "RG", 5),
    ("JE", "LOT", 5), ("WO", "OF", 5), ("PR", "PAIE", 3), ("ADJ", "REG", 5), ("TRF", "TRF", 5),
]

UDC = [
    ("00", "PT", "COMPTANT", "Paiement comptant"), ("00", "PT", "15J", "15 jours"),
    ("00", "PT", "30J", "30 jours"), ("00", "PT", "45J", "45 jours"),
    ("00", "PT", "60J", "60 jours"), ("00", "PT", "90J", "90 jours"),
    ("00", "MP", "ESPECES", "Espèces"), ("00", "MP", "VIREMENT", "Virement bancaire"),
    ("00", "MP", "CHEQUE", "Chèque"), ("00", "MP", "WAVE", "Wave"),
    ("00", "MP", "OM", "Orange Money"),
    ("41", "TY", "STOCK", "Marchandise stockée"), ("41", "TY", "MATIERE", "Matière première"),
    ("41", "TY", "FINI", "Produit fini"), ("41", "TY", "SERVICE", "Service"),
    ("41", "UM", "U", "Unité"), ("41", "UM", "KG", "Kilogramme"),
    ("41", "UM", "L", "Litre"), ("41", "UM", "M", "Mètre"), ("41", "UM", "ROU", "Rouleau"),
    ("41", "CT", "LINGE", "Linge plat"), ("41", "CT", "VETEMENT", "Vêtement de travail"),
    ("41", "CT", "HYGIENE", "Hygiène et sanitaires"), ("41", "CT", "TAPIS", "Tapis"),
    ("41", "CT", "CONSOM", "Consommables et produits lessiviels"),
    ("41", "CT", "SERVICE", "Prestations"),
    ("01", "ST", "C", "Client"), ("01", "ST", "V", "Fournisseur"),
    ("01", "ST", "E", "Salarié"), ("01", "ST", "O", "Autre tiers"),
    ("07", "CT", "CDI", "Contrat à durée indéterminée"),
    ("07", "CT", "CDD", "Contrat à durée déterminée"),
    ("07", "CT", "CADRE", "Cadre"), ("07", "CT", "STAGE", "Stage"),
]

USERS = [
    ("admin", "admin123", "Administrateur système", "ADMIN", "ADM"),
    ("compta", "compta123", "Awa Ndiaye — comptabilité", "COMPTABLE", "ADM"),
    ("commercial", "commercial123", "Cheikh Fall — commercial", "COMMERCIAL", "COM"),
    ("magasin", "magasin123", "Ousmane Ba — magasin", "MAGASINIER", "LOG"),
    ("rh", "rh123", "Mariama Sarr — ressources humaines", "RH", "ADM"),
]

CUSTOMERS = [
    ("HÔTEL TERANGA DAKAR", "Dakar", "30J", 40000000),
    ("RESORT SALY BEACH", "Mbour", "45J", 60000000),
    ("CLINIQUE MADINA", "Dakar", "30J", 25000000),
    ("HÔPITAL RÉGIONAL DE THIÈS", "Thiès", "60J", 30000000),
    ("SÉNÉGAL AGRO SA", "Rufisque", "30J", 35000000),
    ("OCÉAN PÊCHE SA", "Dakar", "30J", 28000000),
    ("DIAM BTP", "Diamniadio", "45J", 20000000),
    ("BANQUE DE L'OUEST", "Dakar", "30J", 15000000),
    ("RESIDENCE NGOR SUITES", "Dakar", "30J", 12000000),
    ("LODGE SAINT-LOUIS", "Saint-Louis", "45J", 10000000),
    ("MINES DE KÉDOUGOU SA", "Kédougou", "60J", 50000000),
    ("RESTAURANT LE BAOBAB", "Dakar", "COMPTANT", 3000000),
    ("CLINIQUE DE LA PAIX", "Mbour", "30J", 14000000),
    ("SUPERMARCHÉ TERANGA", "Dakar", "30J", 9000000),
]

SUPPLIERS = [
    ("TEXTILE IMPORT SARL", "Dakar", "30J", "Textile"),
    ("CHIMIE INDUSTRIELLE SN", "Rufisque", "45J", "Produits lessiviels"),
    ("SENELEC", "Dakar", "30J", "Énergie"),
    ("SEN'EAU", "Dakar", "30J", "Eau"),
    ("TRANSPORT LOGISTIQUE SN", "Diamniadio", "30J", "Transport"),
    ("EQUIP BLANCHISSERIE EUROPE", "Dakar", "60J", "Matériel"),
    ("PAPETERIE DU FLEUVE", "Saint-Louis", "30J", "Fournitures"),
    ("SÉCURITÉ TERANGA", "Dakar", "30J", "Services"),
]

ITEMS = [
    # code, désignation, type, catégorie, unité, prix de vente, coût, mini
    ("LIN-DRAP-240", "Drap plat 240x300 polycoton", "STOCK", "LINGE", "U", 9500, 5200, 200),
    ("LIN-DRAP-HOU", "Drap housse 160x200", "STOCK", "LINGE", "U", 8500, 4600, 150),
    ("LIN-SERV-BN", "Serviette de bain 70x140", "STOCK", "LINGE", "U", 6500, 3400, 300),
    ("LIN-SERV-MN", "Serviette de main 50x90", "STOCK", "LINGE", "U", 3200, 1600, 400),
    ("LIN-PEIGN", "Peignoir éponge", "STOCK", "LINGE", "U", 18500, 11000, 60),
    ("LIN-NAPPE", "Nappe 180x180 coton", "STOCK", "LINGE", "U", 12000, 6800, 80),
    ("VET-BLOUSE-AG", "Blouse agroalimentaire blanche", "FINI", "VETEMENT", "U", 14500, 0, 100),
    ("VET-COMBI", "Combinaison de travail bleue", "STOCK", "VETEMENT", "U", 21000, 12500, 80),
    ("VET-PARKA-HV", "Parka haute visibilité", "STOCK", "VETEMENT", "U", 32000, 19000, 40),
    ("VET-TENUE-MED", "Tenue médicale 2 pièces", "STOCK", "VETEMENT", "U", 17500, 9800, 120),
    ("VET-TABLIER", "Tablier de cuisine", "STOCK", "VETEMENT", "U", 7500, 3900, 100),
    ("TAP-LOGO-120", "Tapis logoté 120x180", "FINI", "TAPIS", "U", 45000, 0, 20),
    ("TAP-STD-90", "Tapis anti-salissure 90x150", "STOCK", "TAPIS", "U", 28000, 16000, 30),
    ("HYG-SAV-5L", "Savon mousse bidon 5 L", "STOCK", "HYGIENE", "L", 12500, 7200, 60),
    ("HYG-PAPIER", "Papier essuie-mains (colis 6)", "STOCK", "HYGIENE", "U", 15000, 9000, 80),
    ("HYG-DIST-SAV", "Distributeur de savon inox", "STOCK", "HYGIENE", "U", 32000, 18500, 25),
    ("HYG-GEL-1L", "Gel hydroalcoolique 1 L", "STOCK", "HYGIENE", "L", 4500, 2400, 100),
    ("MAT-TISSU-PC", "Tissu polycoton 240g (rouleau 50 m)", "MATIERE", "CONSOM", "ROU", 0, 145000, 15),
    ("MAT-FIL", "Bobine de fil industriel", "MATIERE", "CONSOM", "U", 0, 3500, 40),
    ("MAT-BOUTON", "Sachet de 100 boutons", "MATIERE", "CONSOM", "U", 0, 2500, 30),
    ("MAT-LESSIVE", "Lessive industrielle (fût 20 kg)", "MATIERE", "CONSOM", "KG", 0, 38000, 20),
    ("MAT-DESINF", "Désinfectant chloré (bidon 10 L)", "MATIERE", "CONSOM", "L", 0, 24000, 20),
    ("MAT-ADOUC", "Adoucissant industriel (fût 20 L)", "MATIERE", "CONSOM", "L", 0, 29000, 15),
    ("MAT-EMBAL", "Housse de protection (rouleau)", "MATIERE", "CONSOM", "ROU", 0, 12000, 25),
    ("SRV-LOCENT", "Location-entretien mensuelle par tenue", "SERVICE", "SERVICE", "U", 4500, 0, 0),
    ("SRV-LAVKG", "Lavage industriel au kilo", "SERVICE", "SERVICE", "KG", 850, 0, 0),
    ("SRV-TAPIS", "Échange hebdomadaire de tapis", "SERVICE", "SERVICE", "U", 3500, 0, 0),
    ("SRV-3D", "Intervention dératisation / désinsectisation", "SERVICE", "SERVICE", "U", 85000, 0, 0),
]

EMPLOYEES = [
    ("Mamadou", "DIOP", "Directeur général", "DG", "CADRE", 1250000, 300000, 60000, 15, 4),
    ("Awa", "NDIAYE", "Directrice administrative et financière", "ADM", "CADRE", 950000, 200000, 50000, 10, 3),
    ("Cheikh", "FALL", "Responsable commercial", "COM", "CADRE", 780000, 150000, 50000, 8, 2),
    ("Mariama", "SARR", "Responsable ressources humaines", "ADM", "CADRE", 720000, 150000, 50000, 6, 2),
    ("Ousmane", "BA", "Chef de production", "PROD", "CADRE", 650000, 120000, 40000, 12, 5),
    ("Fatou", "SECK", "Chef d'équipe blanchisserie", "PROD", "CDI", 320000, 0, 30000, 9, 3),
    ("Ibrahima", "GUEYE", "Conducteur-livreur", "LOG", "CDI", 210000, 0, 35000, 6, 4),
    ("Aissatou", "CAMARA", "Opératrice de production", "PROD", "CDI", 165000, 0, 26000, 4, 2),
    ("Modou", "SOW", "Opérateur de production", "PROD", "CDI", 165000, 0, 26000, 3, 1),
    ("Ndeye", "THIAM", "Opératrice de finition", "PRODTH", "CDI", 158000, 0, 26000, 5, 3),
    ("Alioune", "KANE", "Technicien de maintenance", "PROD", "CDI", 285000, 0, 30000, 7, 2),
    ("Bineta", "DIALLO", "Assistante commerciale", "COM", "CDI", 245000, 0, 26000, 2, 0),
    ("Serigne", "MBAYE", "Magasinier", "LOG", "CDI", 195000, 0, 26000, 4, 3),
    ("Khady", "DIENG", "Comptable", "ADM", "CDI", 380000, 50000, 30000, 5, 1),
]


def _iso(value):
    return value.isoformat() if hasattr(value, "isoformat") else value


# --------------------------------------------------------------------- paramétrage
def build_reference_data():
    """Société, entrepôts, plan comptable, UDC, utilisateurs : le socle indispensable."""
    if not db.query_one("SELECT code FROM companies WHERE code = ?", (COMPANY["code"],)):
        db.insert("companies", COMPANY)
    db.set_setting("company", COMPANY["code"])
    db.set_setting("default_warehouse", "DIAM")
    db.set_setting("po_approval_threshold", "5000000")
    db.set_setting("allow_negative_stock", "0")

    for code, name, symbol, decimals in [("XOF", "Franc CFA (BCEAO)", "F CFA", 0),
                                         ("EUR", "Euro", "€", 2),
                                         ("USD", "Dollar américain", "$", 2)]:
        db.execute("INSERT OR IGNORE INTO currencies (code, name, symbol, decimals) "
                   "VALUES (?, ?, ?, ?)", (code, name, symbol, decimals))
    db.execute("INSERT OR IGNORE INTO exchange_rates (from_ccy, to_ccy, rate_date, rate) "
               "VALUES ('EUR', 'XOF', ?, 655.957)", (db.today(),))

    for code, name, bu_type in BUSINESS_UNITS:
        db.execute("INSERT OR IGNORE INTO business_units (code, name, company, bu_type) "
                   "VALUES (?, ?, ?, ?)", (code, name, COMPANY["code"], bu_type))
    for code, name, bu, city in WAREHOUSES:
        db.execute("INSERT OR IGNORE INTO warehouses (code, name, business_unit, city) "
                   "VALUES (?, ?, ?, ?)", (code, name, bu, city))

    for code, name, account_type in ACCOUNTS:
        db.execute("INSERT OR IGNORE INTO accounts (code, name, account_type, class, postable) "
                   "VALUES (?, ?, ?, ?, 1)", (code, name, account_type, int(code[0])))
    for key, account in MAPPING.items():
        db.execute("INSERT INTO gl_mapping (key, account_code, description) VALUES (?, ?, ?) "
                   "ON CONFLICT(key) DO UPDATE SET account_code = excluded.account_code",
                   (key, account, accounting.MAPPING_KEYS.get(key, key)))

    for doc_type, prefix, padding in NEXT_NUMBERS:
        db.execute("INSERT OR IGNORE INTO next_numbers (doc_type, prefix, next_value, padding) "
                   "VALUES (?, ?, 1, ?)", (doc_type, prefix, padding))
    for system, code_type, code, description in UDC:
        db.execute("INSERT OR IGNORE INTO udc (system, code_type, code, description) "
                   "VALUES (?, ?, ?, ?)", (system, code_type, code, description))

    auth.seed_roles()
    for username, password, full_name, role, bu in USERS:
        if not db.query_one("SELECT id FROM users WHERE username = ?", (username,)):
            auth.create_user(username, password, full_name, role, business_unit=bu)

    year = int(db.today()[:4])
    for fy in (year - 1, year):
        accounting.generate_fiscal_calendar(COMPANY["code"], fy, COMPANY["fiscal_start_month"])


# --------------------------------------------------------------------- démonstration
def build_demo():
    """Crée un exercice complet : ouverture, achats, ventes, production, paie."""
    rng = random.Random(20260910)
    today = date.today()
    year = today.year
    start = date(year, 1, 1)

    # ---- tiers
    customer_ids = []
    for name, city, terms, limit in CUSTOMERS:
        partner = partners.save_partner({
            "alpha_name": name, "search_type": "C", "is_customer": True,
            "city": city, "country": "Sénégal",
            "phone": "+221 33 %d %02d %02d" % (rng.randint(800, 899), rng.randint(0, 99),
                                               rng.randint(0, 99)),
            "email": "contact@%s.sn" % name.split()[0].lower().replace("'", ""),
            "payment_terms": terms, "credit_limit": limit,
            "tax_id": "00%d 2A%d" % (rng.randint(1000000, 9999999), rng.randint(1, 9)),
        }, SYSTEM)
        customer_ids.append(partner["an8"])

    supplier_ids = []
    for name, city, terms, category in SUPPLIERS:
        partner = partners.save_partner({
            "alpha_name": name, "search_type": "V", "is_supplier": True,
            "city": city, "country": "Sénégal",
            "phone": "+221 33 %d %02d %02d" % (rng.randint(800, 899), rng.randint(0, 99),
                                               rng.randint(0, 99)),
            "email": "achats@%s.sn" % name.split()[0].lower(),
            "supplier_payment_terms": terms, "supplier_category": category,
        }, SYSTEM)
        supplier_ids.append(partner["an8"])

    # ---- articles
    items = {}
    for code, label, item_type, category, uom, price, cost, mini in ITEMS:
        item = inventory.save_item({
            "item_code": code, "description": label, "item_type": item_type,
            "category": category, "uom": uom, "sale_price": price, "standard_cost": cost,
            "vat_rate": 18, "min_stock": mini, "lead_time_days": rng.choice([5, 7, 10, 15]),
            "supplier_an8": supplier_ids[0] if item_type == "MATIERE" else None,
        }, SYSTEM)
        items[code] = item

    # ---- salariés
    for first, last, position, bu, contract, base, housing, transport, seniority, kids in EMPLOYEES:
        hr.save_employee({
            "first_name": first, "last_name": last, "position": position,
            "business_unit": bu, "contract_type": contract, "base_salary": base,
            "housing_allowance": housing, "transport_allowance": transport,
            "seniority_pct": seniority, "dependents": kids,
            "hire_date": (start - timedelta(days=rng.randint(200, 2500))).isoformat(),
            "bank_account": "SN012 0100%d" % rng.randint(100000, 999999),
        }, SYSTEM)

    # ---- écriture d'ouverture (apport en capital et trésorerie)
    opening = date(year, 1, 2).isoformat()
    accounting.create_batch("G", "À-nouveaux : apport en capital", opening, [
        {"account": "521100", "debit": 120000000, "description": "Banque - compte principal"},
        {"account": "571100", "debit": 2500000, "description": "Caisse"},
        {"account": "241000", "debit": 85000000, "description": "Matériel de blanchisserie"},
        {"account": "245000", "debit": 32000000, "description": "Camions de tournée"},
        {"account": "101000", "credit": 189500000, "description": "Capital social"},
        {"account": "162000", "credit": 50000000, "description": "Emprunt d'équipement"},
    ], SYSTEM, auto_post=True)

    # ---- approvisionnements : commande → réception → facture → paiement
    # seuls les articles achetés (marchandises et matières) alimentent les commandes d'achat
    stock_items = [i[0] for i in ITEMS if i[2] in ("STOCK", "MATIERE")]
    months = [m for m in range(1, today.month + 1)]
    po_ids = []
    for month in months:
        for supplier_an8 in rng.sample(supplier_ids[:2] + supplier_ids[5:7], 2):
            order_date = date(year, month, rng.randint(2, 10))
            if order_date > today:
                continue
            chosen = rng.sample(stock_items, rng.randint(3, 6))
            lines = []
            for code in chosen:
                item = items[code]
                qty = rng.choice([80, 120, 150, 200, 250, 300])
                if item["item_type"] == "MATIERE":
                    qty = rng.choice([15, 20, 30, 40, 50])
                cost = item["standard_cost"] * rng.uniform(0.95, 1.06)
                lines.append({"item_id": item["id"], "quantity": qty,
                              "unit_cost": round(cost, 0), "vat_rate": 18})
            order = purchasing.save_order({
                "supplier_an8": supplier_an8, "order_date": order_date.isoformat(),
                "warehouse": rng.choice(["DIAM", "DIAM", "THIES"]),
                "business_unit": "LOG", "lines": lines,
                "notes": "Réapprovisionnement %02d/%d" % (month, year)}, SYSTEM)
            purchasing.approve_order(order["id"], SYSTEM)
            receipt_date = order_date + timedelta(days=rng.randint(3, 9))
            if receipt_date > today:
                po_ids.append(order["id"])
                continue
            purchasing.receive_order(order["id"], SYSTEM, receipt_date.isoformat())
            invoice_date = receipt_date + timedelta(days=rng.randint(0, 4))
            if invoice_date <= today:
                invoice = purchasing.invoice_order(
                    order["id"], SYSTEM, invoice_date.isoformat(),
                    supplier_ref="FF-%d-%04d" % (year, rng.randint(1000, 9999)))
                if rng.random() < 0.7:
                    pay_date = min(invoice_date + timedelta(days=rng.randint(15, 40)), today)
                    purchasing.register_payment({
                        "supplier_an8": supplier_an8, "amount": invoice["total_ttc"],
                        "date": pay_date.isoformat(), "method": rng.choice(
                            ["VIREMENT", "VIREMENT", "CHEQUE"]),
                        "reference": "REG-%04d" % rng.randint(1000, 9999)}, SYSTEM)
            po_ids.append(order["id"])

    # ---- approvisionnement dédié en matières premières (alimente la production)
    matieres = [code for code, *_ in [(i[0], i[2]) for i in ITEMS] if items[code]["item_type"] == "MATIERE"]
    for month in months[:2]:
        order_date = date(year, month, 12)
        if order_date > today:
            continue
        order = purchasing.save_order({
            "supplier_an8": supplier_ids[0], "order_date": order_date.isoformat(),
            "warehouse": "DIAM", "business_unit": "PROD",
            "notes": "Approvisionnement matières premières",
            "lines": [{"item_id": items[code]["id"], "quantity": 80,
                       "unit_cost": items[code]["standard_cost"], "vat_rate": 18}
                      for code in matieres]}, SYSTEM)
        purchasing.approve_order(order["id"], SYSTEM)
        receipt_date = min(order_date + timedelta(days=5), today)
        purchasing.receive_order(order["id"], SYSTEM, receipt_date.isoformat())
        invoice = purchasing.invoice_order(order["id"], SYSTEM, receipt_date.isoformat(),
                                           supplier_ref="MP-%d-%02d" % (year, month))
        purchasing.register_payment({
            "supplier_an8": supplier_ids[0], "amount": invoice["total_ttc"],
            "date": min(receipt_date + timedelta(days=20), today).isoformat(),
            "method": "VIREMENT"}, SYSTEM)

    # ---- charges courantes (factures fournisseurs directes)
    charges = [("SENELEC", "605000", "Électricité", 1800000, 2600000),
               ("SEN'EAU", "605000", "Eau industrielle", 900000, 1400000),
               ("TRANSPORT LOGISTIQUE SN", "614000", "Tournées de livraison", 1200000, 1900000),
               ("SÉCURITÉ TERANGA", "622000", "Gardiennage des sites", 600000, 850000)]
    for month in months:
        for supplier_name, account, label, low, high in charges:
            invoice_date = date(year, month, rng.randint(20, 27))
            if invoice_date > today:
                continue
            supplier = db.query_one("SELECT an8 FROM address_book WHERE alpha_name = ?",
                                    (supplier_name,))
            invoice = purchasing.create_expense_invoice({
                "supplier_an8": supplier["an8"], "invoice_date": invoice_date.isoformat(),
                "supplier_ref": "%s-%02d%d" % (label[:3].upper(), month, year),
                "lines": [{"description": "%s %02d/%d" % (label, month, year),
                           "amount_ht": rng.randint(low, high), "vat_rate": 18,
                           "account_code": account}]}, SYSTEM)
            if rng.random() < 0.8:
                pay_date = min(invoice_date + timedelta(days=rng.randint(5, 25)), today)
                purchasing.register_payment({
                    "supplier_an8": supplier["an8"], "amount": invoice["total_ttc"],
                    "date": pay_date.isoformat(), "method": "VIREMENT"}, SYSTEM)

    # ---- production : nomenclatures puis ordres de fabrication
    production.save_bom({
        "item_id": items["VET-BLOUSE-AG"]["id"], "version": "01", "quantity": 100,
        "lines": [{"component_id": items["MAT-TISSU-PC"]["id"], "quantity": 3, "scrap_pct": 5},
                  {"component_id": items["MAT-FIL"]["id"], "quantity": 4},
                  {"component_id": items["MAT-BOUTON"]["id"], "quantity": 5},
                  {"component_id": items["MAT-EMBAL"]["id"], "quantity": 1}]}, SYSTEM)
    production.save_bom({
        "item_id": items["TAP-LOGO-120"]["id"], "version": "01", "quantity": 20,
        "lines": [{"component_id": items["MAT-TISSU-PC"]["id"], "quantity": 2},
                  {"component_id": items["MAT-FIL"]["id"], "quantity": 1},
                  {"component_id": items["MAT-EMBAL"]["id"], "quantity": 1}]}, SYSTEM)

    for month in months[2::2]:
        wo_date = date(year, month, rng.randint(8, 14))
        if wo_date > today:
            continue
        try:
            wo = production.create_work_order({
                "item_id": items["VET-BLOUSE-AG"]["id"], "qty_planned": rng.choice([100, 150, 200]),
                "warehouse": "DIAM", "business_unit": "PROD",
                "start_date": wo_date.isoformat(),
                "due_date": (wo_date + timedelta(days=10)).isoformat()}, SYSTEM)
            production.release_work_order(wo["id"], SYSTEM)
            production.issue_components(wo["id"], SYSTEM, wo_date.isoformat())
            production.complete_work_order(
                wo["id"], SYSTEM, wo["qty_planned"],
                (wo_date + timedelta(days=6)).isoformat())
        except Exception as exc:      # stock de matières insuffisant : OF laissé en cours
            print("  · OF non terminé (%s)" % exc)

    # ---- ventes : commande → livraison → facture → encaissement
    sellable = [code for code in items
                if items[code]["item_type"] != "MATIERE" and items[code]["sale_price"] > 0]

    def outstanding_of(an8):
        return db.scalar("SELECT COALESCE(SUM(total_ttc - amount_paid), 0) FROM ar_invoices "
                         "WHERE customer_an8 = ? AND status IN ('OPEN', 'PARTIAL')", (an8,), 0)

    for month in months:
        for _ in range(rng.randint(5, 8)):
            order_date = date(year, month, rng.randint(3, 27))
            if order_date > today:
                continue
            customer_an8 = rng.choice(customer_ids)
            warehouse = rng.choice(["DIAM", "DIAM", "DIAM", "THIES"])
            limit = db.scalar("SELECT credit_limit FROM customers WHERE an8 = ?",
                              (customer_an8,), 0)
            budget = max(limit - outstanding_of(customer_an8), 0) * 0.85 if limit else 1e12
            lines, running = [], 0.0

            for code in rng.sample(sellable, rng.randint(2, 5)):
                item = items[code]
                price = item["sale_price"]
                if item["item_type"] == "SERVICE":
                    qty = rng.choice([40, 80, 120, 200, 300])
                else:
                    available = inventory.stock_on_hand(item["id"], warehouse)
                    if available < 12:
                        continue
                    qty = min(rng.choice([10, 15, 20, 25, 40]), int(available * 0.3))
                    if qty <= 0:
                        continue
                line_ttc = qty * price * 1.18
                if running + line_ttc > budget:
                    qty = int(max(budget - running, 0) / (price * 1.18))
                    line_ttc = qty * price * 1.18
                    if qty <= 0:
                        continue
                running += line_ttc
                lines.append({"item_id": item["id"], "quantity": qty, "unit_price": price,
                              "discount_pct": rng.choice([0, 0, 0, 5, 10]), "vat_rate": 18})
            if not lines:
                continue

            try:
                order = sales.save_order({
                    "customer_an8": customer_an8, "order_date": order_date.isoformat(),
                    "warehouse": warehouse, "business_unit": "COM", "lines": lines}, SYSTEM)
                sales.confirm_order(order["id"], SYSTEM)
                ship_date = min(order_date + timedelta(days=rng.randint(1, 6)), today)
                sales.ship_order(order["id"], SYSTEM, ship_date.isoformat())
                invoice_date = min(ship_date + timedelta(days=rng.randint(0, 3)), today)
                invoice = sales.invoice_order(order["id"], SYSTEM, invoice_date.isoformat())
                if rng.random() < 0.72:
                    receipt_date = min(invoice_date + timedelta(days=rng.randint(10, 45)), today)
                    amount = invoice["total_ttc"] if rng.random() < 0.8 \
                        else round(invoice["total_ttc"] * 0.5)
                    sales.register_receipt({
                        "customer_an8": customer_an8, "amount": amount,
                        "date": receipt_date.isoformat(),
                        "method": rng.choice(["VIREMENT", "VIREMENT", "CHEQUE", "WAVE", "OM"]),
                        "reference": "ENC-%04d" % rng.randint(1000, 9999)}, SYSTEM)
            except Exception as exc:   # la commande reste en attente : cas réaliste, on continue
                print("  · Commande client laissée en attente (%s)" % exc)

    # ---- quelques commandes clients encore ouvertes
    for _ in range(4):
        order_date = today - timedelta(days=rng.randint(1, 12))
        item = items[rng.choice(["SRV-LOCENT", "LIN-SERV-BN", "VET-COMBI", "SRV-LAVKG"])]
        order = sales.save_order({
            "customer_an8": rng.choice(customer_ids), "order_date": order_date.isoformat(),
            "warehouse": "DIAM", "business_unit": "COM",
            "lines": [{"item_id": item["id"], "quantity": rng.choice([25, 50, 80]),
                       "unit_price": item["sale_price"], "vat_rate": 18}]}, SYSTEM)
        if rng.random() < 0.5:
            sales.confirm_order(order["id"], SYSTEM)

    # ---- paie des mois écoulés
    for month in months[:-1] if today.day < 25 else months:
        pay_date = date(year, month, 28) if month != 2 else date(year, 2, 26)
        if pay_date > today:
            continue
        try:
            run = hr.create_run({"fy": year, "period": month,
                                 "pay_date": pay_date.isoformat()}, SYSTEM)
            hr.validate_run(run["id"], SYSTEM)
            hr.post_run(run["id"], SYSTEM, pay_date.isoformat())
            hr.pay_run(run["id"], SYSTEM, pay_date.isoformat())
        except Exception as exc:
            print("  · Paie %02d non traitée (%s)" % (month, exc))

    # ---- une régularisation d'inventaire et un transfert entre entrepôts
    try:
        item = items["LIN-SERV-MN"]
        current = inventory.stock_on_hand(item["id"], "DIAM")
        if current > 5:
            inventory.adjust_stock({
                "item_id": item["id"], "warehouse": "DIAM",
                "counted_qty": current - 3, "date": today.isoformat(),
                "reason": "Inventaire tournant : 3 pièces manquantes"}, SYSTEM)
        stock_item = items["HYG-GEL-1L"]
        if inventory.stock_on_hand(stock_item["id"], "DIAM") > 10:
            inventory.transfer_stock({
                "item_id": stock_item["id"], "quantity": 10,
                "from_warehouse": "DIAM", "to_warehouse": "SALY",
                "date": today.isoformat()}, SYSTEM)
    except Exception as exc:
        print("  · Mouvement de stock de démonstration ignoré (%s)" % exc)

    # ---- une écriture manuelle laissée en brouillon (à comptabiliser depuis l'interface)
    accounting.create_batch("G", "Dotation aux amortissements du mois", today.isoformat(), [
        {"account": "681000", "debit": 2400000, "description": "Dotation matériel"},
        {"account": "281000", "credit": 2400000, "description": "Amortissements cumulés"},
    ], SYSTEM, auto_post=False)


def build(with_demo=True):
    build_reference_data()
    if with_demo and not db.query_one("SELECT an8 FROM address_book LIMIT 1"):
        print("Génération du jeu de données de démonstration…")
        build_demo()
        print("Jeu de démonstration prêt.")
