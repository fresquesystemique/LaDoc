---
id: donnees
title: Modèle de données
sidebar_position: 4
---

# Modèle de données

LeSite n'a **aucune base de données propre**, aucun ORM, aucune table. Tout son contenu dynamique provient de l'API du Hub. Cette page décrit ce qu'il lit, ce qu'il envoie, et ce qu'il ne stocke jamais.

## Les routes du Hub que LeSite consomme

| Usage | Route du Hub | Contenu |
|---|---|---|
| **Agenda** | `GET /api/workshops?region=&department=&language=&format=` | Liste des séances publiées et à venir, filtrable. Contrat de liste, pas l'objet `Workshop` complet |
| **Fiche atelier** | `GET /api/public/workshops/[slug]` | Détail d'une séance, places restantes, grille tarifaire, régime de TVA, coordonnées géographiques |
| **Articles** | `GET /api/public/articles` et `/[slug]` | Articles publiés, avec leurs champs SEO |
| **Médiathèque** | `GET /api/public/resources` | Ressources publiques |
| **Référencement** | `GET /api/public/seo` | Réglages SEO globaux et une fiche par chemin de page |
| **Session** | `GET /api/public/session` | Identité du visiteur connecté, à partir du cookie transmis |
| **Mode chantier** | `GET /api/public/site-mode` | Flag `chantier` |
| **Statut d'inscription** | `GET /api/public/registration-status?checkoutIntentId=…` | État du paiement, lu par la page de confirmation |
| **Inscription à annuler** | `GET /api/public/registrations/[token]` | Détail avant confirmation d'annulation |

:::note Deux routes d'ateliers, deux contrats
L'agenda appelle `/api/workshops`, la fiche appelle `/api/public/workshops/[slug]`. Ce ne sont pas deux variantes du même objet : la liste ne porte ni adresse complète, ni description, ni mention de TVA, et la fiche ne porte pas les filtres. Une valeur manquante dans l'agenda se cherche donc dans le `select` de `/api/workshops` côté Hub, pas dans la fiche.
:::

### Ce que porte la liste d'ateliers

`id`, `slug`, `title`, `date`, `duration`, `eventType`, `theme`, `format`, `language`, `timezone`, `location`, `city`, `postalCode`, `region`, `capacity`, `targetPublic`, le nom de l'animateur·ice responsable (lead), les places restantes calculées, et une **fourchette de prix** calculée côté Hub à partir de la grille tarifaire et du taux de TVA des réglages.

Sont volontairement absents : `createdById`, `status`, les prix HT détaillés, et tout e-mail.

### Ce que porte la fiche atelier

En plus du détail éditorial et de l'adresse : `spotsLeft`, `isPast`, `waitlistEnabled`, `coords` (géocodage de l'adresse et de la ville, jamais du champ libre « Lieu »), `tiers` (la grille tarifaire telle quelle), `vatRate` et surtout **`vatMention`**.

:::warning Afficher `vatMention`, ne pas rejouer la règle
Le régime fiscal est tranché **côté Hub** (franchise en base, art. 293 B du CGI). LeSite affiche la mention telle qu'elle arrive. Recalculer la TVA côté site, c'est risquer d'afficher un montant qui ne correspond plus à ce qui est encaissé.
:::

La fiche sert encore un champ `prices` au format historique à trois tarifs, conservé pour un LeSite pas encore redéployé. **Il est destiné à disparaître** : le code courant lit `tiers`.

### Articles et ressources

Les articles portent leur contenu Markdown, leur auteur (avec avatar, Gravatar en repli) et leurs champs SEO. L'ordre de résolution de la metadata est fixé par `lib/article-meta.ts` : champ SEO du Hub s'il est non blanc, sinon champ éditorial. Les brouillons ne sortent jamais de l'API.

## Ce que LeSite envoie

Trois écritures sortantes, toutes vers le Hub, aucune en base locale :

1. **Inscription** : `POST /api/checkout` (rewrite vers le Hub), qui crée la `Registration` et l'intention de paiement HelloAsso. LeSite ne valide rien lui-même — places, tarifs, doublons sont contrôlés par le Hub.
2. **Demande de contact** : `POST /api/public/contact-notification`, authentifié par `CONTACT_NOTIFY_SECRET`. Le Hub persiste la demande, accuse réception et notifie les admins.
3. **Annulation** : `POST /api/public/registrations/[token]/cancel` (rewrite).

Tout le reste — ateliers, articles, ressources, réglages, mode chantier, SEO — s'édite **dans le Hub uniquement**.

## Ce que LeSite reçoit

Une seule entrée : `POST /api/revalidate`, appelée par le Hub à chaque enregistrement de contenu, avec un corps `{ paths, tags }` et l'en-tête `x-revalidate-secret`. Voir [Architecture](./architecture.md#rendu-et-cache).

## Secrets partagés avec le Hub

| Secret | Rôle |
|---|---|
| `REVALIDATE_SECRET` | Webhook de revalidation (comparé à temps constant) |
| `CONTACT_NOTIFY_SECRET` | Dépôt d'une demande de contact |
| `SEO_CRAWLER_SECRET` | Laissez-passer `x-seo-crawler` du récupérateur de pages |
| `AUTH_SESSION_COOKIE_NAME` | Nom du cookie de session, qui doit rester identique des deux côtés |

:::danger LeSite ne détient plus `NEXTAUTH_SECRET`
C'était le cas jusqu'en 2026 : LeSite déchiffrait le cookie avec le même secret symétrique que le Hub, ce qui lui donnait le pouvoir de **forger** une session `isAdmin`. Le secret a été retiré de LeSite, qui se contente désormais d'interroger le Hub. Ne pas le réintroduire.
:::

## Performance

- Pages éditoriales statiques, listings en ISR 5 minutes, agenda côté client.
- Aucune base locale, aucun CDN tiers, images servies par le Hub et optimisées par `next/image`.
- La seule dépendance de performance est la disponibilité de l'API du Hub. Les listings continuent de servir leur cache si le Hub redémarre ; l'agenda, lui, est vide puisqu'il interroge le Hub depuis le navigateur.
