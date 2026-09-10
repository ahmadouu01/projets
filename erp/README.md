# SunuERP — progiciel de gestion intégré

ERP complet pour une PME ou une ETI sénégalaise, inspiré du périmètre et du
vocabulaire de JD Edwards EnterpriseOne (répertoire d'adresses, codes
utilisateur, numérotation automatique, lots à comptabiliser, états d'intégrité),
adapté au plan comptable SYSCOHADA, au franc CFA et à la paie sénégalaise.

**Aucune dépendance à installer** : uniquement Python 3 (bibliothèque standard)
et un navigateur. Le serveur, la base SQLite et l'interface web sont dans ce dossier.

```bash
cd erp
python3 run.py --demo        # première fois : crée la base et le jeu de démonstration
python3 run.py               # ensuite
# puis ouvrir http://localhost:8090
```

Comptes de démonstration : `admin/admin123`, `compta/compta123`,
`commercial/commercial123`, `magasin/magasin123`, `rh/rh123`.

## Version en un seul fichier (démonstration hors ligne)

`sunuerp-demo.html` contient **toute l'interface et tout le jeu de démonstration
dans un seul fichier** (2,5 Mo) : il s'ouvre d'un double-clic, sans Python, sans
serveur et sans réseau. Les 41 écrans, les documents imprimables (facture,
bulletin, relevé), les états financiers et les graphiques sont là ; la
**consultation est complète, les saisies sont désactivées** — l'écriture suppose
le moteur comptable, donc le serveur Python.

Il se régénère à partir de la base courante :

```bash
python3 tools/export_demo.py        # exporte les réponses de lecture de l'API
python3 tools/build_single_file.py  # assemble sunuerp-demo.html
```

## Périmètre fonctionnel

| Module | Ce qui est couvert |
|---|---|
| **Comptabilité générale** | Plan comptable SYSCOHADA, saisie en partie double contrôlée à l'équilibre, lots brouillon → comptabilisés, contrepassation, périodes ouvertes/clôturées, balance générale, grand livre, compte de résultat, bilan, déclaration de TVA, états d'intégrité (rapprochement auxiliaires ↔ collectifs). |
| **Ventes** | Commande client → livraison → facture → encaissement, contrôle d'encours et de blocage client, lettrage automatique des règlements, balance âgée, relevé de compte, analyse des ventes, facture imprimable. |
| **Achats** | Commande fournisseur → approbation (seuil paramétrable) → réception → facture → règlement, factures de charges sans commande, compte « factures non parvenues », balance âgée fournisseurs. |
| **Stocks** | Articles, entrepôts, valorisation en coût moyen pondéré, mouvements tracés, régularisations d'inventaire comptabilisées, transferts inter-entrepôts, alertes de réapprovisionnement, valorisation. |
| **Production** | Nomenclatures multi-composants avec taux de rebut, ordres de fabrication, consommation des composants vers l'en-cours, déclaration de production valorisée, besoins nets en composants. |
| **Ressources humaines** | Dossiers salariés, campagnes de paie (IPRES régime général et cadres, CSS, IPM, impôt sur le revenu progressif, TRIMF), bulletins imprimables, comptabilisation et paiement des salaires, congés, effectifs. |
| **Répertoire d'adresses** | Fiche tiers unique pouvant être client, fournisseur et salarié à la fois. |
| **Administration** | Utilisateurs, profils et matrice d'habilitations (lecture / écriture / comptabilisation par module), codes utilisateur (UDC), numérotation des documents, société et centres de coût, paramètres, journal d'audit. |

Chaque opération de gestion génère **automatiquement** ses écritures comptables
équilibrées : facture client (411 / 70x / 443), coût des ventes (603 / 31x),
réception (31x / 408), facture fournisseur (408 / 445 / 401), règlements
(521 ou 571), production (331 puis 36x), paie (661, 664 / 421, 431, 447).

## Architecture

```
run.py                  serveur HTTP (http.server) : API REST + fichiers de l'interface
erp/
  schema.sql            schéma complet de la base (40 tables)
  db.py                 connexions, transactions, numérotation, audit, périodes
  auth.py               mots de passe (PBKDF2), sessions, profils et habilitations
  accounting.py         moteur comptable : lots, comptabilisation, balances, états
  inventory.py          articles, mouvements, coût moyen pondéré, régularisations
  partners.py           répertoire d'adresses, clients, fournisseurs
  sales.py              cycle de vente et encaissements
  purchasing.py         cycle d'achat et règlements
  production.py         nomenclatures et ordres de fabrication
  hr.py                 salariés, calcul de paie, comptabilisation
  reports.py            tableau de bord, TVA, journal d'audit
  api.py                routage REST et contrôle des habilitations
  seed.py               paramétrage initial et jeu de démonstration
web/                    interface monopage (HTML/CSS/JS natif, sans framework)
tests/test_erp.py       31 tests des règles de gestion
data/                   base SQLite (ignorée par git)
```

### Interface

Application monopage : menu par modules, accès rapide par nom d'écran, grilles de
travail (tri, recherche, export CSV), documents imprimables (facture, bulletin,
relevé), tableau de bord avec indicateurs et graphiques. Le menu et les actions
s'adaptent aux habilitations de l'utilisateur connecté.

Les couleurs de données suivent une palette validée pour les daltonismes
(bleu `#2a78d6` / orange `#eb6834` en catégoriel, rampe bleue monochrome pour les
séries ordonnées, statuts réservés aux alertes).

## Tests

```bash
python3 -m unittest discover -s tests -v
```

Les tests vérifient les invariants du progiciel : équilibre de toute écriture,
refus des lots déséquilibrés, blocage des périodes clôturées, coût moyen pondéré,
interdiction du stock négatif, enchaînement complet des cycles vente et achat,
contrôle d'encours client, ordre de fabrication (consommation → production),
arithmétique de la paie et équilibre de son écriture, habilitations et sessions,
équilibre du bilan et états d'intégrité.

## Options de démarrage

```bash
python3 run.py --port 9000     # changer de port
python3 run.py --reset --demo  # repartir d'une base neuve avec la démonstration
python3 run.py --no-serve      # préparer la base sans démarrer le serveur
SUNUERP_DB=/chemin/erp.db python3 run.py   # emplacement de la base
```

## Ce que ce logiciel n'est pas

Il s'agit d'une base fonctionnelle sérieuse, pas d'un progiciel homologué. Avant
un usage en production, il faut au minimum :

- faire valider par un expert-comptable les taux de paie (IPRES, CSS, IPM, IR,
  TRIMF) et le paramétrage des comptes automatiques ; les valeurs livrées sont
  des ordres de grandeur, modifiables dans *Administration → Paramètres* ;
- mettre le serveur derrière HTTPS (le serveur intégré est en HTTP simple, prévu
  pour un poste ou un réseau local) et instaurer une politique de mots de passe ;
- organiser les sauvegardes du fichier `data/sunuerp.db` ;
- vérifier la conformité des factures aux exigences de la DGID (mentions
  obligatoires, facture normalisée) avant toute émission réelle.

Fonctions volontairement absentes de cette version : multi-société et
multi-devise en écriture, gestion des lots et des numéros de série, immobilisations
et amortissements automatiques, comptabilité analytique détaillée, ordonnancement
de production par poste de charge, workflows d'approbation multi-niveaux,
interface mobile dédiée.
