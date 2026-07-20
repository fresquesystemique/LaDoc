---
id: developpement
title: Développement
sidebar_position: 7
---

# Développement

## Prérequis

- **Node.js** 20+ (avec npm)
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

# 5. Créer et appliquer les migrations
npx prisma migrate dev

# 6. (Optionnel) Seeder les données de dev
npm run db:seed

# 7. Lancer le serveur Next.js dev
npm run dev
```

L'app est accessible sur `http://localhost:3000`.

## Variables d'environnement

### Authentication

| Nom | Rôle | Exemple |
|-----|------|---------|
| `NEXTAUTH_SECRET` | Secret NextAuth (min 32 chars) | Générer avec `openssl rand -base64 32` |
| `NEXTAUTH_URL` | URL de l'app (local) | `http://localhost:3000` |
| `AUTH_COOKIE_DOMAIN` | Domaine partagé (prod seulement) | `.fresquesystemique.org` |
| `AUTH_SESSION_COOKIE_NAME` | Nom du cookie session | `__Secure-fresque.session-token` |

### Database

| Nom | Rôle | Exemple |
|-----|------|---------|
| `DATABASE_URL` | URL PostgreSQL | `postgresql://<utilisateur>:<mot_de_passe>@localhost:5432/fresquesystemique` |
| `POSTGRES_PASSWORD` | Mot de passe Postgres | Configuré dans `docker-compose.yml` |

### HelloAsso

| Nom | Rôle | Exemple |
|-----|------|---------|
| `HELLOASSO_CLIENT_ID` | OAuth2 client ID | Obtenu depuis espace dev HelloAsso |
| `HELLOASSO_CLIENT_SECRET` | OAuth2 client secret | Obtenu depuis espace dev HelloAsso |
| `HELLOASSO_ORG_SLUG` | Slug organisation HelloAsso | `la-fresque-systemique` |
| `HELLOASSO_ENV` | Environnement HelloAsso | `sandbox` (dev) ou `production` (prod) |
| `HELLOASSO_WEBHOOK_TOKEN` | Token sécurité webhook | Généré localement, doit matcher le webhook HelloAsso |

### Email (Resend)

| Nom | Rôle | Exemple |
|-----|------|---------|
| `RESEND_API_KEY` | Clé API Resend | `re_xxxxxxxx` |
| `RESEND_FROM_EMAIL` | Adresse expéditeur | `noreply@fresquesystemique.fr` |
| `RESEND_FROM_NAME` | Nom expéditeur | `Fresque Systémique` |

### LinkedIn OAuth

| Nom | Rôle | Exemple |
|-----|------|---------|
| `LINKEDIN_CLIENT_ID` | OAuth2 LinkedIn | Obtenu depuis dev LinkedIn |
| `LINKEDIN_CLIENT_SECRET` | OAuth2 LinkedIn secret | Obtenu depuis dev LinkedIn |

### Crons

| Nom | Rôle | Exemple |
|-----|------|---------|
| `CRON_SECRET` | Token sécurité crons | Générer avec `openssl rand -base64 32` |

### URLs croisées

| Nom | Rôle | Exemple |
|-----|------|---------|
| `NEXT_PUBLIC_APP_URL` | URL publique Hub (changé à chaque requête) | `http://localhost:3000` (dev) ou `https://hub.fresquesystemique.org` (prod) |
| `NEXT_PUBLIC_HUB_URL` | URL Hub (pour liens) | `https://hub.fresquesystemique.org` |
| `NEXT_PUBLIC_BOARD_URL` | URL LeBoard (pour SSO) | `https://board.fresquesystemique.org` |

### Autres

| Nom | Rôle | Exemple |
|-----|------|---------|
| `LESITE_URL` | URL LeSite (pour revalidation ISR) | `https://fresquesystemique.org` |
| `LESITE_REVALIDATE_SECRET` | Token revalidation ISR LeSite | Partagé avec LeSite |
| `CONTACT_NOTIFY_SECRET` | Token notifications contact LeSite | Partagé avec LeSite |
| `BOARD_SSO_SECRET` | Token SSO LeBoard | Partagé avec LeBoard |

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

## Environnement `dev.hub`

Un environnement de dev **partagé** existe sur le VPS (routage Nginx réel).

### Principe

- Une seule base de données PostgreSQL **partagée** avec `dev.board` (même DB).
- Stack Docker partagée (redis, postgres, nginx).
- URLs hardcodées pour le routage.
- Déploiement par push sur branche `dev`.

### Accès (voir LeRunbook)

Les adresses et les accès sont dans LeRunbook.

### Utilité

- Tester des features en environnement proche-prod avant déploiement.
- Vérifier les interactions Hub ↔ Board ↔ LeSite.
- Tester les webhooks HelloAsso en sandbox.

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

Les 14 templates emails sont durcodés dans `lib/email-template-defaults.ts` (blocs, charte, variables). Pour modifier un template, éditer le fichier source et redéployer. Aucune interface admin pour le contenu.

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

### 12. Prisma generate après schéma change

Après modification manuelle de `prisma/schema.prisma`, lancer :

```bash
npx prisma generate
```

Sinon les changements ne sont pas reflétés dans le client généré.
