---
id: donnees
title: Modèle de données
sidebar_position: 4
---

# Modèle de données

LeSite n'a aucune base de données propre. Tout son contenu dynamique provient de l'API publique de LeHub. Cette page explique ce que LeSite lit, d'où il vient, et ce qu'il n'écrit jamais.

## Où les données viennent

Toutes les données dynamiques sont récupérées via l'API publique de LeHub (`GET /api/public/*`) selon l'environnement `NEXT_PUBLIC_HUB_URL` :

| Ressource | Route | Contenu |
|-----------|-------|---------|
| **Ateliers** | `GET /api/public/workshops` | Liste des ateliers publiés |
| **Atelier détail** | `GET /api/public/workshops/[slug]` | Fiche atelier complète |
| **Articles** | `GET /api/public/articles` | Liste des articles publiés |
| **Article détail** | `GET /api/public/articles/[slug]` | Contenu article complet |
| **Ressources** | `GET /api/public/resources` | Liste des ressources médiathèque |
| **Session hub** | `GET /api/me` (via hub-auth) | Données utilisateur connecté (isAdmin, firstName, role) |
| **Mode chantier** | `GET /api/public/site-mode` | Flag `chantier` |

## Modèles consommés depuis LeHub

Les routes de l'API publique LeHub retournent des sous-ensembles des modèles Prisma pour la sécurité (pas d'email complet, pas d'IDs internes sensibles).

### Workshop (ateliers)

Consommé via `GET /api/public/workshops` et `GET /api/public/workshops/[slug]`.

Champs utilisés par LeSite :

- `id`, `slug` : identifiants
- `title`, `description` : contenu
- `date`, `duration`, `timezone` : planification
- `capacity`, `spotsLeft` : places
- `format` : "en_ligne" / "presentiel" / "hybride"
- `eventType` : "atelier" / "formation"
- `targetPublic` : "grand_public" / "inter_organisations"
- `theme` : thème optionnel
- `location`, `address`, `city`, `postalCode`, `region`, `department` : adresse (autocomplétée BAN)
- `price`, `priceSolidaireHT`, `priceClassiqueHT`, `priceSoutienHT` : tarification
- `leadAnimator` : objet `{firstName, lastName}` du responsable (relation WorkshopAnimator lead)
- `isPublished` : statut publication

Champs **non utilisés** :

- Email de l'animateur (privé).
- `createdById`, `organisationId` : structures internes.
- Status détail (draft/cancelled) : seuls les publiés sont retournés.

### Article

Consommé via `GET /api/public/articles` et `GET /api/public/articles/[slug]`.

Champs utilisés par LeSite :

- `id`, `slug` : identifiants
- `title`, `excerpt`, `content` : texte
- `category`, `tags` : organisation
- `imageUrl` : couverture
- `authorName`, `authorRole`, `authorAvatarUrl` : auteur
- `publishedAt` : date de publication
- `wordCount` : statistique

Champs **non utilisés** :

- `authorId` : FK interne.
- Brouillons ou contenus non publiés : seuls les publiés sont retournés.

### Resource (médiathèque)

Consommé via `GET /api/public/resources`.

Champs utilisés par LeSite :

- `id`, `slug` : identifiants
- `title`, `description` : texte
- `type` : "article" / "livre" / "rapport" / "podcast" / "video"
- `url`, `thumbnail` : accès
- `tags` : organisation

## Ce que LeSite écrit (jamais)

LeSite ne crée aucune donnée dans LeHub. Les seules écritures sortantes sont :

1. **Paiements** : le formulaire d'inscription envoie à `/api/checkout` (rewrite vers LeHub) qui crée une `Registration` et intention de paiement HelloAsso.
2. **Contact** : le formulaire contact envoie à `/api/public/contact-notification` (LeHub décide du traitement email/Telegram).
3. **Revalidation** : webhook `/api/revalidate` appelé par LeHub à chaque publication (side-effect : invalide cache ISR).

**Données ne devant jamais être modifiées côté LeSite** :

- Modèles LeHub (`Workshop`, `Article`, `Resource`, `Member`, etc.).
- Paramètres du site.
- Contenu admin (mode chantier, paramètres intégrations).

Tout doit être édité dans l'admin LeHub.

## Caching et revalidation

### ISR (5 minutes)

Les pages de contenu utilisent `revalidate: 300` :

```typescript
// app/blog/page.tsx
export const revalidate = 300  // Revalidation toutes les 5 min
```

À chaque requête après 5 min d'inactivité, la page est régénérée à partir de la dernière API LeHub.

### Revalidation immédiate

Quand un administrateur publie un contenu dans LeHub, un webhook POST vers `https://fresquesystemique.org/api/revalidate` force la revalidation immédiate. Le webhook inclut un en-tête HTTP `x-revalidate-secret` contenant le secret partagé :

```typescript
// app/api/revalidate/route.ts (pseudo-code)
export async function POST(req) {
  const secret = req.headers.get('x-revalidate-secret')
  if (secret !== REVALIDATE_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }
  revalidatePath('/blog')
  revalidatePath('/evenements')
  // etc.
  return { revalidated: true }
}
```

Le secret `REVALIDATE_SECRET` doit être configuré côté LeSite ET côté LeHub (dans Paramètres Intégrations).

## Sécurité des données

### Données sensibles exclues de l'API

L'API publique LeHub filtre les données sensibles :

- Pas d'emails complets (sauf lors du checkout).
- Pas d'IDs internes (registrations, paiements).
- Pas de données RGPD (participants, historique).
- Pas de paramètres admin.

### Secrets partagés

Les seuls secrets partagés LeHub ↔ LeSite sont :

- `NEXTAUTH_SECRET` : déchiffrement cookie session.
- `REVALIDATE_SECRET` : webhook revalidation.
- `CONTACT_NOTIFY_SECRET` : webhook notification contact.

Tous les trois doivent être gérés dans LeRunbook (repo privé).

## Performance

LeSite est extrêmement performant car :

- Pages statiques en majorité (ISR toutes les 5 min).
- Pas de DB locale (latence API + cache).
- Assets optimisés (images Next.js, CSS Tailwind).
- Plausible auto-hébergé (pas de CDN tiers lent).

À l'échelle, la seule dépendance de performance est LeHub (disponibilité + latence de son API publique).
