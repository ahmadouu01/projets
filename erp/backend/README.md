# Backend — ERP Teranga

API REST Express + PostgreSQL (Prisma) pour l'ERP de location-entretien.

## Scripts

| Commande                  | Description                                  |
|----------------------------|-----------------------------------------------|
| `npm run dev`               | Démarre l'API avec rechargement automatique  |
| `npm start`                 | Démarre l'API (production)                    |
| `npm run prisma:migrate`    | Applique les migrations (dev)                 |
| `npm run prisma:deploy`     | Applique les migrations (prod)                |
| `npm run prisma:studio`     | Ouvre Prisma Studio (explorateur de données)  |
| `npm run seed`               | Réinitialise la base avec des données de démo |

## Variables d'environnement (`.env`)

```
DATABASE_URL="postgresql://user:password@localhost:5432/erp_senegal"
JWT_SECRET="change-me-in-production"
PORT=4000
CORS_ORIGIN="http://localhost:5173"
```

## Modèle de données

Voir `prisma/schema.prisma`. Grandes familles d'entités :

- **User** — utilisateurs de l'ERP (rôles : ADMIN, COMMERCIAL, LOGISTIQUE,
  PRODUCTION, COMPTABILITE, RH).
- **Client / Site** — clients et leurs sites de livraison.
- **Contract / ContractLine** — contrats de location-entretien et leurs
  lignes d'articles loués.
- **ArticleType / StockItem / WashCycle** — catalogue d'articles, parc
  traçable individuel (code unique) et cycles de lavage.
- **Invoice / InvoiceLine / Payment** — facturation et encaissements.
- **Vehicle / Driver / Round / RoundStop** — flotte, tournées et arrêts.
- **Employee / Payroll** — employés et bulletins de paie mensuels.

## Principales routes API

Toutes les routes (sauf `/api/auth/login`) nécessitent un en-tête
`Authorization: Bearer <token>`.

- `POST /api/auth/login`, `GET /api/auth/me`
- `GET/POST/PUT/DELETE /api/clients`, `POST /api/clients/:id/sites`
- `GET/PUT/DELETE /api/sites`
- `GET/POST/PUT/DELETE /api/contracts`, `POST /api/contracts/:id/generate-invoice`
- `GET/POST/PUT/DELETE /api/article-types`
- `GET/POST/PUT/DELETE /api/stock-items`, `GET /api/stock-items/stats/by-status`,
  `POST /api/stock-items/:id/wash/start`, `POST /api/stock-items/:id/wash/finish`
- `GET /api/wash-cycles`
- `GET/POST/DELETE /api/invoices`, `PUT /api/invoices/:id/status`,
  `POST /api/invoices/:id/payments`
- `GET/POST/PUT/DELETE /api/vehicles`
- `GET/POST/PUT/DELETE /api/drivers`
- `GET/POST/PUT/DELETE /api/rounds`, `PUT /api/rounds/:roundId/stops/:stopId`
- `GET/POST/PUT/DELETE /api/employees`
- `GET /api/payroll`, `POST /api/payroll/simulate`, `POST /api/payroll/generate`
- `GET /api/dashboard/summary`

## Notes sur la paie

Le calcul de paie (`src/utils/payroll.js`) applique une version simplifiée
du barème IRPP sénégalais et des taux IPRES/CNSS approximatifs. À valider
avec un expert-comptable / la DGI avant tout usage réel.
