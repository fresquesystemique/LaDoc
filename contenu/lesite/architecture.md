---
id: architecture
title: Architecture technique
sidebar_position: 3
---

# Architecture technique

## Stack

| Couche | Technologie | Version |
|--------|---|---|
| **Framework** | Next.js | 16.4.3 (App Router, `output: 'standalone'`) |
| **Runtime** | Node.js | 22 (image `node:22-alpine`) |
| **Langage** | React + TypeScript | 19.2 + 5.x |
| **Styles** | Tailwind CSS | 4.2 (tokens maison dans `app/globals.css`) |
| **Icônes** | Phosphor + Lucide | `@phosphor-icons/react`, `lucide-react` |
| **Carte** | Leaflet + React-Leaflet | 1.9 + 5.0, pour l'agenda |
| **Tests** | Vitest | 26 fichiers de test |
| **Analytics** | Plausible auto-hébergé | Sans cookie |
| **Infrastructure** | Docker Compose + Nginx | Port 3002, reverse proxy sur l'apex |

LeSite n'a **ni base de données, ni Prisma, ni NextAuth, ni Resend** : aucune de ces dépendances n'est installée. Tout le dynamique vient de l'API publique du Hub, et LeSite ne détient aucun secret d'authentification.

## Où vit quoi

### Répertoires de premier niveau

