---
id: architecture
title: Architecture technique
sidebar_position: 3
---

# Architecture technique

## Stack

| Couche | Technologie | Version |
|--------|---|---|
| **Framework** | Next.js | 16.4.3 (App Router, RSC) |
| **Runtime** | Node.js | 22 (image `node:22-alpine`) ; **Node 24 en CI**, exigé par Jest seulement |
| **Auth** | NextAuth | 5.0.0-beta.31 (JWT, credentials + LinkedIn OAuth) |
| **Database** | PostgreSQL + Prisma | 18 + 7.10.1 (client généré, pilote `pg`) |
| **Frontend UI** | Tailwind CSS + shadcn/ui | 4.2.2 + composants headless |
| **Payments** | HelloAsso API | OAuth2 client credentials |
| **Email** | Resend | 6.12.0 |
| **SEO** | yoastseo | 3.6.0, dans un Web Worker navigateur |
| **Charts** | Recharts | 3.8.0 |
| **Infrastructure** | Docker + Nginx + VPS | Reverse proxy Let's Encrypt |
| **CI/CD** | GitHub Actions | Deploy sur push `main` |

:::info Prisma 7 : plus de moteur natif
Depuis octobre 2026, LeHub est sur Prisma 7. Le client n'est plus généré dans `node_modules/.prisma` mais dans **`generated/prisma`** (dossier ignoré par git), il est compilé dans le bundle Next, et la connexion passe par l'adaptateur `@prisma/adapter-pg` — il n'y a plus de `libquery_engine` ni de dépendance à OpenSSL dans l'image. L'URL de connexion est déclarée dans `prisma.config.ts` pour la CLI et dans `lib/prisma.ts` pour l'adaptateur, plus dans le bloc `datasource` du schéma.

**Conséquence pratique** : après un `git pull` qui touche le schéma, `prisma generate` est obligatoire, sinon le client importé ne contient pas les nouveaux champs. C'est aussi pour cela que le déploiement lance `npm ci` puis `prisma generate` sur l'hôte : les crons de l'hôte tournent avec ce client généré.
:::

## Où vit quoi

### Répertoires de premier niveau

| Chemin | Responsabilité |
|--------|---|
| `app/` | Routes Next.js App Router (UI + API) |
| `components/` | Composants React réutilisables (admin, membres, ateliers, UI) |
| `lib/` | Utilitaires métier (auth, paiements, emails, badges, permissions, pricing) |
| `prisma/` | Schéma de données, migrations, seed |
| `scripts/` | Scripts utilitaires d'exploitation (migration Pretix, reconciliation, génération de clés) |
| `.github/workflows/` | CI/CD (quality + deploy) |
| `public/` | Assets statiques (icons, images, SVG du logo) |

### Structure de `app/`

#### Groupes de routes (sans préfixe URL)

| Chemin | Rôle | Pages |
|--------|------|-------|
| `app/(auth)/` | Routes d'authentification (pas d'auth gate) | login, logout, forgot-password, reset-password, invitation |
| `app/(no-header)/` | Pages publiques sans header | événements publics (`events/[slug]`), pages sans chrome |
| `app/(inscription)/` | Funnel d'inscription public | confirmation |
| `app/(fullscreen)/` | Pages fullscreen (réservées) | satisfaction/[token] (questionnaire de satisfaction) |

#### Routes authentifiées

