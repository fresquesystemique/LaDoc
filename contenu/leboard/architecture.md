---
id: architecture
title: Architecture technique
sidebar_position: 3
---

# Architecture technique

## Stack

| Couche | Technologie | Version |
|--------|---|---|
| **Framework** | Next.js | 16.4.3 (App Router), servi par un serveur Node maison |
| **Runtime** | Node.js | 22 (image `node:22-alpine`), lancé par `tsx server.ts` |
| **Serveur temps réel** | Socket.io | 4.8 (`server.ts` + `server/socket-handler.ts`) |
| **Canvas** | Konva + react-konva | 9.3 + 19 |
| **Styles** | Tailwind CSS | v4 |
| **Icônes** | Phosphor | `@phosphor-icons/react` |
| **Database** | PostgreSQL + Prisma | 18 + 7.10.1 (base partagée avec LeHub) |
| **Visite guidée** | driver.js | 1.4 |
| **Tests** | Jest + Testing Library | `__tests__/` |
| **Infrastructure** | Docker + Nginx + VPS | Conteneur sur le port 3001 côté hôte |
| **CI/CD** | GitHub Actions | Deploy sur push `master` |

:::info Pourquoi un serveur maison et pas `next start`
Socket.io a besoin du serveur HTTP. `server.ts` crée ce serveur, y branche Next **et** Socket.io, et c'est ce fichier que lancent `npm run dev` et `npm start` (via `tsx`). Conséquence pratique : un composant qui marche en rendu Next peut quand même manquer son état temps réel si le gestionnaire de socket n'a pas été mis à jour.
:::

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
| `app/api/board/[token]/` | État initial du plateau (GET) |
| `app/api/regeneration/` | Contenu du feuillet Régénération pour une version de cartes, derrière le token d'un plateau qui l'utilise |
| `app/api/uploads/[...path]/` | **Relais** des images de diapositives depuis les uploads du Hub (voir ci-dessous) |

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
| `RegenerationButton.tsx`, `RegenerationSheet.tsx` | Bouton et feuillet « Régénération » (trois écrans : familles, pratiques, exemples) |
| `MobileUnsupported.tsx` | Message affiché sous 1024 px, à la place du plateau |
| `admin/LotEditor.tsx` | Composant éditeur de lots (présent dans le code, sans route accessible) |

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
| `prisma.ts` | Client Prisma (adaptateur `pg`, client généré dans `generated/prisma`) |
| `handCardSize.ts` | Facteur d'échelle des cartes de la main (5 crans, mémorisé par navigateur) |
| `ui-scale.ts` | Normalisation de la taille perçue de l'interface d'une machine à l'autre (référence 1660 px, bornes 0,85–1,2) |
| `viewport-support.ts` | Largeur minimale supportée (1024 px) |
| `board-auth-cookie.ts` | Cookie d'accès au plateau, posé à l'entrée par le token |

### ⚠️ Piège de maintenance : catalogue de plateaux dupliqué

Le catalogue de plateaux vit en dur dans `src/lib/plateaux.ts` côté LeBoard, et dans `lib/plateaux.ts` côté LeHub (attention, les deux chemins diffèrent : `src/lib/` d'un côté, `lib/` de l'autre). Les deux fichiers sont censés rester identiques. Tout changement effectué d'un côté sans l'autre crée une divergence silencieuse : les étapes, les matrices, leurs noms et leurs identifiants de cartes deviennent incohérents entre les deux applications en production, ce qui provoque des cartes mal placées ou des erreurs à la distribution des lots.

**La divergence existe, et elle a grandi.** Au 3 novembre 2026, le catalogue lui-même (étapes, matrices, identifiants de cartes) est bien identique des deux côtés, mais la version du Hub porte 26 lignes de plus : `listPlateaux()`, et une copie de `resolveRowMatrixStageForLot()` — fonction qui, côté LeBoard, vit dans `src/lib/row-matrix.ts`. Autrement dit, les **données** sont synchronisées à la main avec succès, mais les **fonctions** ont divergé de place et de contenu. Un `diff` donne encore une réponse lisible ; ce ne sera pas vrai longtemps.

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

## Le relais des images de diapositives

