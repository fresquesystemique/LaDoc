---
id: architecture
title: Architecture technique
sidebar_position: 3
---

# Architecture technique

## Stack

| Couche | Technologie | Version |
|--------|---|---|
| **Framework** | Next.js | 16.2.3 (App Router, RSC) |
| **Auth** | NextAuth | 5.0.0-beta.31 (JWT, credentials + LinkedIn OAuth) |
| **Database** | PostgreSQL + Prisma | 18 + 5.22.0 |
| **Frontend UI** | Tailwind CSS + shadcn/ui | 4.2.2 + composants headless |
| **Payments** | HelloAsso API | OAuth2 client credentials |
| **Email** | Resend | 6.12.0 |
| **Charts** | Recharts | 3.8.0 |
| **Infrastructure** | Docker + Nginx + VPS | Reverse proxy Let's Encrypt |
| **CI/CD** | GitHub Actions | Deploy sur push `main` |

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
| `app/(auth)/` | Routes d'authentification (pas d'auth gate) | login, logout, forgot-password, reset-password, link-linkedin |
| `app/(no-header)/` | Pages publiques sans header | événements publics (`events/[slug]`), pages sans chrome |
| `app/(inscription)/` | Funnel d'inscription public | confirmation |
| `app/(fullscreen)/` | Pages fullscreen (réservées) | satisfaction/[token] (questionnaire de satisfaction) |

#### Routes authentifiées

| Chemin | Périmètre | Composants clés |
|--------|-----------|---|
| `app/members/` | Espace adhérent/animateur/formateur | dashboard, profile, events/new (création atelier), events/[id] (fiche atelier), directory (annuaire), library (médiathèque), resources (supports pédagogiques), organisations |
| `app/admin/` | Espace administrateur (`isAdmin` gate) | dashboard, events, members, participants, organisations, blog (actualités), library (médiathèque), cards (modèles plateau), emails (templates), settings (paramètres multi-sections), pricing, discount-codes |
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
| `app/api/admin/` | Endpoints admin (events, members, organisations, participants, blog, library, resources, cards, discount-codes, settings, etc.) |
| `app/api/members/` | Endpoints espace adhérent (profile, workshops/animators) |
| `app/api/workshops/` | Endpoints ateliers publics et privés (`[id]/registrations`, `[id]/cancel`, `[id]/waitlist`) |
| `app/api/public/` | Endpoints publics (workshops, articles, resources, satisfaction, registration-cancel, site-mode) |
| `app/api/checkout/` | Création d'intention de paiement HelloAsso |
| `app/api/webhooks/helloasso/` | Webhook HelloAsso (paiements d'inscriptions + rapports d'utilisation) |
| `app/api/cron/` | Tâches planifiées (reminders) |
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
| `components/membres/` | Composants espace adhérent (cartes, formulaires) |
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
| `badges.ts` | Émission badges Open Badges 3.0 (types, metadata, JWT) |
| `notification.ts` | Notifications email/Telegram admin |
| `pricing.ts` | Logique de tarification (lecture de `PricingPolicy`) |
| `discount-codes.ts` | Validation et application de codes avantage |
| `registration-cancellation.ts` | Logique d'annulation/remboursement |
| `cotisation-webhook.ts` | Traitement des paiements de cotisation depuis HelloAsso |
| `workshop-form.ts` | Classes CSS et helpers pour formulaires ateliers (timezone, datetime UTC) |
| `workshop-status.ts` | Statuts et traduction des ateliers (draft, published, cancelled) |
| `directory.ts` | Annuaire des membres (avatars Gravatar, labels de badge) |
| `settings.ts` | Singleton Settings (identité, config email/integrations) |
| `prisma.ts` | Singleton Prisma client |
| `urls.ts` | URLs publiques (HUB_URL, BOARD_URL) |
| `usage-rights.ts` | Parsing des rapports d'utilisation pro |
| `satisfaction-window.ts` | Fenêtres d'envoi questionnaire satisfaction |
| `satisfaction-results.ts` | Agrégation résultats satisfaction |
| `workshop-lead.ts` | Résolution du responsable d'un atelier (lead ou créateur) |
| `board.ts` | Helpers plateau LeBoard |
| `lots-config.ts` | Configuration des lots (cartes, slides) |
| `lot-cards.ts` | Extraction IDs cartes par lot |
| `lot-slides.ts` | Gestion diapositives lots |
| `google-slides.ts` | API Google Slides (oauth, lecture) |
| `siret.ts` | Lookup SIRET (API recherche-entreprises) |
| `organisation.ts` | Queries organisations et gestionnaires |
| `cotisation.ts` | Statuts et calculs cotisation |
| `parcours.ts` | 2 axes parcours (animateur/formateur × public/pro) |
| `pedagogical-slots.ts` | Sections et slots supports pédagogiques |
| `rate-limit.ts` | Rate limiting par IP (checkout, cancellation) |
| `csrf.ts` | Protection CSRF |
| `api-auth.ts` | Vérification auth pour endpoints API (`requireAdmin`, `requireAuth`) |
| `admin-dashboard-stats.ts` | KPIs tableau de bord admin |
| `new-registrations.ts` | Badge "nouveaux inscrits" |
| `satisfaction-questions.ts` | Questions questionnaire satisfaction |
| `utils.ts` | Utilities génériques |
| `gender.ts` | Application du genre aux templates emails |
| `rgesn.ts` | RGPD / droit à l'oubli |
| `image-type.ts` | Détection type image (PNG, WebP, etc.) |
| `card-thumbnails.ts` | Thumbnails cartes plateau |
| `badge-keys.ts` | Clé EdDSA pour signature badges JWT |
| `board-cards.ts` | Mapping cartes Board |
| `cancellation-policy.ts` | Politique d'annulation (délais) |

### `prisma/`

| Fichier | Contenu |
|---|---|
| `schema.prisma` | Modèle de données complet (40+ modèles, voir page Données) |
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
│   ├── members/resources/page.tsx (supports pédagogiques)
│   └── members/organisations/page.tsx
├── app/admin/layout.tsx (requires isAdmin, calls auth() + checks isAdmin)
│   ├── admin/dashboard/page.tsx
│   ├── admin/events/page.tsx
│   ├── admin/members/page.tsx
│   ├── admin/participants/page.tsx
│   ├── admin/organisations/page.tsx
│   ├── admin/blog/page.tsx
│   ├── admin/library/page.tsx
│   ├── admin/cards/page.tsx (plateau models)
│   ├── admin/cards/[id]/page.tsx (model detail)
│   ├── admin/emails/page.tsx
│   ├── admin/settings/page.tsx
│   ├── admin/pricing/page.tsx
│   ├── admin/discount-codes/page.tsx
│   └── admin/resources/page.tsx (supports pédagogiques)
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
// Hiérarchie de rôles (lib/permissions.ts)
adhérent (1) < animateur (2) < formateur (3) < admin (99)

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
