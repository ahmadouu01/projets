# CLAUDE.md — Projet « Setal Pro »

> Ce dépôt contient aussi un site vitrine sans lien avec ce projet (ELAN SPORT :
> `index.html`, `boutique.html`, `contact.html`, `css/`, `js/`, `assets/`).
> Ne pas le modifier dans le cadre de Setal Pro.

## 1. Le projet

**Setal Pro** : entreprise de **location-entretien de linge et de vêtements
professionnels à Dakar (Sénégal)**, sur le modèle d'Elis (France). Le client
ne possède pas son linge : il paie un service récurrent qui comprend la mise à
disposition du linge, sa collecte, son lavage, sa livraison, sa réparation et
son remplacement.

« Setal » signifie « propreté / rendre propre » en wolof.

## 2. Le porteur de projet

- **Ahmadou Bamba Diop**, ingénieur génie industriel : méthodes, amélioration
  continue, supervision de production, management d'une équipe de 15 personnes.
- N'a **jamais dirigé d'entreprise**.
- Basé à **Lyon** aujourd'hui ; s'installera au Sénégal.
- **Pas d'associé**. Ambition : **entreprise familiale**.
- Profil de risque : **équilibré**.

## 3. Choix structurants déjà arrêtés

| Sujet | Décision |
|---|---|
| Modèle | Location-entretien **en direct** (pas de lavage sous-traité) |
| Outil de production au lancement | **3 machines en propre** |
| Financement | Épargne personnelle + **crédit-bail sur les machines uniquement** (décision du 10/10/2026). **Pas de prêt bancaire, pas d'apport familial.** Écart central restant ≈ 33 M FCFA pour une ouverture en oct. 2030 |
| Apport actuel | ~**10 M FCFA** (≈ 15 245 €) |
| Épargne mensuelle | ~**500 €/mois** aujourd'hui, **1 000 €/mois à partir de janvier 2028** (validé) |
| Relation bancaire / réseau pro au Sénégal | **Aucun** à ce jour ; pas de contact Elis, pas de relais familial : terrain mené seul |
| Calendrier | **Validation terrain d'abord**, démarrage visé **fin 2030** ; financièrement, cela suppose ≈ 2 500 €/mois d'épargne. Sinon : 2032 (1 500 €/mois) ou 2034 (1 000 €/mois). **Date à fixer au go / no-go (mars 2028)** |
| Rémunération du dirigeant | **Aucun salaire avant ~4 ans** |
| Zone d'implantation | **Non arrêtée** — terrain sur **toute la région de Dakar** (5 départements) |
| Forme juridique | SUARL, capital ≈ 1 M FCFA + compte courant d'associé ; création début 2030 (validé) |
| Investissement de référence | Version frugale ≈ 46 M FCFA (validé) |
| Réserve personnelle | 12 mois × 350 000 FCFA (validé) |
| Option à étudier (décidée le 10/10/2026) | **Entretien du linge appartenant au client**, en complément de la location (porte d'entrée) |

Conversion : parité fixe **1 € = 655,957 FCFA** (franc CFA UEMOA, BCEAO).
Arrondi utilisé dans les calculs rapides : 1 € ≈ 656 FCFA.

## 4. Règles de travail (à respecter à chaque phase)

1. **Phase par phase.** À la fin de chaque phase : résumé, hypothèses,
   questions ouvertes. **Depuis le 10/10/2026, Ahmadou a demandé que les
   phases 4 à 10 soient menées en autonomie** (« fais tout tout seul ») :
   enchaîner sans attendre de validation, en retenant par défaut les
   propositions faites et en listant les choix à confirmer dans
   `docs/00-synthese.md`.
2. **Sources sénégalaises officielles.** Pour tout chiffre ou règle propre au
   Sénégal (fiscalité, droit OHADA, environnement, tarifs eau/électricité,
   salaires, etc.), chercher une **source officielle** et la **citer** (lien +
   date de consultation). Sans source : écrire **« À VÉRIFIER »**, ne jamais
   inventer.
3. **Trois statuts d'information**, toujours signalés :
   - **[FAIT]** : sourcé (source citée).
   - **[HYPOTHÈSE]** : choix de travail posé pour avancer, à confirmer.
   - **[ESTIMATION]** : calcul ou ordre de grandeur dérivé (méthode indiquée).
4. **Formats.** Livrables en **français**, en **Markdown dans `/docs`**, sauf :
   - modèle financier : **Excel avec formules** (`/finance/modele.xlsx`) ;
   - business plan final : **Word** (`/livrables/`).
5. Montants en **FCFA** (équivalent € entre parenthèses si utile).
6. Raisonner en ingénieur méthodes : lean, flux, capacité, standards,
   indicateurs, amélioration continue (PDCA).

## 5. Arborescence

```
CLAUDE.md
docs/
  00-synthese.md                 # synthèse globale, mise à jour à chaque phase
  01-modele-elis.md              # Phase 1 — analyse du modèle Elis
  02-marche-dakar.md             # Phase 2 — marché dakarois, segments, concurrence
  03-validation-terrain.md       # Phase 3 — hypothèses, méthode, go / no-go
  04-offre-tarification.md       # Phase 4 — catalogue, formules, contrats, SLA
  05-juridique-administratif.md  # Phase 5 — OHADA, APIX, fiscalité, environnement
  06-operations.md               # Phase 6 — process, capacité, local, lean
  07-modele-financier.md         # Phase 7 — notice et lecture du modèle Excel
  08-risques.md                  # Phase 8 — matrice probabilité × impact
  09-feuille-de-route.md         # Phase 9 — jalons 2026-2030
  sources.md                     # registre de toutes les sources citées
finance/
  modele.xlsx                    # Phase 7 (créé à cette phase)
terrain/
  guides-entretien/              # guides d'entretien prospects
  fiches-clients/                # une fiche par prospect rencontré
livrables/                       # Phase 10 — business plan Word, pitch
```

## 6. Avancement

| Phase | Statut |
|---|---|
| 0. Cadrage (CLAUDE.md, arborescence) | Fait |
| 1. Modèle Elis | **Validée** le 10/10/2026 |
| 2. Marché dakarois | **Validée** le 10/10/2026 (périmètre élargi à toute la région) |
| 3. Validation terrain | **Validée** le 10/10/2026 (outils dans `terrain/`, 50 prospects recensés) |
| 4. Offre et tarification | **Validée** le 10/10/2026 |
| 5. Juridique et administratif | **Validée** le 10/10/2026 |
| 6. Opérations | **Validée** le 10/10/2026 |
| 7. Modèle financier | **Validé** le 10/10/2026 (`finance/modele.xlsx` + `docs/07`) |
| 8. Risques | **Validée** le 10/10/2026 |
| 9. Feuille de route | **Validée** le 10/10/2026 |
| 10. Livrables finaux | **Validés** le 10/10/2026 (`livrables/`) |
| **Prochaine étape** | Exécution de la feuille de route : J1 (épargne automatique), J2 (recensement), J3 (entretiens à distance) |
