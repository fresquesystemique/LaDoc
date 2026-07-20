---
id: donnees
title: Modèle de données
sidebar_position: 4
---

# Modèle de données

LeBoard partage la même base PostgreSQL que LeHub. Les modèles de Board ne touchent jamais aux entités du Hub (Workshop, Registration, Member, etc.), sauf pour la lecture de `WorkshopModel` (catalogue des plateaux) et `Member` (authentification animateur).

Le schéma Prisma pour LeBoard vit dans `prisma/schema.prisma`, au même endroit que les modèles LeHub. Les migrations spécifiques LeBoard (tâche 4) sont versionnées et appliquées au déploiement.

## Modèles Board

### Board

Représente un plateau collaboratif (une instance par atelier en ligne).

| Champ | Type | Rôle |
|---|---|---|
| `id` | String (CUID) | Identifiant unique |
| `workshopId` | String (unique) | Référence atelier LeHub (1-to-1) |
| `workshopTitle` | String | Titre atelier copié (pour affichage sans req LeHub) |
| `token` | String (unique) | Token d'accès public (URL : `/b/[token]`) |
| `language` | String | "fr" (défaut) / "en" / "es" — langue des cartes |
| `status` | String | "active" (défaut) / "closed" |
| `isTraining` | Boolean | Atelier de test (formation) — affiche badge dans header |
| `expiresAt` | DateTime? | Expiration board (optionnel, utilisé pour les ateliers test) |
| `modelId` | String? | Référence WorkshopModel (Hub) — définit les étapes/lots/matrices |
| `placements` | CardPlacement[] | Cartes posées sur le board |
| `connections` | Connection[] | Flèches entre cartes |
| `lotDistributions` | BoardLotDistribution[] | Historique distributions des lots |
| `animatorSessions` | AnimatorSession[] | Sessions animateur actives |
| `stickyNotes` | StickyNote[] | Post-its |
| `arrows` | BoardArrow[] | Flèches avec anchorpoints |
| `activeStageId` | String | Étape active (persistée pour survivre aux déploiements) |
| `createdAt`, `updatedAt` | DateTime | Timestamps |

**Relations** : WorkshopModel (optionnel, peut être null si modèle supprimé), CardPlacement (cascade delete), Connection (cascade delete), StickyNote (cascade delete), BoardArrow (cascade delete), BoardLotDistribution (cascade delete), AnimatorSession (cascade delete).

### CardPlacement

Représente la position d'une carte sur le plateau (placement temporaire).

| Champ | Type | Rôle |
|---|---|---|
| `id` | String (CUID) | Identifiant unique |
| `boardId` | String | Board (FK) |
| `cardId` | String | ID métier de la carte (ex: "card-001") — pas une FK, juste une référence textuelle |
| `x`, `y` | Float | Positionnement en pixels |
| `rotation` | Float | Rotation en degrés (défaut 0) |
| `flipped` | Boolean | Recto/verso (défaut false = recto) |
| `zIndex` | Int | Ordre de rendu (défaut 0) |
| `fromConnections` | Connection[] | Flèches partant de cette carte |
| `toConnections` | Connection[] | Flèches vers cette carte |
| `updatedAt` | DateTime | Timestamp dernière modification |

**Cascade delete** sur Board : si board est supprimé, toutes ses CardPlacements disparaissent.

### Connection

Représente une flèche de causalité entre deux cartes.

| Champ | Type | Rôle |
|---|---|---|
| `id` | String (CUID) | Identifiant unique |
| `boardId` | String | Board (FK) |
| `fromId`, `toId` | String | CardPlacement IDs (FK) — relation `CardPlacement.fromConnections` / `toConnections` |
| `label` | String? | Texte optionnel sur la flèche |
| `createdAt` | DateTime | Timestamp création |

**Cascade delete** sur fromId/toId : si une CardPlacement est supprimée, ses flèches disparaissent aussi.

### BoardLotDistribution

Représente une distribution (historique) d'un lot à un board.

| Champ | Type | Rôle |
|---|---|---|
| `id` | String (CUID) | Identifiant unique |
| `boardId` | String | Board (FK) |
| `lotId` | String | Lot ID (FK du Hub) |
| `distributedAt` | DateTime | Timestamp distribution |
| `mode` | String | "distribute" ou "popcorn" — mode de lancement choisi par l'animateur |
| **Unique** | `[boardId, lotId]` | Un seul record par (board, lot) pair — prevent doublons |

**Piège : suppression en cascade** — si un Lot est supprimé du Hub, les BoardLotDistribution liés **disparaissent en cascade**. Cela ne pose pas de problème en prod (les lots ne sont jamais supprimés, juste archivés), mais en dev peut causer des surprises. Voir la note de la tâche 3 pour plus de détails.

**Cascade delete** sur Board : si board supprimé, toutes ses distributions disparaissent.

### StickyNote

Représente un post-it libre sur le plateau.

