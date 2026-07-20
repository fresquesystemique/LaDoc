---
id: architecture
title: Architecture technique
sidebar_position: 3
---

# Architecture technique

## Stack

| Couche | Technologie | Version |
|--------|---|---|
| **Framework** | Next.js | 16 (App Router, output standalone) |
| **Langage** | React + TypeScript | 19 + 5.x |
| **Styles** | Tailwind CSS | 4.x |
| **Carte** | Leaflet + React-Leaflet | Pour l'agenda événements |
| **Auth** | NextAuth v5 | Lecture seule du cookie LeHub |
| **Email** | Resend | Formulaire contact |
| **Analytics** | Plausible auto-hébergé | Mesure audience sans cookies |
| **Infrastructure** | Docker Compose + Nginx | Port 3002, reverse proxy apex |

## Où vit quoi

### Répertoires de premier niveau

| Chemin | Responsabilité |
|--------|---|
| `app/` | Routes Next.js App Router (UI + API minimale) |
| `components/` | Composants React (pages, widgets, cartes) |
| `lib/` | Utilitaires (config URLs, auth hub, fetch API, cache) |
| `.github/workflows/` | CI/CD (deploy automatique) |
| `public/` | Assets statiques (favicon, OG image) |

### Structure de `app/`

#### Pages publiques

| Chemin | Rôle |
|--------|------|
| `app/page.tsx` | Accueil |
| `app/evenements/page.tsx` | Agenda filtrable |
| `app/evenements/[slug]/page.tsx` | Fiche atelier |
| `app/blog/page.tsx` | Actualités |
| `app/blog/[slug]/page.tsx` | Article individuel |
| `app/mediatheque/page.tsx` | Médiathèque |
| `app/ateliers/page.tsx` | Présentation ateliers |
| `app/ateliers/citoyen/page.tsx` | Atelier citoyen |
| `app/a-propos/page.tsx` | À propos de l'association |
| `app/contact/page.tsx` | Formulaire contact |
| `app/accessibilite/page.tsx` | Déclaration accessibilité |
| `app/mentions-legales/page.tsx` | Mentions légales |
| `app/confirmation/page.tsx` | Page retour après paiement HelloAsso |
| `app/chantier/page.tsx` | Page mode chantier |
| `app/annulation/[token]/page.tsx` | Confirmation annulation inscription |

#### Routes API

| Chemin | Rôle |
|--------|------|
| `app/api/me` | Expose session hub reconnue |
| `app/api/contact` | Réception formulaire contact |
| `app/api/revalidate` | Webhook LeHub, revalidation ISR |
| `app/api/site-mode` | État mode chantier |

Autres routes (`/api/checkout`, `/api/discount-codes/`, etc.) : rewrites vers LeHub.

### Structure de `components/`

| Répertoire | Contenu |
|---|---|
| `components/workshops/` | Composants agenda (liste, carte, filtres, détail) |
| `components/` (racine) | Composants pages (Header, Footer, AccordionFaq, SystemicLoops, IcebergDiagram, ChantierBar, etc.) |

### Structure de `lib/`

| Fichier | Responsabilité |
|---|---|
| `config.ts` | URLs publiques (SITE_URL, HUB_URL) |
| `hub-auth.ts` | Lecture du cookie de session LeHub, ponte d'auth |
| `events.ts` | Appels à l'API publique LeHub (workshops, articles, resources) |
| `cart-context.tsx` | Panier d'inscription (client-side, optionnel) |

## Rendez et cache

LeSite utilise l'**ISR (Incremental Static Regeneration)** de Next.js :

- Les pages de contenu (articles, ateliers) sont générées statiquement au build.
- Elles sont servies depuis le cache et régénérées au plus toutes les **5 minutes** (`revalidate: 300`).
- Lors d'une publication dans l'admin LeHub, un appel à `/api/revalidate` force la revalidation **immédiate** (secret partagé pour sécurité).

Le site reste donc performant et disponible même si LeHub redémarre.

## Conventions UI

- **Tokens CSS** : uniquement Tailwind utilitaires. Zéro tokens personnalisés.
- **Composants** : composants Next.js natifs (Link, Image avec optimisation).
- **Carte** : Leaflet pour la localisation d'ateliers.

## Authentification et pont d'auth

### Session partagée

- **Domaine** : `.fresquesystemique.org` en prod (cookie partagé avec LeHub).
- **Nom du cookie** : `__Secure-fresque.session-token` (configurable via `AUTH_SESSION_COOKIE_NAME`).
- **Chiffrement** : JWE A256CBC-HS512 (NextAuth).

### Lecture du cookie LeHub

`lib/hub-auth.ts` déchiffre le cookie avec le `NEXTAUTH_SECRET` :

```typescript
const payload = await decode({ token, secret, salt: COOKIE_NAME })
// Extrait isAdmin, id, firstName, role
```

Deux noms de cookies sont tentés :

1. `__Secure-fresque.session-token` (NextAuth prod).
2. `authjs.session-token` (fallback).

Les gros cookies sont réassemblés (Auth.js fragmente les gros jetons en `.0`, `.1`, etc.).

### Utilisation

- **Menu compte** (`/api/me`) : expose le firstName et rôle de l'utilisateur connecté.
- **Mode chantier** (`middleware.ts`) : reconnaît les admins (`isAdmin=true`) pour les laisser voir le vrai site.
- **Barre de bascule** (`ChantierBar`) : visible pour les admins en mode chantier.

:::warning Le nom du cookie de session est dupliqué
Le nom du cookie de session est codé en dur à trois endroits : `lib/auth.ts` côté LeHub, `middleware.ts` côté LeSite et `lib/hub-auth.ts` côté LeSite. Les trois doivent rester strictement synchronisés ; une divergence casse silencieusement le contournement administrateur du mode chantier.
:::

## Routes Next.js

- Pas de groupes de routes (`(name)`) : structure plate pour la simplicité.
- Slugs dynamiques (`[slug]`) pour articles et ateliers, en lecture seule depuis LeHub.

## SEO et partage

- **Métadonnées par défaut** : template de titre `%s · La Fresque Systémique`, Open Graph/Twitter.
- **Données structurées** : JSON-LD `Event` (fiches ateliers) et `Article` (actualités).
- **Indexation** : pilotée par `NEXT_PUBLIC_ALLOW_INDEXING`. Le site reste en `noindex` tant qu'elle ne vaut pas `"true"`.
- **Image de partage** : `public/og-default.png` (1200×630).

## Accessibilité

LeSite publie une déclaration d'accessibilité (`/accessibilite`) et suit une logique de sobriété :

- Pages statiques quand possible.
- Pas de cookies de suivi.
- Analytics Plausible (consentement implicite, pas de consentement cookie).
