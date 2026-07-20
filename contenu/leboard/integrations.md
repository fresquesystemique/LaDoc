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
- ❌ Pas d'API Google Slides (pas utilisé pour le plateau).
- ❌ Pas de webhook sortants.

## Comportement en cas d'indisponibilité

### LeHub indisponible

Si LeHub est indisponible au moment où un animateur veut animer :

1. L'animateur ne peut pas générer le token JWT (ne peut pas clicker le lien « Animer »).
2. Les boards existants restent accessibles en lecture/écriture publique (participants peuvent continuer à collaborer).
3. Les fonctionnalités admin (distribuer lots, changer étapes) restent actives (**pas de validation runtime du Hub**, authentification est stateless JWT).

### Base PostgreSQL indisponible

- Impossible de charger la page board.
- Socket.io disconnect, participants voient erreur de connexion.
- **Aucun fallback** — board est entièrement dépendant de la DB.

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
DATABASE_URL=postgresql://fresque:password@host:5432/fresquesystemique
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001  # (dev) ou https://board.fresquesystemique.org (prod)
PORT=3000
BOARD_ADMIN_JWT_SECRET=your-secret-here      # Partagé avec LeHub
```

Voir la page [Développement](./developpement.md) pour la liste complète.

## Considérations sécurité

### Isolation données

- LeBoard ne lit jamais les emails ou données personnelles des participants (pas même depuis `Registration`).
- LeBoard ne valide pas les inscriptions (= LeHub job).
- LeBoard ne gère pas les paiements (= LeHub job).

### Authentification animateur

- Token JWT signé avec secret partagé (BOARD_ADMIN_JWT_SECRET).
- TTL token = 24h (recherchercher depuis le Hub si besoin de renouvellement).
- Aucune validation online auprès du Hub — vérification signature locale seulement.

### Accès public sans authentification

- URL board publique = accès complet en lecture/écriture.
- Aucune permission par utilisateur — tous les participants ont les mêmes droits.
- Seul l'animateur (JWT) a les droits admin (stages, lots).
- **Pas de rate limit** sur les actions publiques (TODO si besoin).
