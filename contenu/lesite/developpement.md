---
id: developpement
title: Développement
sidebar_position: 7
---

# Développement

## Prérequis

- **Node.js** 22 (l'image de production est `node:22-alpine`)
- **Git**
- Accès repo GitHub : `https://github.com/fresquesystemique/LeSite`

Ni Docker ni base de données en local : LeSite est un site Next.js qui lit l'API du Hub.

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

L'app est accessible sur `http://localhost:3000`. Si le Hub tourne déjà en local sur ce port, lancer LeSite ailleurs : `npm run dev -- -p 3002` (c'est aussi son port en production).

## Variables d'environnement

### Navigation publique

| Nom | Rôle | Exemple |
|-----|------|---------|
| `NEXT_PUBLIC_SITE_URL` | URL LeSite public (inlinée au build) | `http://localhost:3000` (local) ou `https://fresquesystemique.org` (prod) |
| `NEXT_PUBLIC_HUB_URL` | URL LeHub (inlinée au build) | `http://localhost:3001` (local) ou `https://hub.fresquesystemique.org` (prod) |

`NEXT_PUBLIC_ALLOW_INDEXING` **n'existe plus** : l'indexation est décidée par le réglage `seoIndexingEnabled` du Hub croisé avec l'`indexability` du registre `lib/public-routes.ts`. Ce n'est plus un argument de build.

### Authentification (pont d'auth)

| Nom | Rôle | Exemple |
|-----|------|---------|
| `AUTH_SESSION_COOKIE_NAME` | Nom du cookie de session à transmettre au Hub | Défaut : `__Secure-fresque.session-token`. Doit rester synchronisé avec le Hub |

