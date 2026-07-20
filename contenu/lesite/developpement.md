---
id: developpement
title: Développement
sidebar_position: 7
---

# Développement

## Prérequis

- **Node.js** 20+ (avec npm)
- **Git**
- Accès repo GitHub : `https://github.com/fresquesystemique/LeSite`

Pas de Docker ni de base de données locales requises pour le dev (LeSite est une SPA statique + fetch d'API).

## Installation locale

```bash
# 1. Clone le repo
git clone https://github.com/fresquesystemique/LeSite.git
cd LeSite

# 2. Copy .env.example et remplir les variables
cp .env.example .env.local

# 3. Install dépendances
npm install

# 4. Lancer le serveur Next.js dev
npm run dev
```

L'app est accessible sur `http://localhost:3000`.

## Variables d'environnement

### Navigation publique

| Nom | Rôle | Exemple |
|-----|------|---------|
| `NEXT_PUBLIC_SITE_URL` | URL LeSite public (inlinée au build) | `http://localhost:3000` (local) ou `https://fresquesystemique.org` (prod) |
| `NEXT_PUBLIC_HUB_URL` | URL LeHub (inlinée au build) | `http://localhost:3001` (local) ou `https://hub.fresquesystemique.org` (prod) |
| `NEXT_PUBLIC_ALLOW_INDEXING` | Indexation moteurs (inlinée au build) | `"false"` (dev/preview) ou `"true"` (prod) |

### Authentification (pont d'auth)

| Nom | Rôle | Exemple |
|-----|------|---------|
| `NEXTAUTH_SECRET` | Secret déchiffrement cookie session | Doit être **identique au NEXTAUTH_SECRET du hub** (voir LeRunbook) |
| `AUTH_SESSION_COOKIE_NAME` | Nom du cookie (optionnel) | Défaut : `__Secure-fresque.session-token`. Doit rester synchronisé hub. |

### Revalidation et webhooks

| Nom | Rôle | Exemple |
|-----|------|---------|
| `REVALIDATE_SECRET` | Secret webhook revalidation ISR | Généré localement, doit matcher celui du hub |
| `CONTACT_NOTIFY_SECRET` | Secret webhook notification contact | Généré localement, doit matcher celui du hub |

### Email (Resend)

| Nom | Rôle | Exemple |
|-----|------|---------|
| `RESEND_API_KEY` | Clé API Resend | `re_xxxxxxxx` (optionnel en dev) |
| `CONTACT_EMAIL` | Adresse destinataire contact | `contact@fresquesystemique.org` |

### Analytics (Plausible)

| Nom | Rôle | Exemple |
|-----|------|---------|
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Domaine mesuré (inliné au build) | `localhost:3000` (dev) ou `fresquesystemique.org` (prod) |
| `NEXT_PUBLIC_PLAUSIBLE_HOST` | URL serveur Plausible (inliné au build) | Vide en dev ; `https://plausible.fresquesystemique.org` en prod |

## Points de démarrage

En dev, tu peux ignorer la plupart des secrets :

- `NEXTAUTH_SECRET` : peut être une valeur random locale (ex: `random123456789`). Nécessaire pour le déchiffrement cookie (même invalide, tu verras `/chantier`).
- `RESEND_API_KEY` : optionnel. Si absent, formulaire contact loggera une erreur mais ne crashera pas.
- `REVALIDATE_SECRET` / `CONTACT_NOTIFY_SECRET` : optionnels. Les webhooks seront rejetés mais l'app marchera.
- `NEXT_PUBLIC_HUB_URL` : pointera sur le vrai hub par défaut. Pour un hub local, change la var.

## Développement local avec LeHub local

Si tu fais du dev avec LeHub local (ex: LeHub sur localhost:3001) :

```env
# .env.local
NEXT_PUBLIC_HUB_URL=http://localhost:3001  # LeHub dev sur 3001
NEXTAUTH_SECRET=<même que LeHub local>
AUTH_SESSION_COOKIE_NAME=__Secure-fresque.session-token
```

Puis lance LeSite sur un autre port :

```bash
npm run dev -- -p 3002
# Accès: http://localhost:3002
```

Le pont d'auth ne marchera pas entièrement (cookies pas vraiment partagés sur localhost, domaines différents), mais tu peux quand même tester les pages publiques et les APIs.

## Pièges spécifiques LeSite

### Les `NEXT_PUBLIC_*` sont inlinés au build

Tout changement à une variable `NEXT_PUBLIC_*` nécessite un rebuild :

```bash
# Dev : Next.js auto-recharge les variables
npm run dev

# Prod : doit être passé en build arg
docker compose build app
```

Si tu changes `NEXT_PUBLIC_HUB_URL` et que le site pointe toujours sur l'ancien hub, c'est qu'il n'y a pas eu de rebuild.

### Le cookie de session doit être identique au hub

Si `AUTH_SESSION_COOKIE_NAME` ou `NEXTAUTH_SECRET` n'est pas synchronisé avec LeHub, tu ne pourras pas :

- Te connecter comme admin.
- Voir le vrai site en mode chantier.
- Accéder au menu compte.

Vérification : en console DevTools, cherche le cookie `__Secure-fresque.session-token` (ou autre `AUTH_SESSION_COOKIE_NAME`). Absent = pas connecté.

### Les routes API `/api/checkout`, etc. sont des rewrites

Elles passent par le rewrite de `next.config.js` et vont directement vers LeHub. En dev local, elles iront vers `http://localhost:3001/api/checkout` (si `NEXT_PUBLIC_HUB_URL` l'indique).

Si tu testes le checkout, assure-toi que LeHub est disponible.

### ISR met les pages en cache

Durant le dev avec `npm run dev`, l'ISR est désactivée (rechargement à chaque requête). En prod, après 5 min, la page est cachée.

Pour tester le cache ISR en prod-like, utilise `npm run build && npm run start`.

## Tests

LeSite a des tests Vitest minimalistes :

```bash
npm test  # Lance Vitest
```

Les tests couvrent principalement :

- Parsing des URLs.
- Valeurs d'env.

Pas de tests d'intégration (nécessiteraient un hub de test).

## Linting et format

```bash
npm run lint    # ESLint
npm run format  # Prettier (si configuré)
```

## Build pour la prod

```bash
npm run build
# Génère .next/standalone pour Docker
```

Le build génère une app Next.js complète prête à être containerisée.