| Chemin | Responsabilité |
|--------|---|
| `app/` | Routes App Router (pages + petites routes d'API) |
| `components/` | Composants React (pages, widgets, carte, listings) |
| `lib/` | Registre des routes, accès au Hub, SEO, formatage, données éditoriales |
| `tests/` | Tests Vitest (registre des routes, SEO, sitemap, partages, RGESN…) |
| `.github/workflows/` | CI/CD |
| `public/` | Assets statiques |

### Structure de `app/`

Pas de groupe de routes : la structure de dossiers reproduit exactement les URL publiques, et donc le registre.

| Chemin | Rôle |
|--------|------|
| `app/page.tsx` | Accueil |
| `app/offres/{suivre-un-atelier,se-former,organiser-un-atelier}/` | Les trois offres |
| `app/evenements/`, `app/evenements/[slug]/` | Agenda et fiche d'atelier |
| `app/catalogue/`, `app/catalogue/atelier-citoyen/` | Catalogue |
| `app/ressources/blog/`, `app/ressources/blog/[slug]/`, `app/ressources/mediatheque/` | Blog, article, médiathèque |
| `app/association/{a-propos,ce-que-la-systemique-change}/` | L'association |
| `app/contact/`, `app/confirmation/`, `app/annulation/[token]/` | Contact et parcours d'inscription |
| `app/mentions-legales/`, `app/cgu/`, `app/accessibilite/`, `app/ecoconception/` | Pages légales et déclarations |
| `app/chantier/` | Page « site en construction » |
| `app/sitemap.ts`, `app/robots.ts` | Sitemap dynamique et robots |
| `app/error.tsx`, `app/global-error.tsx` | Écrans d'erreur, qui portent le rechargement de build périmé |
| `app/api/{me,contact,revalidate,seo,og}/` | Les seules routes d'API propres à LeSite |

### Structure de `lib/`

| Fichier | Responsabilité |
|---|---|
| `public-routes.ts` | **Registre des pages publiques** : chemins, libellés, indexabilité, fil d'Ariane |
| `config.ts` | `SITE_URL` et `HUB_URL`, avec repli `\|\|` et non `??` |
| `hub-session.ts`, `hub-auth.ts` | Pont d'auth : transmet le cookie au Hub, ne déchiffre rien |
| `events.ts` | Lecture des ateliers depuis le Hub, regroupement par jour |
| `seo-meta.ts`, `article-meta.ts`, `workshop-meta.ts` | Résolution de la metadata : champ SEO du Hub, puis repli éditorial |
| `seo-crawler.ts` | Laissez-passer `x-seo-crawler` du récupérateur de pages du Hub |
| `seo-extract.ts` | Extraction du contenu d'une page pour l'analyse Yoast |
| `revalidate-payload.ts` | Lecture du corps `{ paths, tags }` du webhook de revalidation |
| `breadcrumbs.ts` | Fil d'Ariane calculé depuis le registre |
| `listing.ts` | Vocabulaire commun des pages de liste (tris, filtres) |
| `price-tiers.ts`, `price-format.ts` | Affichage de la grille tarifaire servie par le Hub |
| `trace-paths.ts` | Géométrie du système visuel « Le tracé », sans JSX, testée |
| `stale-build.ts` | Rechargement d'un onglet resté ouvert pendant une mise en ligne |
| `anti-bot.ts` | Garde anti-robots du formulaire de contact |
| `rgesn.ts` | Grille RGESN 2024 (78 critères officiels) de la page écoconception |
| `qualiopi.ts` | Valeurs du certificat Qualiopi de KAIROS, à ne pas paraphraser |
| `share-templates.ts` | Modèles de partage d'article |
| `json-ld.ts` | Données structurées Event et Article |
| `testimonials.ts`, `references.ts`, `pillars.ts`, `client-cases.ts`, `atelier-citoyen.ts`, `organisations.ts`, `fashion-systems.ts` | Contenus éditoriaux en code |
| `cart-context.tsx` | Panier d'inscription côté client, non persisté |

:::warning `lib/refs.ts` n'est pas `lib/references.ts`
Deux modules aux noms proches cohabitent. Vérifier lequel on importe avant de modifier l'un en croyant toucher l'autre.
:::

## Rendu et cache

LeSite mélange trois régimes, et savoir lequel s'applique à une page est la première question à se poser devant un contenu qui ne bouge pas :

| Régime | Pages | Détail |
|---|---|---|
| **ISR** | `/ressources/blog`, `/ressources/blog/[slug]`, `/ressources/mediatheque`, `sitemap.xml` | `revalidate = 300` (5 min), plus revalidation immédiate par webhook |
| **Statique** | pages éditoriales (accueil, offres, catalogue, association, pages légales) | Rendues au build, metadata lue au build ou mise en cache sous le tag `seo-meta` |
| **Client** | `/evenements` | Appelle l'API du Hub depuis le navigateur, d'où le Hub dans `connect-src` |

La revalidation par webhook accepte une liste de chemins **et** de tags (`POST /api/revalidate`, corps `{ paths, tags }`). Une route dynamique se revalide en passant son gabarit (`/ressources/blog/[slug]`) avec le type `'page'`. Les tags utilisent le profil de cache `'max'` de Next 16, dont la sémantique est *stale-while-revalidate* : après un enregistrement dans le Hub, la toute première visite peut encore afficher l'ancienne métadonnée, la suivante aura la nouvelle.

Le secret du webhook est comparé **à temps constant** (`timingSafeEqual` sur deux condensés SHA-256), pas avec `!==`, qui s'arrêtait au premier caractère différent.

## Le système visuel « Le tracé »

Refonte menée d'août à septembre 2026. Ce qu'il faut savoir avant d'écrire du style :

- **Tokens** dans `app/globals.css` : navy `#2B335B` et sa variante sombre, terre cuite `#A24936`, `--color-emergence` calculée en `color-mix`, polices Bricolage Grotesque (affichage) et Inter (texte), rayons et ombres nommés.
- **Échelle typographique** de cinq pas plus trois variantes denses : `display`, `h2`, `h2-dense`, `page-title`, `h3`, `body`, `body-lg`, `micro`. L'enjeu de la refonte de septembre 2026 était de ramener **16 tailles effectivement rendues** à cette échelle ; les composants partagés (`components/ui/Button.tsx`) la portent pour les dizaines de boutons du site.
- **Composants de la direction visuelle** : `Trace`, `NetworkBackground`, `SystemMatrix`, `UJourney`, `ComparisonStack`, `PageHeader` (utilisé sur la seule page `/association/a-propos`).
- **Géométrie du tracé** isolée dans `lib/trace-paths.ts` et testée : ce sont les seules valeurs du système visuel qu'une relecture ne permet pas de vérifier à l'œil.

## Politique de sécurité du contenu (CSP)

La CSP vit dans `next.config.js`, et non dans Nginx : le snippet d'en-têtes de sécurité de Nginx est partagé par treize vhosts, alors qu'une politique qui nomme le Hub et Plausible n'a de sens que pour LeSite — et elle doit être versionnée avec le code qui la rend valide.

Ce qu'elle autorise, et pourquoi :

- `script-src 'self' 'unsafe-inline'` plus l'origine Plausible. `'unsafe-inline'` est un **choix assumé** : Next injecte son script d'amorçage et la charge RSC en ligne dans chaque page, et la seule alternative propre — un nonce par requête — force le rendu dynamique et ferait perdre l'ISR à un site vitrine dont c'est le point fort.
- `img-src` : le Hub (visuels d'articles et d'ateliers), Gravatar (repli d'avatar d'auteur), les tuiles OpenStreetMap, `data:` et `blob:` pour `next/image`.
- `connect-src` : `'self'`, le Hub et Plausible.
- `frame-src 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'self'`, `upgrade-insecure-requests`.

Ce que la politique verrouille, et qui est l'essentiel : aucun script tiers, aucun cadre, aucun objet, aucune connexion sortante non listée.

## Pont d'authentification

### Le modèle actuel : LeSite ne détient aucun secret

LeSite **ne déchiffre plus le cookie de session**. Il transmet le cookie du visiteur à `GET /api/public/session` du Hub et se contente de la réponse (`{ id, role, isAdmin, firstName }`).

:::danger Pourquoi ce changement n'est pas qu'une refactorisation
Déchiffrer le cookie imposait de partager le `NEXTAUTH_SECRET` du Hub. Avec un secret symétrique, **savoir vérifier c'est savoir forger** : une compromission de LeSite — le composant public, exposé au trafic anonyme — permettait de fabriquer un jeton `isAdmin: true` que le Hub acceptait. Or LeSite n'a jamais eu besoin que de lire. Ne pas réintroduire de déchiffrement local pour « économiser un appel ».
:::

### Le nom du cookie reste dupliqué, mais à deux endroits seulement

| Où | Fichier |
|---|---|
| LeHub | `lib/auth.ts` |
| LeSite | `lib/hub-session.ts` (`AUTH_SESSION_COOKIE_NAME`, défaut `__Secure-fresque.session-token`) |

Le middleware ne porte plus sa propre copie du nom, il l'importe de `hub-session.ts`, et LeBoard n'utilise pas ce cookie du tout (son SSO animateur passe par un jeton signé). Une divergence entre les deux valeurs restantes ne casse rien au démarrage : elle casse silencieusement le contournement administrateur du mode chantier. `authjs.session-token` est tenté en repli, et les gros jetons fragmentés par Auth.js (`.0`, `.1`…) sont réassemblés.

### Le middleware

`middleware.ts` ne fait qu'une chose : le mode chantier. Il lit le flag sur `GET /api/public/site-mode` du Hub avec un cache mémoire de 15 secondes, et **ne bloque jamais le site en cas d'échec** (un flag illisible vaut « pas de chantier »). Les trois laissez-passer (admin, robots d'aperçu, `x-seo-crawler`) sont décrits dans [Présentation & fonctionnalités](./fonctionnalites.md#mode-chantier).

`robots.txt` et `sitemap.xml` doivent rester **hors du matcher du middleware** : sinon le mode chantier les réécrit vers la page chantier et Google reçoit du HTML.

## SEO

Le référencement de LeSite est **piloté depuis le Hub** depuis août 2026 : plus aucun argument de build, plus de `NEXT_PUBLIC_ALLOW_INDEXING`.

- **Metadata** : `lib/seo-meta.ts` lit `GET /api/public/seo` du Hub (réglages globaux + une fiche par chemin), en cache 300 s sous le tag `seo-meta`. L'ordre de résolution est toujours le même : champ SEO du Hub s'il est non blanc, sinon champ éditorial, sinon valeur du registre. Un champ SEO vidé dans le Hub **fait retomber sur l'éditorial**, il ne publie jamais une chaîne vide.
- **Indexation** : décidée par le couple `seoIndexingEnabled` (Hub) et `indexability` (registre).
- **Sitemap dynamique** : `app/sitemap.ts` suit exactement la règle d'indexabilité du registre. Pendant le chantier il n'expose que `/chantier` ; à la levée, il s'étend tout seul, sans redéploiement, et ajoute les articles et les fiches d'événement récupérés du Hub. Il respecte le `noindex` d'une fiche, car un sitemap qui propose une page portant la balise contraire est remonté en erreur par la Search Console. Une collection absente vaut mieux qu'un sitemap en erreur : Google retente un sitemap incomplet, il déréférence un sitemap qui répond 500.
- **Inventaire pour le Hub** : `/api/seo/routes` et `/api/seo/pages` servent au tableau `/admin/seo` la liste des pages et leur contenu à analyser.

## Onglet resté ouvert pendant un déploiement

Un onglet ouvert avant une mise en ligne fait tourner l'ancienne version : le premier « chunk » qu'il réclame n'existe plus sur le serveur, et Next affiche sa page d'erreur, que « Réessayer » ne répare pas. `lib/stale-build.ts`, branché sur `app/error.tsx` et `app/global-error.tsx`, détecte ce cas et déclenche **un** rechargement complet (horodaté dans le stockage local pour ne pas boucler). Constaté le 26 octobre 2026, corrigé le 27.
