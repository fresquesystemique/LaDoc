---
id: integrations
title: Intégrations externes
sidebar_position: 6
---

# Intégrations externes

LeBoard est conçu pour être **isolé des services externes**. Il ne parle qu'à la base PostgreSQL partagée et à LeHub (pour authentification et configuration). Aucune appel API à des services tiers.

## Dépendances internes au SI

### LeHub (configuration et authentification)

LeBoard dépend du Hub pour :

1. **Catalogue des plateaux** (`WorkshopModel`, `Lot`) — créés et gérés exclusivement par LeHub via `/admin/cards/`.
   - LeBoard lit ces données et les utilise pour structurer l'interface (étapes, lots, matrices).
   - Les métadonnées du plateau (stageId, matrice cellules, lots) viennent du Hub.

2. **Authentification animateur** — JWT signé par le Hub avec `BOARD_ADMIN_JWT_SECRET`.
   - Lien « Animer » dans la fiche atelier LeHub redirige vers `board.fresquesystemique.org/b/[token]?admin=<jwt>`.
   - LeBoard valide la signature JWT pour accorder les droits admin.

3. **Identité Workshop** — Link bidirectionnel.
   - Le Hub crée un atelier (Workshop).
   - Hub crée automatiquement une `Board` (leBoard crée la ligne en DB).
   - `Board.workshopId` référence l'atelier LeHub (pas de FK, juste textuel).

**Fichiers clés** :
- `src/lib/admin-auth.ts` — validation JWT admin.
- `app/b/[token]/page.tsx` — setup Socket.io, validation JWT.
- `server/socket-handler.ts` — gestion état temps réel, broadcast Socket.io.

### LeSite (lien public)

LeBoard n'a aucune intégration directe avec LeSite. Cependant :

- L'URL publique du plateau (`board.fresquesystemique.org/b/[token]`) est affichée dans la fiche atelier LeSite publique (via l'API LeHub `/api/public/workshops`).
- Le lien ne révèle rien de sensible — c'est juste une URL token sans contexte.

### Base PostgreSQL partagée

LeBoard partage la même base que LeHub. Cela signifie :

- **Lectures** : LeBoard lit `WorkshopModel`, `Lot`, `Member` (du Hub) pour l'authentification et la configuration.
- **Écritures** : LeBoard crée/modifie `Board`, `CardPlacement`, `Connection`, `StickyNote`, `BoardArrow`, `BoardLotDistribution`, `AnimatorSession`.
- **Migrations** : LeBoard gère ses propres migrations (`prisma/migrations/`) et les applique au déploiement.

## Aucune intégration externe

LeBoard n'appelle **aucun service externe** :

- ❌ Pas d'API HelloAsso (paiements gérés par LeHub).
- ❌ Pas d'API Telegram (notifications gérées par LeHub).
- ❌ Pas d'API Resend (emails gérés par LeHub).
- ❌ Pas d'API Google Slides : les supports sont lus et exportés **par le Hub**. LeBoard n'en relaie que les images produites, par son propre `/api/uploads`.
- ❌ Pas de webhook sortant.

## Comportement en cas d'indisponibilité

### LeHub indisponible

Si LeHub est indisponible au moment où un animateur veut animer :

1. L'animateur ne peut pas générer le token JWT (ne peut pas clicker le lien « Animer »).
2. Les boards existants restent accessibles en lecture/écriture publique (participants peuvent continuer à collaborer).
3. Les fonctionnalités admin (distribuer lots, changer étapes) restent actives (**pas de validation runtime du Hub**, authentification est stateless JWT).

### Base PostgreSQL indisponible

- Impossible de charger la page du plateau.
- Socket.io déconnecte, les participants voient une erreur de connexion.
- **Aucun repli** : le plateau dépend entièrement de la base.

### Images de diapositives : ce qui dépend du Hub

Les diapositives sont relayées depuis les uploads du Hub par `/api/uploads/[...path]`, via l'URL interne `HUB_INTERNAL_URL`. Si le Hub est arrêté, les images ne s'affichent plus — mais le plateau, lui, continue de fonctionner.

:::warning Un échec silencieux à connaître
Charger ces images directement depuis le domaine du Hub ne marche pas : la politique de sécurité du plateau n'accepte que `img-src 'self'`. Le navigateur refuse l'image **sans erreur serveur ni trace dans les logs**. Les diapositives avaient ainsi disparu des ateliers en ligne pendant six semaines avant que la cause soit trouvée (septembre 2026). Toute nouvelle ressource distante doit passer par un relais, ou la politique doit être explicitement modifiée.
:::

## Architecture déploiement

```
LeHub (hub.fresquesystemique.org)
    ├─ API /api/admin/workshops (crée Board)
    └─ JWT signing (BOARD_ADMIN_JWT_SECRET shared)
            │
            ▼
PostgreSQL (partagée)
    ├─ WorkshopModel, Lot (créés par Hub)
    └─ Board, CardPlacement, etc. (créés par Board)
            │
            ▼
LeBoard (board.fresquesystemique.org)
    ├─ Lecture WorkshopModel, Lot, Member
    └─ Écriture Board et modèles dérivés
```

## Variables d'environnement (pas de secrets externes)

LeBoard n'a besoin d'aucun secret externe :

```bash
DATABASE_URL=postgresql://<utilisateur>:<mot_de_passe>@host:5432/fresquesystemique
NEXT_PUBLIC_SOCKET_URL=https://board.fresquesystemique.org   # ou l'URL locale en dev
PORT=3000
BOARD_ADMIN_JWT_SECRET=<secret>        # Partagé avec LeHub
SOCKET_ALLOWED_ORIGINS=<origines>      # Origines autorisées pour Socket.io
HUB_INTERNAL_URL=http://hub:3000       # Relais des images de diapositives
```

Voir la page [Développement](./developpement.md) pour la liste complète.

## Considérations sécurité

### Isolation données

- LeBoard ne lit jamais les emails ou données personnelles des participants (pas même depuis `Registration`).
- LeBoard ne valide pas les inscriptions (= LeHub job).
- LeBoard ne gère pas les paiements (= LeHub job).

### Authentification animateur

- Jeton JWT HS256 signé par le Hub avec le secret partagé `BOARD_ADMIN_JWT_SECRET`, portant le `memberId`.
- **Durée : 8 heures.** Passé ce délai, l'animateur repasse par le lien « Animer » du Hub.
- Déposé dans un cookie dont le nom contient le token du plateau, ce qui permet de garder plusieurs laissez-passer en parallèle (plateau d'entraînement et plateau d'atelier).
- Aucune validation en ligne auprès du Hub : la signature est vérifiée localement.

### Accès public sans authentification

- L'URL d'un plateau donne un accès complet en lecture/écriture : c'est le principe d'un atelier collaboratif.
- Aucune permission par personne : tous les participants ont les mêmes droits.
- Seul l'animateur (jeton) dispose des actions d'animation (étapes, verrou, lots).
- Les deux routes qui servent du **matériel pédagogique** (`/api/regeneration`, `/api/uploads`) exigent le token d'un plateau qui utilise la version concernée. C'est le correctif de l'audit du 20 septembre 2026 : auparavant, un simple `workshopModelId` suffisait, et le Hub publiait ces identifiants sans authentification.
- Pas de limitation de débit sur les actions publiques.
