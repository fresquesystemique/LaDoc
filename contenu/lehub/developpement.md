---
id: developpement
title: Développement
sidebar_position: 7
---

# Développement

## Prérequis

- **Node.js** 22 (l'image de production est `node:22-alpine` ; la branche 20 est sortie de maintenance en avril 2026). La CI, elle, tourne sur Node 24 — voir [Déploiement](./deploiement.md).
- **Docker** (pour PostgreSQL local)
- **Git**
- Accès repo GitHub : `https://github.com/fresquesystemique/LeHub`

## Installation locale

```bash
# 1. Clone le repo
git clone https://github.com/fresquesystemique/LeHub.git
cd LeHub

# 2. Copy .env.example et remplir variables
cp .env.example .env.local

# 3. Install dépendances
npm install

# 4. Lancer PostgreSQL en Docker
docker compose up -d postgres

# 5. Créer et appliquer les migrations (génère aussi le client dans generated/prisma)
npx prisma migrate dev

# 6. (Optionnel) Seeder les données de dev
npm run db:seed

# 7. Lancer le serveur Next.js dev
npm run dev
```

L'app est accessible sur `http://localhost:3000`.

## Variables d'environnement

Beaucoup de réglages qui ressemblent à des secrets d'environnement vivent en réalité dans la table `Settings` et s'éditent dans `/admin/settings` : identifiants HelloAsso, clé Resend et adresses expéditrices, bot Telegram, clés Logo.dev, réglages SEO. Le `.env.example` en garde des traces (`HELLOASSO_CLIENT_ID`, `RESEND_API_KEY`…) que le code ne lit plus. La liste ci-dessous est celle des variables réellement lues dans `process.env`.

### Authentification

| Nom | Rôle | Exemple |
|-----|------|---------|
| `NEXTAUTH_SECRET` | Secret NextAuth (min 32 caractères) | Générer avec `openssl rand -base64 32` |
| `NEXTAUTH_URL` | URL de l'app | `http://localhost:3000` |
| `AUTH_COOKIE_DOMAIN` | Domaine partagé (prod seulement) | `.fresquesystemique.org` |
| `AUTH_SESSION_COOKIE_NAME` | Nom du cookie de session | `__Secure-fresque.session-token` |
| `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | OAuth LinkedIn | Depuis l'espace développeur LinkedIn |
| `MOBILE_JWT_SECRET` | Signature des jetons de l'API mobile | `openssl rand -base64 32` |

### Base de données

| Nom | Rôle | Exemple |
|-----|------|---------|
| `DATABASE_URL` | URL PostgreSQL, lue par `prisma.config.ts` (CLI) et `lib/prisma.ts` (adaptateur `pg`) | `postgresql://<utilisateur>:<mot_de_passe>@localhost:5432/fresquesystemique` |
| `POSTGRES_PASSWORD` | Mot de passe Postgres du conteneur local | Défini dans `docker-compose.yml` |

### Paiements et crons

| Nom | Rôle | Exemple |
|-----|------|---------|
| `HELLOASSO_WEBHOOK_TOKEN` | Token vérifié en query string du webhook | Doit correspondre à l'URL déclarée chez HelloAsso |
| `CRON_SECRET` | Jeton de la route `/api/cron/reminders`. **Absent, la route refuse de tourner** | `openssl rand -base64 32` |

### Badges

| Nom | Rôle | Exemple |
|-----|------|---------|
| `BADGE_PRIVATE_KEY_JWK` | Clé privée EdDSA de signature des badges (JWK) | Générée par `scripts/generate-badge-key.ts` |
| `BADGE_BASE_URL` | Base de la page publique d'un badge | `https://badge.fresquesystemique.org` |

### Google Slides

| Nom | Rôle |
|-----|------|
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | Client OAuth Google |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | Refresh token d'un compte ayant accès aux présentations |

### URLs croisées et échanges avec LeSite

| Nom | Rôle | Exemple |
|-----|------|---------|
| `NEXT_PUBLIC_APP_URL` | URL publique du Hub | `https://hub.fresquesystemique.org` |
| `NEXT_PUBLIC_HUB_URL` | URL du Hub pour les liens sortants | idem |
| `NEXT_PUBLIC_BOARD_URL` | URL de LeBoard (SSO animateur) | `https://board.fresquesystemique.org` |
| `NEXT_PUBLIC_SITE_URL`, `PUBLIC_SITE_URL` | URL de LeSite côté client et côté serveur | `https://fresquesystemique.org` |
| `PUBLIC_SITE_ORIGINS` | Origines autorisées sur `/api/public` (`lib/cors.ts`), séparées par des virgules | `https://fresquesystemique.org,https://www.fresquesystemique.org` |
| `LESITE_URL` | URL de LeSite pour la revalidation et l'inventaire SEO | `https://fresquesystemique.org` |
| `LESITE_REVALIDATE_SECRET` | Secret de revalidation partagé avec LeSite | Même valeur des deux côtés |
| `SEO_CRAWLER_SECRET` | Secret de l'inventaire des routes de LeSite (en-tête `x-seo-crawler`) | Même valeur des deux côtés |
| `CONTACT_NOTIFY_SECRET` | Secret du dépôt d'une demande de contact par LeSite | Même valeur des deux côtés |

:::warning Quatre secrets partagés avec LeSite
`LESITE_REVALIDATE_SECRET`, `SEO_CRAWLER_SECRET`, `CONTACT_NOTIFY_SECRET` et le nom du cookie de session doivent être **identiques dans les deux dépôts**. Une valeur qui dérive ne casse rien au démarrage : elle casse silencieusement la revalidation, le tableau SEO, le formulaire de contact ou le contournement admin du mode chantier.
:::

## Lancement

```bash
# Dev mode avec hot reload
npm run dev

# Build production
npm run build
npm run start

# Typecheck (utile pour dev)
npm run typecheck

# Lint
npm run lint

# Tests
npm test
npm run test:watch
```

## Il n'y a plus d'environnement de développement partagé

`dev.hub` et `dev.board` ont été **supprimés le 20 août 2026**, avec leur base partagée. Les branches de développement sont conservées dans les dépôts principaux. Une feature se teste donc en local, puis en production : il n'y a pas d'étage intermédiaire, ce qui rend la vérification locale d'un build de production d'autant plus importante (voir les pièges ci-dessous).

## Pièges de développement

### 1. `hasProHabilitation()` exige ses 3 arguments

Piège classique : la fonction `hasProHabilitation(habilitationAnimation, cotisationStatus, cotisationExpiry)` (dans `lib/permissions.ts`) n'a **pas de défaut** pour ses arguments. Un appel avec 2 arguments silencieusement retourne `false` (faux négatif invisible).

```typescript
// ❌ MAUVAIS — retourne false sans erreur TypeScript
hasProHabilitation(member.habilitationAnimation, member.cotisationStatus)

// ✅ BON
hasProHabilitation(
  member.habilitationAnimation,
  member.cotisationStatus,
  member.cotisationExpiry
)
```

### 2. Admins ont `role='formateur'`, pas `role='admin'`

Toujours vérifier `session.user.isAdmin` pour les opérations admin, **jamais** seulement `session.user.role`.

```typescript
// ❌ MAUVAIS
if (session.user.role === 'admin') { /* access admin */ }

// ✅ BON
if (session.user.isAdmin) { /* access admin */ }
```

### 3. Soft delete sur Workshop, Member, Participant

Queries doivent inclure `deletedAt: null` ou elles retourneront des entités "supprimées".

```typescript
// ❌ MAUVAIS — inclut les workshops supprimés
await prisma.workshop.findMany({ where: { status: 'published' } })

// ✅ BON
await prisma.workshop.findMany({ where: { status: 'published', deletedAt: null } })
```

### 4. Unique composite `[workshopId, email]` sur Registration

Une même personne ne peut s'inscrire qu'une fois par atelier, même si elle annule. Pour retester une inscription, changer l'email de test ou changer d'atelier.

### 5. Cookie session partagé avec LeSite

En prod, `AUTH_COOKIE_DOMAIN=.fresquesystemique.org` partage le cookie de session avec LeSite (pont auth). **Localement, laisser vide** — sinon impossible de tester login sur `localhost:3000`.

### 6. Timezone dans le code

Utiliser **toujours** `lib/workshop-form.ts` pour les calculs timezone (fct `datetimeLocalToUTC()`). Le stockage en DB est UTC, les formes locales convertissent.

```typescript
import { datetimeLocalToUTC } from '@/lib/workshop-form'

const utcDate = datetimeLocalToUTC('2025-12-25 19:00', 'Europe/Paris')
```

### 7. Les templates emails sont codés (pas d'édition DB)

Les 15 gabarits d'e-mail sont durcodés dans `lib/email-template-defaults.ts` (blocs, charte, variables). Pour modifier un template, éditer le fichier source et redéployer. Aucune interface admin pour le contenu.

### 8. CSP en prod seulement

Un domaine externe absent de `connect-src` ne génère **pas d'erreur** avec `npm run dev`. Tester avec un build prod local :

```bash
npm run build
npm run start
# Puis vérifier DevTools pour les blocages CSP
```

### 9. Relation Board (propriété LeBoard)

Les modèles `Board`, `CardPlacement`, `Connection`, `AnimatorSession`, `Lot`, `BoardLotDistribution`, `ModelCardTitle` appartiennent à **LeBoard** (repo séparé). Le Hub y a accès **en écriture directe** (dans la même DB PostgreSQL).

**Conséquence** : les migrations schema pour ces modèles sont gérées par LeBoard. Le Hub ne doit jamais modifier le schema de ces modèles sans synchronisation LeBoard.

### 10. Path alias `@/*` vers racine repo

Dans les imports, utiliser l'alias :

```typescript
// ✅ BON
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

// ❌ MAUVAIS
import { prisma } from '../../../lib/prisma'
```

L'alias est défini dans `tsconfig.json` et résout depuis la racine du repo.

### 11. Rate limiting sur les endpoints publics

- `/api/checkout` : 10 requêtes / 10 minutes par IP.
- `/api/public/registrations/[token]/cancel` : 10 tentatives / 15 minutes par IP.

Utilisé pour prévenir les abus. Tester en dev avec des IPs différentes si le limit est declenché.

### 12. Prisma 7 : le client est dans `generated/`, hors git

Après toute modification de `prisma/schema.prisma` — et après tout `git pull` qui en touche une :

```bash
npx prisma generate
```

Le client n'est plus dans `node_modules/.prisma` mais dans **`generated/prisma`**, dossier ignoré par git et compilé dans le bundle Next. Sans régénération, le client importé ne connaît pas les nouveaux champs, et l'erreur ressemble à un champ « inexistant » dans la base alors que la migration est bien passée. L'URL de connexion vit dans `prisma.config.ts` (CLI) et `lib/prisma.ts` (adaptateur `pg`), plus dans le bloc `datasource`.

### 13. Lancer les tests avec `npm test`, pas `npx jest`

```bash
npm test          # ✅
npx jest          # ❌ trois suites SEO en faux échec
```

`npm test` passe `NODE_OPTIONS="--experimental-vm-modules"`, indispensable parce que `yoastseo` tire `parse5` en ESM. Sans ces options, **trois suites** échouent avec « Test suite failed to run » alors que le code est bon : `npm test` donne 166 suites et 1 261 tests au vert, `npx jest` donne 3 suites en échec et 37 tests jamais exécutés (mesuré le 3 novembre 2026). C'est la même raison qui fait tourner la CI sur Node 24 alors que la production est sur Node 22.

### 14. Un composant client ne doit jamais importer `lib/prisma`

Un import de `lib/prisma` (même indirect, via un module qui en dépend) depuis un fichier marqué `'use client'` fait échouer le chargement de la page entière, avec le message « couldn't load » et aucune trace utile côté serveur.

C'est pour cela que plusieurs modules sont volontairement « purs » : `lib/eligibility.ts`, `lib/organisation-options.ts`, `lib/vat.ts`, `lib/price-tiers.ts` sont importables côté client et ne doivent **jamais** se mettre à importer Prisma. Leurs en-têtes le disent.

### 15. Les scripts TS one-off se lancent avec `jiti`

```bash
./node_modules/.bin/jiti scripts/mon-script.ts   # ✅
npx ts-node scripts/mon-script.ts                # ❌ casse (package.json type=module)
```

Sur l'hôte, les crons utilisent `tsx` installé globalement (avec `--env-file=.env`), pas le binaire local.

### 16. `git stash --include-untracked` détruit `public/uploads/`

Les images uploadées en production vivent dans `public/uploads/`, **non suivi par git**. Un `git stash --include-untracked` dans le dossier de production les emporte, et un `stash drop` les rend très difficiles à récupérer (il faut aller chercher le troisième parent du commit de stash, `<sha>^3`).

Ne jamais stasher avec `--include-untracked` dans un dépôt qui porte des données de production.

### 17. Purger des données de test : filtrer sur l'identifiant, pas seulement l'e-mail

Une purge SQL filtrée sur la seule adresse e-mail a supprimé neuf lignes pour six visées en septembre 2026 : la même adresse sert sur plusieurs ateliers. Toujours croiser `workshopId` (ou l'`id` des lignes) **et** l'e-mail, et compter les lignes avant de supprimer.
