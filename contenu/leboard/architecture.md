---
id: architecture
title: Architecture technique
sidebar_position: 3
---

# Architecture technique

## Stack

| Couche | Technologie | Version |
|--------|---|---|
| **Framework** | Next.js | 16 (App Router, RSC) |
| **Serveur temps réel** | Socket.io | 4 (custom `server.ts`) |
| **Canvas** | Konva.js + react-konva | Dernière |
| **Styles** | Tailwind CSS | v4 |
| **Database** | PostgreSQL + Prisma | 18 + 5 (partagée avec LeHub) |
| **Visite guidée** | driver.js | Dernière |
| **Tests** | Jest + Testing Library | Versions std |
| **Infrastructure** | Docker + Nginx + VPS | Reverse proxy Let's Encrypt |
| **CI/CD** | GitHub Actions | Deploy sur push `master` |

## Où vit quoi

### Répertoires de premier niveau

| Chemin | Responsabilité |
|--------|---|
| `src/app/` | Routes Next.js App Router (pages, layouts, API) |
| `src/components/` | Composants React (Board, Canvas, Toolbar, etc.) |
| `src/lib/` | Utilitaires métier (plateaux, matrices, émergeances, socket, authentification admin) |
| `server/` | Serveur Socket.io custom (`socket-handler.ts`, gestion d'état temps réel) |
| `prisma/` | Schéma de données (modèles Board, CardPlacement, etc.), migrations, seed |
| `public/cards/` | Assets des cartes (images WebP recto/verso, par langue : fr/, en/, es/) |
| `data/` | Métadonnées des cartes (`cards.json`) et configuration |
| `.github/workflows/` | CI/CD (deploy.yml) |

### Structure de `src/app/`

#### Routes authentifiées

| Chemin | Rôle | Composants clés |
|--------|------|---|
| `app/b/[token]/page.tsx` | Page principale du plateau | `BoardCanvas`, Socket.io setup, état global du board |
| `app/api/board/[token]/route.ts` | Fetch état initial du board (cartes, sticky notes, etc.) |

#### Routes API

| Chemin | Responsabilité |
|--------|---|
| `app/api/board/[token]/` | État initial board (GET) |
| `app/api/board/[token]/upload/` | Upload assets (TODO) |

### Structure de `src/components/`

| Fichier | Contenu |
|---|---|
| `BoardCanvas.tsx` | Conteneur principal : Stage Konva, gestion viewport (zoom/pan), rendu couches (cartes, flèches, post-its, minimap) |
| `CardNode.tsx` | Rendu d'une carte Konva : image recto/verso, shadow bitmap-cachée, drag/drop, flipped state |
| `MatrixLayer.tsx` | Rendu grille matricielle (lignes/colonnes, cellules, slot markers) |
| `RowMatrixLayer.tsx` | Rendu matrice en lignes ancrées (variante lignes au lieu de grille) |
| `StickyNoteNode.tsx` | Rendu post-it Konva : texte éditable, redimensionnable, coloré |
| `DeckPanel.tsx` | Panel pioche en bas : affichage cartes participant (max 5 visibles) |
| `LotPanel.tsx` | Panel lots : boutons Distribuer/Pop-corn par lot |
| `LotPanelFloating.tsx` | Variante floating du panel lots |
| `LeftToolbar.tsx` | Toolbar outils : Flèche, Post-it, Pointer, etc. (modes) |
| `Toolbar.tsx` | Barre actions : Lock/Unlock, forcer suivi, étapes |
| `Header.tsx` | Header : titre atelier, pseudo participant, menu |
| `BottomNav.tsx` | Navigation étapes (séquenceur) |
| `BottomCenter.tsx` | Zoom controls, minimap |
| `ParticipantBar.tsx` | Affichage pseudos en ligne et suivi |
| `CardViewer.tsx` | Visualiseur plein écran carte : zoom indépendant, recto/verso |
| `SlideOverlay.tsx`, `SlidePresenterPanel.tsx` | Présentation diaporama synchronisée (lots diapositives) |
| `BoardTour.tsx` | Visite guidée (driver.js) |
| `PseudoModal.tsx` | Modal saisie pseudo participant |
| `Tooltip.tsx` | Tooltip utilitaire (labels actions) |
| `BoardCanvasLoader.tsx` | Skeleton loading plateau |
| `admin/LotEditor.tsx` | Composant éditeur lots (présent dans le code mais sans route accessible) |

### Structure de `src/lib/`

| Fichier | Responsabilité |
|---|---|
| `plateaux.ts` | Catalogue étapes/matrices : codé dur, dupliqué avec Hub (`lib/plateaux.ts`). Interfaces `Plateau`, `MatrixStage`, `RowMatrixStage`, etc. |
| `matrix.ts` | Calcul grille matricielle : `computeSlots()`, `findSnapPosition()`, cell coordinates, snap to grid |
| `row-matrix.ts` | Variante ligne : slots ancrés à des lignes, pas à une grille fixe |
| `emergence.ts` | Positionnement émergences : carte ancrée à une carte base, suivante en cas de déplacement |
| `matrix-stack.ts` | Stack des étapes visitées (pour retour rapide) |
| `lot-cards.ts` | Extraction IDs cartes d'un lot |
| `lot-slides.ts` | Gestion diapositives : parsing données, navigation |
| `cards.ts` | Utilitaires cartes : `getCardImageUrl()`, ID→URL mapping |
| `socket.ts` | Client Socket.io : setup, listeners événements, emit actions |
| `admin-auth.ts` | Vérification JWT admin (token signé par Hub) |
| `board-access.ts` | Vérification accès board (token public) |
| `z-index.ts` | Gestion z-index couches et éléments |
| `boardTour.ts` | Configuration visite guidée (driver.js) |
| `prisma.ts` | Singleton Prisma client |

### ⚠️ Piège de maintenance : catalogue de plateaux dupliqué

Le catalogue de plateaux vit en dur dans `src/lib/plateaux.ts` côté LeBoard, et dans `lib/plateaux.ts` côté LeHub (attention, les deux chemins diffèrent : `src/lib/` d'un côté, `lib/` de l'autre). Les deux fichiers sont censés rester identiques. Tout changement effectué d'un côté sans l'autre crée une divergence silencieuse : les étapes, les matrices, leurs noms et leurs identifiants de cartes deviennent incohérents entre les deux applications en production, ce qui provoque des cartes mal placées ou des erreurs à la distribution des lots.

**La divergence existe déjà.** Au 20 juillet 2026, la version de LeHub porte en plus une fonction `listPlateaux()` absente de celle de LeBoard. L'écart est aujourd'hui sans conséquence, puisqu'il s'agit d'un utilitaire de lecture, mais il montre que la synchronisation manuelle ne tient pas dans la durée.

**Risque** : après un commit, oublier de répliquer la modification dans l'autre application.

**Recommandation** : à chaque modification du catalogue (ajout ou suppression d'étape, changement de matrice) :
1. Modifier dans LeBoard : `src/lib/plateaux.ts`.
2. Comparer les deux versions : `diff LeBoard/src/lib/plateaux.ts LeHub/lib/plateaux.ts`.
3. Répliquer la modification dans LeHub (idéalement dans un commit séparé pour la traçabilité).
4. Tester les deux apps avec le même JDD (même DB en dev).

À terme, cette duplication devrait être centralisée (par ex: une API partagée ou un fichier de configuration externe).

### Structure de `server/`

| Fichier | Responsabilité |
|---|---|
| `socket-handler.ts` | Gestionnaire Socket.io : listeners `connection`, `disconnection`, `update:card`, `update:sticky`, `update:stage`, `lock:board`, etc. Gestion état temps réel en mémoire (per-room) : positionnement cartes, post-its, étape active, locks. Broadcasts aux participants. |

## Conventions de routage

### Next.js App Router

- **Routes dynamiques** `[token]` : paramètres d'URL, accessible via `params.token`.
- **Pas de route groups** : structure plate pour LeBoard.

### Layout hierarchy

```
app/layout.tsx (RootLayout)
├── (auth)/layout.tsx (si ajout futur)
├── app/b/[token]/page.tsx (plateau principal)
└── app/api/board/[token]/route.ts (API fetch état)
```

## Conventions UI

- **Tokens CSS** : uniquement Tailwind CSS (pas de tokens personnalisés).
- **Konva** : Group Node par élément (CardNode, StickyNoteNode), Layer par type (cartes, flèches, post-its).
- **Minimap** : vue répliquée du Stage principal, tailles réduites.

## Rendu Konva et pièges de performance

### Piège 1 : Cartes floues au zoom

**Symptôme** : les cartes deviennent floues quand on zoom in (zoom > 100 %), même si les images source sont haute résolution.

**Cause** : Konva rasterise les nodes complexes en bitmap pour les accélérer. Ce cache bitmap a une résolution fixe déterminée au moment du caching. Quand on zoom, le bitmap est étiré sans réinterpolation, d'où le flou.

**Solution** : invalider le cache bitmap lors des changements d'échelle (appel `group.clearCache()`). Dans `CardNode.tsx`, un `useEffect` surveille le changement du flag `bitmapCache` (qui bascule selon la plage de zoom) et appelle `clearCache()` quand le cache doit passer d'actif à inactif.

**Code** :
```typescript
// CardNode.tsx
if (bitmapCache !== bitmapCacheRef.current) {
  if (bitmapCacheRef.current && innerGroupRef.current) {
    innerGroupRef.current.clearCache()
  }
  bitmapCacheRef.current = bitmapCache
}
```

La stratégie globale est : **cacher au zoom < 95 % (performance)**, **invalider au zoom > 115 % (clarté)**. Entre 95 % et 115 % : bande morte pour éviter les oscillations.

### Piège 2 : Zoom saccadé (haché)

**Symptôme** : le zoom molette/pinch progresse par crans discrets au lieu d'être fluide et continu.

**Cause** : un zoom quantifié à un facteur fixe (ex: ×1,2 par cran) avec rendu complet à chaque cran. Le trackpad émet beaucoup de petits deltas, ce qui crée de petits crans visibles. Une souris émet un gros delta par cran, d'où un grand saut.

**Solution** : zoom continu avec une sensibilité dépendant de l'amplitude du delta. Dans `BoardCanvas.tsx` :
- Pour une souris (delta ~100 px par cran) : sensibilité = 0,0035, facteur ~×1,42 par cran.
- Pour un trackpad (petits deltas ~4 px) : sensibilité = 0,015, facteur ~×1,06 par petit delta.

Le seuil `WHEEL_NOTCH_THRESHOLD = 40` px sépare les deux régimes. La fonction `wheelZoomFactor()` applique une exponentielle clamped pour éviter les débordements.

**Code** :
```typescript
// BoardCanvas.tsx
function wheelZoomFactor(e: WheelEvent) {
  const delta = normalizeWheelDelta(e)
  const sensitivity = Math.abs(delta) >= WHEEL_NOTCH_THRESHOLD
    ? ZOOM_SENSITIVITY_NOTCH      // Souris
    : ZOOM_SENSITIVITY_PIXEL      // Trackpad
  return Math.min(2, Math.max(0.5, Math.exp(-delta * sensitivity)))
}
```

L'état du zoom est tenu en refs (`scaleRef`, `positionRef`) et animé de manière découplée du rendu React. Un timer RAF (`lastAnimTickRef`) commit l'état React tous les 120 ms environ, ce qui lisse l'animation et découple le zoom du render.

## Partage de base de données avec LeHub

LeBoard utilise la **même base PostgreSQL que LeHub**. Le schéma de LeBoard (modèles `Board`, `CardPlacement`, `Connection`, `BoardLotDistribution`, `StickyNote`, `BoardArrow`) vit dans le même `prisma/schema.prisma` hérité de LeHub. Le Hub est l'outil d'admin unique pour composer les modèles de plateau (`WorkshopModel`) et les lots (`Lot`), y compris leur mapping vers les cellules de matrice (`Lot.cardIds` est une chaîne JSON).

**Important** : les migrations de schéma Board sont appliquées depuis ce repo via `npx prisma migrate deploy` au déploiement.

## Authentification animateur

L'accès animateur est sécurisé via **JWT signé par LeHub** :
1. Animateur clique « Animer » dans la fiche atelier du Hub.
2. Le Hub génère un token JWT signé avec `BOARD_ADMIN_JWT_SECRET` (shared) et redirige vers `board.fresquesystemique.org/b/[token]?admin=<jwt>`.
3. LeBoard valide le JWT (signature + `aud` claim) dans `app/b/[token]/page.tsx` et initialise le rôle `isAnimateur`.
4. Le token est stocké en session (localStorage) et réutilisé pour les actions admin Socket.io.

**Token public** : les participants reçoivent juste l'URL `board.fresquesystemique.org/b/[token]`, pas de JWT. Leur accès est en lecture-écriture complète (collab participative), juste pas d'actions admin (stage/lock).
