# ERP Teranga — Location-entretien & Logistique (Sénégal)

Un ERP web complet inspiré du métier d'**ELIS** (location-entretien de linge,
vêtements de travail, tapis et hygiène sanitaire), adapté au contexte
sénégalais : FCFA, TVA à 18%, NINEA/RCCM, IRPP/IPRES/CNSS, zones Dakar/Thiès/
Saint-Louis, paiement Mobile Money (Orange Money / Wave), etc.

Application full-stack fonctionnelle : API REST (Node/Express + PostgreSQL
via Prisma) + interface web (React/Vite), avec authentification par rôles et
données persistées en base.

## Modules

- **Clients & Contrats** — portefeuille client, sites de livraison, contrats
  de location-entretien avec lignes d'articles et tarifs.
- **Facturation & Finance** — génération de factures (manuelle ou depuis un
  contrat), TVA 18%, encaissements (Mobile Money, virement, espèces, chèque),
  suivi des impayés.
- **Stock & Production (blanchisserie)** — catalogue d'articles (vêtements de
  travail, linge plat, tapis, hygiène), parc traçable par code, cycles de
  lavage (démarrage/clôture avec résultat OK ou rebut).
- **Tournées & Logistique** — véhicules, chauffeurs, tournées de livraison/
  collecte par zone, suivi des arrêts (à faire / livré / échec).
- **RH & Paie** — employés, génération mensuelle des bulletins de paie avec
  une estimation simplifiée IRPP / IPRES / CNSS (⚠️ à valider avec un
  expert-comptable avant tout usage réel).
- **Tableau de bord** — KPIs globaux : clients actifs, contrats actifs,
  CA facturé/encaissé, encours client, répartition du parc d'articles,
  tournées du jour.

## Architecture

```
erp/
  backend/    API Express + Prisma + PostgreSQL, JWT, rôles
  frontend/   Application React (Vite) + React Router
```

- **Backend** : Node.js, Express, PostgreSQL, Prisma ORM, JWT (jsonwebtoken),
  bcryptjs, validation des entrées avec Zod.
- **Frontend** : React 19, Vite, React Router, CSS natif (aucun framework UI
  externe), appels API via `fetch`.

## Démarrage rapide

### Prérequis

- Node.js 18+
- PostgreSQL 14+ (local ou distant)

### 1. Backend

```bash
cd erp/backend
cp .env.example .env
# éditez .env si besoin (DATABASE_URL, JWT_SECRET...)

npm install
npm run prisma:migrate   # crée les tables
npm run seed              # données de démonstration sénégalaises
npm run dev                # démarre l'API sur http://localhost:4000
```

### 2. Frontend

```bash
cd erp/frontend
cp .env.example .env
npm install
npm run dev   # démarre l'app sur http://localhost:5173
```

### Comptes de démonstration

Mot de passe commun : `Senegal2026!`

| Rôle          | E-mail                        |
|---------------|--------------------------------|
| Administrateur| admin@erp-senegal.sn           |
| Commercial    | commercial@erp-senegal.sn      |
| Logistique    | logistique@erp-senegal.sn      |
| Production    | production@erp-senegal.sn      |
| Comptabilité  | compta@erp-senegal.sn          |
| RH            | rh@erp-senegal.sn              |

## Détails techniques

Voir `backend/README.md` et `backend/prisma/schema.prisma` pour le détail du
modèle de données, et `frontend/src` pour l'organisation des pages React.

## Limites connues / pistes d'évolution

- Le calcul de paie (IRPP/IPRES/CNSS) est une **estimation simplifiée** à but
  de démonstration, pas un moteur de paie certifié.
- Pas encore de gestion fine des permissions par rôle côté frontend (le
  contrôle serveur existe via les rôles JWT, mais l'UI ne masque pas encore
  chaque action selon le rôle connecté).
- Pas de génération de PDF pour les factures/bulletins (actuellement
  consultables uniquement dans l'interface).
- Pas de facturation récurrente automatique planifiée (la génération de
  facture depuis un contrat est déclenchée manuellement).