| Chemin | Périmètre | Composants clés |
|--------|-----------|---|
| `app/members/` | Espace membre (animateur, formateur) | dashboard, profile, events/new (création atelier), events/[id] (fiche atelier), directory (annuaire), library (médiathèque), pedagogie (supports pédagogiques), usage-rights (droits d'utilisation pro), organisations |
| `app/admin/` | Espace administrateur (`isAdmin` gate) | dashboard, contact-requests (demandes entrantes), events, members, participants, organisations, blog, library, pedagogie, cards (jeux de cartes), seo (référencement), emails, settings (paramètres multi-sections), pricing, discount-codes |
| `app/verify/` | Vérification publique de badge | page/badge/[id] |

#### Racine

| Chemin | Rôle |
|--------|------|
| `app/page.tsx` | Redirect vers `/members` (ou login si non auth) |
| `app/layout.tsx` | Root layout avec `RootLayout` (metadata, fonts) |
| `app/not-found.tsx` | Fallback 404 |

### Structure de `app/api/`

| Chemin | Responsabilité |
|--------|---|
| `app/api/auth/` | Endpoints auth (NextAuth catch-all, forgot/reset password, pending-link LinkedIn) |
| `app/api/admin/` | Endpoints admin (events, members, organisations, participants, articles, library, pedagogical-versions, cards, regeneration, contact-requests, seo, discount-codes, google-slides, settings, site-mode, etc.) |
| `app/api/members/` | Endpoints espace membre (profile, workshops/animators) |
| `app/api/workshops/` | Endpoints ateliers publics et privés (`[id]/registrations`, `[id]/cancel`, `[id]/waitlist`) |
| `app/api/public/` | Endpoints publics consommés par LeSite (workshops, articles, resources, satisfaction, registrations + annulation, registration-status, site-mode, session, **seo**, contact-notification). Origines autorisées par `lib/cors.ts` (`PUBLIC_SITE_ORIGINS`) |
| `app/api/checkout/` | Création d'intention de paiement HelloAsso |
| `app/api/webhooks/helloasso/` | Webhook HelloAsso (paiements d'inscriptions + rapports d'utilisation) |
| `app/api/cron/` | Tâche planifiée unique (`reminders`) : rappels, alertes d'expiration, badges, satisfaction, purge des demandes de contact |
| `app/api/mobile/` | API de l'application mobile (login, dashboard), jetons signés avec `MOBILE_JWT_SECRET` |
| `app/api/pedagogical-files/` | Service des fichiers pédagogiques derrière le contrôle d'accès |
| `app/api/badges/` | Endpoints badges Open Badges 3.0 (issuer, assertions, classes) |
| `app/api/board-auth/` | SSO animateur vers LeBoard (token signé) |
| `app/api/board-training/` | Création d'atelier de test (training board) |
| `app/api/usage-reports/` | Rapports d'utilisation pro (`checkout/` pour le paiement) |
| `app/api/invitations/` | Tokens d'invitation pour les nouveaux membres |
| `app/api/discount-codes/` | Validation des codes avantage |
| `app/api/workshop-models/` | Modèles de plateau (GET) |
| `app/api/.well-known/jwks.json/` | Clé publique JWKS pour la vérification des badges |

### Structure de `components/`

| Répertoire | Contenu |
|---|---|
| `components/admin/` | Composants spécifiques admin (tableaux, formulaires, sections) |
| `components/layout/` | Layout header, sidebar, navigation |
| `components/membres/` | Composants espace membre (cartes, formulaires) |
| `components/ui/` | Composants shadcn/ui non modifiés (Button, Card, Dialog, Select, etc.) |
| `components/workshops/` | Composants ateliers (fiches, filtres, registrations) |

### Structure de `lib/`

| Fichier | Responsabilité |
|---|---|
| `auth.ts` | NextAuth config (providers, callbacks, session shape) |
| `permissions.ts` | Hiérarchie des rôles (`canCreateWorkshop`, `hasProHabilitation`) |
| `helloasso.ts` | Client HelloAsso (OAuth2, checkout intent, order lookup) |
| `email.ts` | Config Resend, rendu emails |
| `email-template-defaults.ts` | Templates des 14 emails transactionnels (contenu codé) |
| `email-blocks.ts` | Composants réutilisables pour les emails (SectionLabel, TextCard, etc.) |
| `email-layout.ts` | Gabarit commun des emails (en-tête logo, pied de page) |
| `email-categories.ts` | Catégorie d'expéditeur par gabarit : chaque catégorie a son adresse dans les Paramètres |
| `badges.ts` | Émission badges Open Badges 3.0 (types, metadata, JWT) |
| `notifications.ts` | Notifications email/Telegram admin (`notifyAdmin()`) |
| `pricing.ts` | Logique de tarification (lecture de `PricingPolicy` et `FormatPricing`) |
| `price-tiers.ts` | Grille tarifaire libre d'un atelier, et repli sur les trois tarifs historiques |
| `price-format.ts` | Affichage des prix : les montants stockés sont HT, le TTC est calculé au centime |
| `vat.ts` | **Le seul endroit qui décide si de la TVA est due** : franchise en base (art. 293 B du CGI) |
| `discount-codes.ts` | Validation et application de codes avantage |
| `registration-cancellation.ts` | Logique d'annulation/remboursement, du Hub vers HelloAsso |
| `refund-sync.ts` | Sens inverse : un remboursement décidé dans HelloAsso annule l'inscription côté Hub |
| `eligibility.ts` | Éligibilité à animer ou former, sans accès base (importable par un composant client) |
| `cotisation-webhook.ts` | Traitement des paiements de cotisation depuis HelloAsso |
| `workshop-form.ts` | Classes CSS et helpers pour formulaires ateliers (timezone, datetime UTC) |
| `workshop-status.ts` | Statuts et traduction des ateliers (draft, published, cancelled) |
| `directory.ts` | Annuaire des membres (avatars Gravatar, labels de badge) |
| `settings.ts` | Singleton Settings (identité, config email/intégrations, réglages SEO) |
| `seo/` | Référencement : moteur `yoastseo` en Web Worker (`analyze`, `worker`), score et pastille, largeur de titre en pixels, schémas JSON-LD d'article et d'atelier, inventaire des routes de LeSite (`lesite.ts`) et invalidation de son cache (`revalidate-lesite.ts`) |
| `json-ld.ts` | Sérialisation sûre d'un bloc JSON-LD (échappement HTML, pas seulement JSON) |
| `prisma.ts` | Singleton Prisma client |
| `urls.ts` | URLs publiques (HUB_URL, BOARD_URL) |
| `usage-rights.ts` | Parsing des rapports d'utilisation pro |
| `satisfaction-window.ts` | Fenêtres d'envoi questionnaire satisfaction |
| `satisfaction-results.ts` | Agrégation résultats satisfaction |
| `workshop-lead.ts` | Résolution du responsable d'un atelier (lead ou créateur) |
| `board.ts` | Helpers plateau LeBoard |
| `plateaux.ts` | Catalogue des plateaux et de leurs étapes (matrices, colonnes, lignes) : pédagogie codée en dur |
| `lot-labels.ts`, `card-drop-targets.ts` | Libellés des lots et cibles de dépôt des cartes, dérivés du plateau |
| `version-readiness.ts` | Ce qui manque à une version de cartes avant de pouvoir animer |
| `lots-config.ts` | Configuration des lots (cartes, slides) |
| `lot-cards.ts` | Extraction IDs cartes par lot |
| `lot-slides.ts` | Gestion diapositives lots |
| `google-slides.ts` | API Google Slides (OAuth, lecture, miniatures) |
| `google-slides-url.ts` | Extraction de l'ID d'un fichier depuis une URL Slides collée |
| `siret.ts` | Lookup SIRET (API recherche-entreprises) |
| `organisation.ts` | Queries organisations et gestionnaires |
| `cotisation.ts` | Statuts et calculs cotisation |
| `parcours.ts` | 2 axes parcours (animateur/formateur × public/pro) |
| `pedagogical-slots.ts` | Sections et slots supports pédagogiques |
| `rate-limit.ts` | Rate limiting par IP (checkout, cancellation) |
| `cors.ts` | Origines autorisées sur les routes `/api/public` (`PUBLIC_SITE_ORIGINS`) |
| `html-escape.ts` | Échappement HTML des valeurs interpolées (notifications, page de badge) |
| `zod-error.ts` | Traduction des refus Zod en message lisible plutôt qu'en JSON brut |
| `csrf.ts` | Protection CSRF |
| `api-auth.ts` | Vérification auth pour endpoints API (`requireAdmin`, `requireAuth`) |
| `admin-dashboard-stats.ts` | KPIs tableau de bord admin |
| `new-registrations.ts` | Pastille « nouveaux inscrits » (comparaison avec `WorkshopAnimator.lastViewedAt`) |
| `contact-request.ts` | Champs de qualification d'une demande de contact (clés et libellés du `context`) |
| `contact-request-purge.ts` | Purge des demandes de contact au-delà de trois ans |
| `mobile-auth.ts` | Jetons de l'API mobile (`MOBILE_JWT_SECRET`) |
| `badge-page.ts` | Page publique d'un badge servie sur `badge.fresquesystemique.org` et son image d'aperçu |
| `dashboard.ts` | Variante de tableau de bord selon le rôle |
| `slug.ts` | Slug public d'un événement (translittération des accents) |
| `name-case.ts` | Harmonisation prudente de la casse des prénoms et noms saisis |
| `workshop-geocode.ts` | Ce qui est envoyé au géocodeur (adresse et ville seulement, jamais le champ « Lieu ») |
| `organisation-options.ts` | Types d'organisation, sans accès base (importable côté client) |
| `satisfaction-questions.ts` | Questions questionnaire satisfaction |
| `utils.ts` | Utilities génériques |
| `gender.ts` | Application du genre aux templates emails |
| `rgesn.ts` | Données de la déclaration d'écoconception RGESN publiée par LeSite |
| `image-type.ts` | Détection type image (PNG, WebP, etc.) |
| `card-thumbnails.ts` | Thumbnails cartes plateau |
| `badge-keys.ts` | Clé EdDSA pour signature badges JWT |
| `board-cards.ts` | Mapping cartes Board |
| `cancellation-policy.ts` | Politique d'annulation (délais) |

### `prisma/`

| Fichier | Contenu |
|---|---|
| `schema.prisma` | Modèle de données complet (35 modèles, voir page Données). Le client est généré dans `generated/prisma` (hors git) |
| `migrations/` | Fichiers migration SQL (historique versionné) |
| `seed.ts` | Seeding DB optionnel pour dev |

### `scripts/`

| Script | Objectif |
|---|---|
| `migrate-pretix.ts` | Import idempotent ateliers/inscriptions depuis Pretix (ancien système) |
| `reconcile-registrations.ts` | Rattrapage quotidien des inscriptions `pending` vs HelloAsso |
| `reconcile-usage-reports.ts` | Rattrapage rapports utilisation pro |
| `backfill-workshop-owner.ts` | Backfill champ `createdById` (migration historique) |
| `generate-badge-key.ts` | Génération clé EdDSA pour badges JWT |
| `google-slides-oauth.ts` | OAuth Google Slides (setup initial) |
| `import-nocodb-events.ts` | Import depuis NocoDB (migration) |
| `import-wp-mediatheque.ts` | Import ressources depuis WordPress |
| `render-email-logo.mjs` | Rendu SVG logo pour emails |
| `seed-regeneration.ts`, `seed-regeneration-titles.ts`, `regeneration-seed-data.ts` | Semis des familles, pratiques et exemples de l'étape Régénération, scopé à une version de cartes |
| `normalize-names.ts` | Harmonisation de la casse des noms déjà en base |
| `import-mediatheque-json.ts` | Import de la médiathèque depuis un export JSON |

## Conventions de routage

### Next.js App Router

- **Route groups** `(name)` : n'ajoutent pas de segment URL, permettent une organisation logique (ex: `(auth)/login` → URL `/login`).
- **Route dynamique** `[id]` : paramètres d'URL, accessible via `params.id`.
- **Fallback optionnel** `[[...slug]]` : zéro ou plus segments (non utilisé ici).

### Layout hierarchy

```
app/layout.tsx (RootLayout)
├── app/(auth)/layout.tsx (no auth gate)
│   ├── (auth)/login/page.tsx
│   ├── (auth)/forgot-password/page.tsx
│   └── (auth)/reset-password/[token]/page.tsx
├── app/(no-header)/layout.tsx (public pages, no header)
│   ├── (no-header)/events/[slug]/page.tsx (workshop public detail)
│   └── (no-header)/verify/page.tsx (badge verification)
├── app/members/layout.tsx (requires auth, calls auth() + redirects)
│   ├── members/dashboard/page.tsx
│   ├── members/events/page.tsx (Mes événements)
│   ├── members/events/new/page.tsx (create workshop)
│   ├── members/events/[id]/page.tsx (workshop detail + registrations)
│   ├── members/profile/page.tsx
│   ├── members/directory/page.tsx
│   ├── members/library/page.tsx
│   ├── members/pedagogie/page.tsx (supports pédagogiques)
│   ├── members/usage-rights/page.tsx (droits d'utilisation pro)
│   └── members/organisations/page.tsx
├── app/admin/layout.tsx (requires isAdmin, calls auth() + checks isAdmin)
│   ├── admin/dashboard/page.tsx
│   ├── admin/contact-requests/page.tsx (demandes entrantes + /new + /[id])
│   ├── admin/events/page.tsx
│   ├── admin/members/page.tsx
│   ├── admin/participants/page.tsx
│   ├── admin/organisations/page.tsx
│   ├── admin/blog/page.tsx
│   ├── admin/library/page.tsx
│   ├── admin/cards/page.tsx (jeux de cartes)
│   ├── admin/cards/[id]/page.tsx (version : onglets Lots / Titres / Régénération)
│   ├── admin/seo/page.tsx (+ seo/optimiser)
│   ├── admin/emails/page.tsx
│   ├── admin/settings/page.tsx
│   ├── admin/pricing/page.tsx
│   ├── admin/discount-codes/page.tsx
│   └── admin/pedagogie/page.tsx (supports pédagogiques)
└── app/(fullscreen)/layout.tsx (no header/sidebar)
    └── (fullscreen)/satisfaction/[token]/page.tsx
```

## Conventions UI

- **Tokens CSS** : uniquement shadcn/ui (Tailwind + CSS variables custom). Zéro tokens personnalisés brand-* ou slate-*.
- **Statuts ateliers** : centralisés dans `lib/workshop-status.ts` (Draft/Published/Cancelled) avec traductions et couleurs.
- **Alerte** : classe `bg-amber-100` ou shadcn `Alert` component (amber par défaut pour avertissements non critiques).
- **Pagination admin** : composant shadcn `Pagination` sur toutes les tables.

## Authentification et autorisation

### Session

- **Type** : JWT (NextAuth v5).
- **Durée** : 1 heure par défaut ; 30 jours si `rememberMe=true` au login credentials.
- **Domaine** : hôte-local par défaut ; `.fresquesystemique.org` en prod (pont auth avec LeSite via `AUTH_COOKIE_DOMAIN`).
- **Nom du cookie** : `__Secure-fresque.session-token` (doit être identique côté LeSite pour le partage).

### Middleware

- `middleware.ts` (racine du repo si présent) : ne redirige pas, laisse les layouts gérer l'auth gating.
- Les layouts `app/members/layout.tsx` et `app/admin/layout.tsx` appelent `auth()` et redirigent si non authentifié ou non autorisé.

### Contrôle d'accès

```typescript
// Hiérarchie de rôles (ROLE_LEVEL dans lib/permissions.ts)
adherent (1) < animateur (2) < coordinateur (3) < formateur (4) < admin (99)

// Attention, deux échelles cohabitent dans ce fichier. ROLE_LEVEL ci-dessus
// note le rôle du membre ; RESOURCE_LEVEL note le niveau exigé par une
// ressource, et ne connaît que trois valeurs :
adherent (1) < animateur (2) < formateur (3)

// Le niveau 1 sert à comparer des ressources, pas à ouvrir le Hub : un membre
// au rôle `adherent` est refusé dès la connexion, le plancher d'accès au Hub
// est animateur.
//
// `coordinateur` n'est produit par aucune dérivation de lib/parcours.ts : il
// n'existe que dans cette table et ne peut être posé qu'en base.

// Vérification
canAccessResource(role, resourceAccess)  // level >= level
canCreateWorkshop(role)                 // role in [animateur, formateur, admin]
hasProHabilitation(hab, cotisStatus, cotisExpiry)  // TOUTES les 3 args requises
```

**Important** : les administrateurs ont `role='formateur'` ET `isAdmin=true`. Toujours vérifier `isAdmin` pour les opérations admin, jamais seulement le rôle pédagogique.

### OAuth LinkedIn

- Fournisseur NextAuth natif.
- Première connexion sans compte existant → crée `PendingLink` (TTL 15 min) et redirige vers `/login/link-linkedin?token=...` pour attacher à un compte existant.
- Connexion directe possible une fois `linkedinId` stocké sur `Member`.