| Champ | Type | Rôle |
|---|---|---|
| `id` | String | ID custom (UUID v4) — **pas CUID**, pour contourner un bug Konva |
| `boardId` | String | Board (FK) |
| `text` | String | Contenu texte (défaut "") |
| `x`, `y` | Float | Position en pixels |
| `color` | String | "yellow" / "pink" / "blue" / "green" / "white" (défaut "yellow") |
| `zIndex` | Int | Ordre rendu (défaut 0) |
| `width`, `height` | Float | Dimensions en pixels (défaut 180×150) |
| `fontSize` | Int | Taille police (défaut 12) |
| `createdAt`, `updatedAt` | DateTime | Timestamps |

**Cascade delete** sur Board.

### BoardArrow

Représente une flèche entre anchorpoints (variante plus riche que Connection).

| Champ | Type | Rôle |
|---|---|---|
| `id` | String (CUID) | Identifiant unique |
| `boardId` | String | Board (FK) |
| `fromType`, `toType` | String | "card" / "sticky" — type source/cible |
| `fromId`, `toId` | String | ID carte ou post-it |
| `fromAnchor`, `toAnchor` | String | Anchorpoint ("tl", "tc", "tr", "ml", "mr", "bl", "bc", "br") |
| `direction` | String | "forward" / "both" (défaut "forward") |
| `color` | String | Couleur flèche (défaut "gray") |
| `strokeWidth` | Int | Épaisseur trait (défaut 2) |
| `createdAt`, `updatedAt` | DateTime | Timestamps |

**Cascade delete** sur Board.

### AnimatorSession

Représente une session animateur active (pour tracking connexion).

| Champ | Type | Rôle |
|---|---|---|
| `id` | String (CUID) | Identifiant unique |
| `boardId` | String | Board (FK) |
| `memberId` | String | ID animateur (Hub Member) |
| `pseudo` | String | Pseudo affiché (défaut "") |
| `expiresAt` | DateTime | Expiration session (défaut +24h) |
| `createdAt` | DateTime | Timestamp création |

**Cascade delete** sur Board. Utilisé pour tracer les connexions animateur et implémenter le timeout (logout après 24h ou fermeture browser).

## Modèles de référence (LeHub, lecture seule)

### WorkshopModel

Catalogue des modèles d'atelier (étapes, lots, matrices). **Créé et géré exclusivement par LeHub** via `/admin/cards/`.

| Champ | Type | Rôle |
|---|---|---|
| `id` | String (CUID) | Identifiant unique |
| `name` | String | Nom du modèle (ex: "Fresque Systémique v1") |
| `language` | String | "fr" (défaut) |
| `plateauId` | String? | ID plateau (maps à `src/lib/plateaux.ts`) |
| `lots` | Lot[] | Les lots du modèle |
| `boards` | Board[] | Les boards utilisant ce modèle |
| `createdAt`, `updatedAt` | DateTime | Timestamps |

### Lot

Ensemble de cartes ou diapositives à lancer ensemble. **Créé via LeHub**.

| Champ | Type | Rôle |
|---|---|---|
| `id` | String (CUID) | Identifiant unique |
| `modelId` | String | WorkshopModel (FK) |
| `name` | String | Nom du lot (ex: "Actions") |
| `order` | Int | Position dans la séquence |
| `stageId` | String? | Étape liée (ex: "stage-2") |
| `kind` | String? | "normal" (défaut) / "emergence" / null |
| `cardIds` | String | JSON stringifié : `[{"cardId":"card-001","col":0,"row":0},...]` |
| `contentType` | String | "cards" (défaut) / "slides" |
| `slidesData` | String? | JSON stringifié si diaporama (images + notes) |
| `distributions` | BoardLotDistribution[] | Historique distributions pour ce lot |

**Cascade delete** si WorkshopModel supprimé.

### Member

Utilisateur du Hub (animateurs, admins). **Lecture seule pour LeBoard**.

| Champ clés | Type | Rôle |
|---|---|---|
| `id` | String | ID unique |
| `email` | String | Email |
| `role` | String | Rôle pédagogique ("animateur", "formateur", etc.) |
| `isAdmin` | Boolean | Accès admin |

Utilisé uniquement pour valider le JWT de l'animateur et tracer les sessions.

## Diagramme relations Board

```
WorkshopModel (Hub admin)
    │
    ├─ plateauId (ref → src/lib/plateaux.ts)
    └─ Lot[] (lots du modèle)
        │
        └─ BoardLotDistribution (historique distribution)
            │
            └─ Board (plusieurs boards par lot)
                ├─ CardPlacement[] (cartes posées)
                │   └─ Connection[] (flèches vers d'autres cartes)
                ├─ StickyNote[] (post-its)
                ├─ BoardArrow[] (flèches avancées)
                ├─ AnimatorSession[] (sessions animateurs)
                └─ activeStageId (étape actuelle)

Member (Hub auth)
    │
    └─ AnimatorSession (liaison animateur → board)
```

## Remarques opérationnelles

- **Pas de soft delete** sur Board et dérivés (contrairement au Hub). Les boards sont créés à la volée et expirés via `expiresAt`.
- **Pas de relation directe Workshop** : Board référence juste `workshopId` textuel, pas une FK vers `Workshop`. Cela permet une indépendance légère (Board peut exister si Workshop est supprimé).
- **Partage DB** : toute migration Board doit être versionnée dans ce repo (`prisma/migrations/`) et appliquée au déploiement.