LeSite ne lit **aucun** `NEXTAUTH_SECRET` : il ne déchiffre pas le cookie, il le transmet au Hub (voir [Architecture](./architecture.md#pont-dauthentification)).

### Revalidation et webhooks

| Nom | Rôle | Exemple |
|-----|------|---------|
| `REVALIDATE_SECRET` | Secret du webhook de revalidation ISR | Doit correspondre à celui du Hub |
| `CONTACT_NOTIFY_SECRET` | Secret du dépôt d'une demande de contact | Doit correspondre à celui du Hub |
| `SEO_CRAWLER_SECRET` | Laissez-passer `x-seo-crawler` du récupérateur de pages SEO | Doit correspondre à celui du Hub |

### Il n'y a plus de variables d'e-mail

`RESEND_API_KEY` et `CONTACT_EMAIL` ne sont plus lues : le formulaire de contact dépose sa demande dans le Hub, qui envoie l'accusé de réception et les notifications.

### Analytics (Plausible)

| Nom | Rôle | Exemple |
|-----|------|---------|
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Domaine mesuré (inliné au build) | `localhost:3000` (dev) ou `fresquesystemique.org` (prod) |
| `NEXT_PUBLIC_PLAUSIBLE_HOST` | URL serveur Plausible (inliné au build) | Vide en dev ; `https://plausible.fresquesystemique.org` en prod |

## Points de démarrage

En local, la plupart des secrets sont facultatifs :

- `REVALIDATE_SECRET`, `CONTACT_NOTIFY_SECRET`, `SEO_CRAWLER_SECRET` : absents, les échanges correspondants sont refusés en 401, le reste du site fonctionne.
- `NEXT_PUBLIC_HUB_URL` : son repli est le **vrai Hub de production**. Un oubli ne casse donc rien de visible, mais fait lire les données de production depuis un poste de dev. Pour un Hub local, surcharger la variable.
- `NEXT_PUBLIC_SITE_URL` : son repli est l'apex. Il a son importance, car cette valeur alimente les canonical, le sitemap et les URL Open Graph : un repli vers un domaine mort passerait totalement inaperçu (c'était le cas jusqu'en juin 2026 avec `auto.fresquesystemique.org`).

## Développement local avec LeHub local

Si tu fais du dev avec LeHub local (ex: LeHub sur localhost:3001) :

```env
# .env.local
NEXT_PUBLIC_HUB_URL=http://localhost:3000   # LeHub tourne sur 3000
AUTH_SESSION_COOKIE_NAME=authjs.session-token
```

Puis lancer LeSite sur un autre port :

```bash
npm run dev -- -p 3002
# Accès : http://localhost:3002
```

Le pont d'auth reste partiel en local : le cookie n'est pas partagé entre deux ports de `localhost` comme il l'est entre deux sous-domaines de `fresquesystemique.org`. Les pages publiques et les routes d'API se testent sans problème.

:::tip Viser `localhost`, pas `127.0.0.1`
Avec un serveur de dev Next, une page ouverte sur `127.0.0.1` voit son bundle client bloqué : rien ne s'hydrate, aucun `useEffect` ne s'exécute, et le symptôme ressemble à un bug de composant. Vaut aussi pour les tests de navigateur automatisés.
:::

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

### Le nom du cookie de session doit être identique au Hub

Si `AUTH_SESSION_COOKIE_NAME` diverge de la valeur du Hub, LeSite transmet un en-tête vide : le Hub répond « personne », et l'administrateur est traité comme un visiteur anonyme (donc renvoyé sur `/chantier`, et sans menu compte).

Vérification : dans les DevTools, chercher le cookie `__Secure-fresque.session-token`. Absent côté navigateur = pas connecté ; présent mais session non reconnue = noms désynchronisés.

### Les routes API `/api/checkout`, etc. sont des rewrites

Elles passent par le rewrite de `next.config.js` et vont directement vers LeHub. En dev local, elles iront vers `http://localhost:3001/api/checkout` (si `NEXT_PUBLIC_HUB_URL` l'indique).

Si tu testes le checkout, assure-toi que LeHub est disponible.

### ISR met les pages en cache

Avec `npm run dev`, l'ISR est désactivée (rechargement à chaque requête). En production, les listings et les articles sont cachés 5 minutes, et les pages éditoriales sont rendues au build.

Pour reproduire le comportement de production :

```bash
npm run build && PORT=3002 npm run start
```

### Une classe Tailwind absente du CSS de production

Tailwind v4 ne génère que les classes qu'il **voit écrites** dans les sources. Deux cas passent la revue de code et le dev, puis disparaissent en production :

1. une classe arbitraire calculée, par exemple `h-[calc(100vh-var(--spacing-header))]` ;
2. une classe **composée à l'exécution**, par exemple `` className={`text-${size}`} `` ou une concaténation équivalente.

Dans les deux cas, la règle n'existe pas dans le CSS compilé et l'élément reste sans style. La vérification est mécanique : chercher le motif dans `.next/static/*.css` après un build. Constaté sur LeSite le 6 septembre 2026.

### Les polices personnalisées se posent sur `<html>`

Avec `next/font` et Tailwind v4, les variables de police doivent être portées par la balise `<html>`. Posées plus bas dans l'arbre, **aucune** police personnalisée ne s'applique, et le site retombe silencieusement sur la pile système. Corrigé sur LeSite le 31 août 2026 ; LeHub était encore concerné à cette date.

### Tester une page publique derrière le mode chantier

Deux laissez-passer, et ils ne sont pas interchangeables :

- **l'en-tête `x-seo-crawler`** (avec le secret) sert au récupérateur de pages du Hub ;
- **un user-agent de robot d'aperçu** (`LinkedInBot`, par exemple) sert à vérifier ce que verra un partage.

Pour contrôler `/evenements`, c'est le second qu'il faut utiliser : la page appelle le Hub depuis le navigateur, et l'en-tête SEO ne change rien aux règles d'origine croisée.

### Un `curl` qui tronque sa sortie

Sur le VPS, `curl > fichier` et `curl | grep` tronquent la réponse à 201 octets, ce qui produit de faux négatifs quand on vérifie une page en production. Utiliser `curl -o fichier`, puis lire le fichier.

### Vérifier le responsive sur quatre largeurs

Une correction responsive se vérifie à 390, 768, 1024 et 1280 pixels, pas seulement sur la bande qu'on corrige : une régression mobile est passée en production en août 2026 pour avoir sauté cette vérification.

## Tests

LeSite a une vraie couverture Vitest : 26 fichiers dans `tests/`.

```bash
npm test          # vitest run
npm run test:watch
```

Ce qu'ils protègent, et qui vaut la peine d'être connu avant de modifier quoi que ce soit :

| Test | Ce qu'il empêche |
|---|---|
| `routes-completeness.test.ts` | Qu'une page de `app/` manque au registre `lib/public-routes.ts` |
| `public-routes.test.ts`, `nav-registry.test.ts`, `breadcrumb.test.ts` | Qu'un libellé de menu, de pied de page ou de fil d'Ariane dérive du registre |
| `sitemap.test.ts` | Qu'un sitemap de chantier expose autre chose que `/chantier`, ou ignore un `noindex` |
| `seo-meta.test.ts`, `blog-metadata.test.ts`, `workshop-metadata.test.ts` | Qu'un champ SEO vidé dans le Hub publie une chaîne vide au lieu de retomber sur l'éditorial |
| `seo-crawler.test.ts`, `seo-routes-api.test.ts` | Que le laissez-passer du récupérateur de pages s'ouvre sans secret |
| `hub-session.test.ts` | Que le pont d'auth accepte une session qu'il n'a pas vérifiée |
| `revalidate-payload.test.ts` | Qu'un corps de webhook mal formé revalide n'importe quoi |
| `price-tiers.test.ts`, `price-format.test.ts` | Qu'un tarif s'affiche autrement que ce qui sera encaissé |
| `rgesn.test.ts` | Que la grille RGESN officielle soit altérée |
| `trace-paths.test.ts` | Que la géométrie du tracé change sans qu'on le voie |
| `anti-bot.test.ts`, `contact.test.ts` | Que la garde anti-robots ou la validation du formulaire se relâche |
| `stale-build.test.ts` | Que le rechargement d'un build périmé boucle |

Pas de test d'intégration avec un vrai Hub : les appels sortants sont simulés.

## Linting et format

```bash
npm run lint    # ESLint (flat config)
```

Il n'y a pas de script `format` : il n'y a pas de Prettier dans le projet.

## Build pour la prod

```bash
npm run build
# Génère .next/standalone pour Docker
```

Le build génère une app Next.js complète prête à être containerisée.
