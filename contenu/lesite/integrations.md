---
id: integrations
title: Intégrations externes
sidebar_position: 6
---

# Intégrations externes

LeSite n'appelle en réalité qu'un seul service de son propre chef : LeHub. HelloAsso passe par le Hub, Plausible est auto-hébergé, et OpenStreetMap ne sert que les tuiles de la carte. LeSite ne détient aucune clé d'API tierce.

## LeHub (API publique)

LeSite consomme **uniquement** l'API publique de LeHub. Aucun accès direct à la base de données LeHub.

### Ce qu'elle apporte

- **Contenu dynamique** : ateliers, articles, ressources.
- **Mode chantier** : flag permettant de masquer le site au public.
- **Session** : LeSite transmet le cookie du visiteur au Hub, qui répond qui il est. Aucun déchiffrement local, aucun secret d'authentification côté LeSite.
- **Référencement** : réglages globaux et fiche SEO par page.
- **Échanges dans les deux sens** : le Hub appelle LeSite pour revalider son cache et pour lire l'inventaire de ses pages publiques.

### Fichiers clés

| Fichier | Rôle |
|---------|------|
| `lib/hub-session.ts`, `lib/hub-auth.ts` | Pont d'auth : transmet le cookie à `/api/public/session` du Hub |
| `lib/events.ts` | Lecture des ateliers |
| `lib/seo-meta.ts` | Lecture de `/api/public/seo`, cache 300 s sous le tag `seo-meta` |
| `middleware.ts` | Lecture du flag mode chantier (cache 15 s) |
| `app/api/revalidate/route.ts` | Webhook de revalidation entrant (secret comparé à temps constant) |
| `app/api/seo/{routes,pages}/route.ts` | Inventaire et contenu des pages, servis au tableau SEO du Hub |

### Variables d'environnement

| Nom | Rôle | Exemple |
|-----|------|---------|
| `NEXT_PUBLIC_HUB_URL` | URL du Hub (inlinée au build) | `https://hub.fresquesystemique.org` |
| `AUTH_SESSION_COOKIE_NAME` | Nom du cookie (optionnel, défaut `__Secure-fresque.session-token`) | Doit rester synchronisé avec le Hub |
| `REVALIDATE_SECRET` | Secret du webhook de revalidation | Identique côté Hub |
| `CONTACT_NOTIFY_SECRET` | Secret du dépôt d'une demande de contact | Identique côté Hub |
| `SEO_CRAWLER_SECRET` | Laissez-passer du récupérateur de pages SEO | Identique côté Hub |

`NEXTAUTH_SECRET` **n'est plus une variable de LeSite** : le secret a été retiré pour que le composant public ne puisse plus forger de session administrateur.

Tous les `NEXT_PUBLIC_*` sont inlinés au build (passés en build args dans `docker-compose.yml`). Tout changement d'URL requiert un rebuild.

### Comportement en cas d'indisponibilité

**Fetch API LeHub inaccessible (ateliers, articles)** :

- Pages de contenu retournent gracieusement une liste vide ou message d'erreur.
- ISR cache continue de servir l'ancienne version (5 min).

**Mode chantier inaccessible** :

- Middleware log l'erreur et suppose `chantier=false` (par défaut, site visible).
- Visite ininterrompue pour l'utilisateur.

**Session non reconnue** :

- Cookie absent, expiré, ou Hub injoignable → le visiteur est traité comme anonyme, donc renvoyé vers `/chantier` si le mode est actif.
- L'administrateur se reconnecte sur le Hub ; il n'y a rien à réparer côté LeSite.

## HelloAsso (paiements)

HelloAsso traite les paiements des inscriptions. LeHub gère la relation ; LeSite en est un client indirect (via rewrite).

### Ce qu'elle apporte

- **Paiements sécurisés** : intention de paiement, redirection, webhook.
- **Traçabilité** : chaque paiement reçoit un `orderId`.

### Fichiers clés

- `next.config.js` : rewrite `/api/checkout` vers LeHub.
- LeHub maîtrise les interactions (client HelloAsso en `lib/helloasso.ts`).

### Variables d'environnement

Aucune côté LeSite. LeHub stocke les credentials HelloAsso (voir doc LeHub).

### Comportement en cas d'indisponibilité

**HelloAsso inaccessible** :

- LeHub endpoint `/api/checkout` retourne 503.
- LeSite rewrite transmet l'erreur au visiteur.
- Visiteur voit erreur et peut réessayer (HelloAsso souvent disponible après quelques min).

**Webhook perdu** :

- Paiement accepté par HelloAsso mais registration reste `pending` en LeHub.
- **Réconciliation quotidienne** (cron LeHub) retrouve l'ordre HelloAsso et valide.
- Visiteur n'a pas l'email de confirmation jusqu'au rattrapage.

## Resend : plus d'intégration directe

LeSite envoyait autrefois l'e-mail du formulaire de contact lui-même, avec sa propre clé Resend et sa propre adresse destinataire. **Ce n'est plus le cas** : le formulaire dépose une demande dans le Hub (`POST /api/public/contact-notification`), qui se charge de l'accusé de réception et des notifications admin.

Conséquences :

- `resend` n'est pas une dépendance de LeSite, et `RESEND_API_KEY` / `CONTACT_EMAIL` ne sont plus lues.
- Une demande n'est plus un e-mail qui peut se perdre : c'est une ligne suivie dans `/admin/contact-requests`.
- Si le Hub est injoignable, le formulaire échoue franchement plutôt que de confirmer un envoi sans trace.

## OpenStreetMap (tuiles de la carte)

La carte de l'agenda est rendue par Leaflet avec les tuiles publiques d'OpenStreetMap (`*.tile.openstreetmap.org`, autorisé dans `img-src`). Aucune clé, aucun compte. Si les tuiles ne répondent pas, la carte reste vide mais la liste des ateliers fonctionne.

Le **géocodage**, lui, n'a pas lieu côté LeSite : les coordonnées d'un atelier arrivent déjà calculées dans la fiche servie par le Hub.

## Plausible (analytics)

Analytics auto-hébergé pour mesure d'audience sans cookies.

### Ce qu'elle apporte

- **Mesure audience** : pages vues, visites, sources.
- **Consentement implicite** : pas de cookies ou bandeaux (RGPD-friendly).

### Fichiers clés

- `components/Analytics.tsx` : tag `<script>` Plausible en prod.

### Variables d'environnement

| Nom | Rôle | Exemple |
|-----|------|---------|
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Domaine mesuré (inliné au build) | `fresquesystemique.org` |
| `NEXT_PUBLIC_PLAUSIBLE_HOST` | URL serveur Plausible (inliné au build) | `https://plausible.fresquesystemique.org` |

### Comportement en cas d'indisponibilité

**Plausible inaccessible** :

- Tag script se charge mais échoue silencieusement (no-op).
- Analytics perdues jusqu'à reboot serveur.
- Visite utilisateur ininterrompue (pas d'erreur front).

## Ordre de criticité

1. **LeHub** : critique. Tout le contenu dynamique, la session, le SEO et les demandes de contact en dépendent.
2. **HelloAsso** : critique pour l'inscription payante, mais médiatisé par le Hub.
3. **OpenStreetMap** : cosmétique (la carte, pas la liste).
4. **Plausible** : non critique (mesure d'audience).