Les diapositives d'un lot sont exportées en images par le Hub, qui les stocke dans ses uploads. LeBoard **ne les charge pas directement depuis le domaine du Hub** : il les relaie par `/api/uploads/[...path]`.

Pourquoi : la politique de sécurité du plateau n'accepte que `img-src 'self'` (audit du 20 septembre 2026), alors que les données de lot portaient une URL absolue vers le Hub. Le navigateur refusait donc l'image **sans erreur serveur ni trace** — les diapositives avaient disparu des ateliers en ligne pendant six semaines avant que le lien soit fait.

Le relais est volontairement étroit :

- le laissez-passer est le token du plateau, comme pour `/api/regeneration` ;
- le verrou ne devine aucun format de chemin : la liste des chemins réellement cités par les lots du modèle de **ce** plateau est construite, et rien d'autre n'est servi. Une traversée (`../`), le matériel d'un autre atelier ou n'importe quel autre fichier des uploads sont hors de portée par construction ;
- le cache est `private, immutable` sur un an : l'artwork d'un export est immuable (son identifiant est tiré à chaque export), et l'URL portant un jeton ne doit jamais être mise en cache par un intermédiaire partagé.

:::warning Ordre de déploiement
Le relais passe par l'URL interne du Hub (`HUB_INTERNAL_URL`). Pour un chantier qui touche les deux applications, **déployer le Hub d'abord** : LeBoard relaie ce que le Hub expose.
:::

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

LeBoard utilise la **même base PostgreSQL que LeHub**, mais a son propre `prisma/schema.prisma` : un miroir partiel qui ne déclare que les tables dont il a besoin (voir [Modèle de données](./donnees.md)). Le Hub reste l'outil d'administration unique pour composer les versions de cartes (`WorkshopModel`), leurs lots (`Lot`, dont le mapping vers les cellules de matrice dans `cardIds`, une chaîne JSON), les titres de cartes et le contenu de la Régénération.

**Important** : les migrations de LeBoard sont appliquées depuis ce dépôt via `prisma migrate deploy` à son déploiement. Les deux applications sont sur Prisma 7 et doivent le rester ensemble.

## Authentification animateur

L'accès animateur est sécurisé par un **JWT signé par LeHub** (HS256, secret partagé `BOARD_ADMIN_JWT_SECRET`, durée 8 h, `src/lib/admin-auth.ts`) :

1. L'animateur clique « Animer » dans la fiche atelier du Hub.
2. Le Hub signe un jeton portant son `memberId` et redirige vers le plateau en le passant en paramètre d'URL (`?auth=…`).
3. LeBoard **dépose le jeton dans un cookie** dont le nom contient le token du plateau (`board-auth-<token>`, `src/lib/board-auth-cookie.ts`) : un animateur qui ouvre son plateau d'entraînement **et** son plateau d'atelier garde les deux laissez-passer, là où un cookie unique aurait écrasé le premier. Le paramètre disparaît ensuite de l'URL.
4. La page du plateau lit ce cookie, vérifie le jeton et ouvre les actions d'animation.

**Accès participant** : l'URL `board.fresquesystemique.org/b/[token]`, sans jeton. L'accès est en lecture-écriture sur le plateau (c'est une collaboration), mais sans aucune action d'animation (étapes, verrou, distribution).

## Ce qui tient quand la connexion lâche

Trois choix du gestionnaire de socket méritent d'être connus avant d'y toucher, parce qu'ils règlent des problèmes qui n'apparaissent qu'en atelier réel :

- **Les mains sont indexées sur un `clientId`, pas sur le `socket.id`.** Socket.io réattribue un identifiant de socket à chaque reconnexion : indexées dessus, les mains des participants disparaissaient au moindre rechargement ou micro-coupure. Le `clientId` survit, la main aussi, ainsi que son mode d'affichage.
- **Les émissions, en revanche, visent des `socket.id`** : la correspondance d'un `clientId` vers ses sockets se fait au moment d'émettre (`socketIdsForClient`).
- **La reconnexion et les pseudos** ont été durcis lors de la revue « prêt grand public » de septembre 2026, avant le premier atelier ouvert au public.
