---
id: integrations
title: Intégrations externes
sidebar_position: 6
---

# Intégrations externes

LeSite s'intègre avec trois services externes critiques pour son fonctionnement.

## LeHub (API publique)

LeSite consomme **uniquement** l'API publique de LeHub. Aucun accès direct à la base de données LeHub.

### Ce qu'elle apporte

- **Contenu dynamique** : ateliers, articles, ressources.
- **Mode chantier** : flag permettant de masquer le site au public.
- **Session partagée** : déchiffrement du cookie pour reconnaître les admins.
- **Webhooks** : revalidation ISR, notification contact.

### Fichiers clés

| Fichier | Rôle |
|---------|------|
| `lib/hub-auth.ts` | Déchiffrement cookie session LeHub |
| `lib/events.ts` | Appels API publique (workshops, articles, resources) |
| `middleware.ts` | Lecture flag mode chantier |
| `app/api/revalidate/route.ts` | Webhook revalidation (pseudo) |

### Variables d'environnement

| Nom | Rôle | Exemple |
|-----|------|---------|
| `NEXT_PUBLIC_HUB_URL` | URL LeHub (inlignée au build) | `https://hub.fresquesystemique.org` |
| `NEXTAUTH_SECRET` | Secret déchiffrement cookie (DOIT être identique au hub) | Généré (voir LeRunbook) |
| `AUTH_SESSION_COOKIE_NAME` | Nom du cookie (optionnel, défaut `__Secure-fresque.session-token`) | Doit rester synchronisé hub + LeSite |
| `REVALIDATE_SECRET` | Secret webhook revalidation | Généré (voir LeRunbook) |
| `CONTACT_NOTIFY_SECRET` | Secret webhook notification contact | Doit être identique côté LeHub |

Tous les `NEXT_PUBLIC_*` sont inlinés au build (passés en build args dans `docker-compose.yml`). Tout changement d'URL requiert un rebuild.

### Comportement en cas d'indisponibilité

**Fetch API LeHub inaccessible (ateliers, articles)** :

- Pages de contenu retournent gracieusement une liste vide ou message d'erreur.
- ISR cache continue de servir l'ancienne version (5 min).

**Mode chantier inaccessible** :

- Middleware log l'erreur et suppose `chantier=false` (par défaut, site visible).
- Visite ininterrompue pour l'utilisateur.

**Flag admins non déchiffrable** :

- Cookie absent ou invalide → visiteur vu `/chantier` s'il est actif.
- Administrateur doit réessayer connexion hub ou attendre cookie refresh.

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

## Resend (email contact)

Envoie l'email du formulaire contact au destinataire configuré.

### Ce qu'elle apporte

- **Email transactionnel** : formulaire contact → adresse CONTACT_EMAIL.

### Fichiers clés

- `app/api/contact/route.ts` : appel Resend.

### Variables d'environnement

| Nom | Rôle |
|-----|------|
| `RESEND_API_KEY` | Clé API Resend |
| `CONTACT_EMAIL` | Adresse destinataire |

### Comportement en cas d'indisponibilité

**Resend inaccessible** :

- `app/api/contact` retourne 503.
- Visiteur voit erreur et peut réessayer.
- LeHub webhook notification contact **ne s'appelle pas** (erreur Resend en premier).

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

1. **LeHub** : critique (tout contenu dynamique dépend d'elle).
2. **HelloAsso** : critique (paiements).
3. **Resend** : important (contact, pas d'impact utilisateur si absent).
4. **Plausible** : non-critique (analytics, pas d'impact utilisateur).
