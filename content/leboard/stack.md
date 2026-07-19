---
title: Stack technique
weight: 2
---

# Stack technique

## Technologies

| Couche | Technologie |
|---|---|
| Framework | Next.js 16 (App Router) sur un serveur HTTP custom |
| Temps réel | Socket.io 4 |
| Canvas | Konva.js / react-konva |
| Langage | TypeScript, React 19 |
| Base de données | PostgreSQL 18 + Prisma 5, base partagée avec LeHub |
| Styles | Tailwind CSS 4 |
| Visite guidée | driver.js |
| Tests | Jest, Testing Library |
| Infra | Docker, VPS, CI/CD |

La particularité de LeBoard est son **serveur custom** (`server.ts`) : au lieu du serveur intégré de Next.js, un serveur HTTP unique porte à la fois l'application Next.js et le serveur Socket.io. C'est ce qui permet de servir les WebSockets et les pages sur le même port.

## Structure du code

```
server.ts                    # serveur HTTP custom (Next.js + Socket.io)
server/
  socket-handler.ts          # toute la logique temps réel : placements, lots, mains privées, diaporamas, réactions
data/
  cards.json                 # métadonnées des 283 cartes (titre, textes)
public/cards/                # images des cartes par langue (non versionnées)
  fr/  en/  es/
prisma/
  schema.prisma              # modèles du plateau (migrations gérées ici)
src/
  app/
    api/board/[token]/       # état initial d'un plateau
    b/[token]/               # la page plateau, résout aussi l'étape/plateau actif
  components/
    BoardCanvas.tsx          # le canvas principal, l'état temps réel, la logique matrices/lots
    CardNode.tsx  CardViewer.tsx  StickyNoteNode.tsx
    DeckPanel.tsx             # la main privée d'un participant
    MatrixLayer.tsx  RowMatrixLayer.tsx   # rendu des deux formes de matrices
    SlidePresenterPanel.tsx  SlideOverlay.tsx   # présentation de diaporamas synchronisée
    BoardTour.tsx             # visite guidée (driver.js)
    LeftToolbar.tsx  Header.tsx  BottomCenter.tsx  BottomNav.tsx  ...
  lib/
    cards.ts  prisma.ts  socket.ts
    plateaux.ts               # catalogue des étapes et de leurs matrices
    matrix.ts  row-matrix.ts  matrix-stack.ts   # géométrie des matrices (grille, lignes, empilement)
    emergence.ts              # géométrie des cartes d'émergence
    lot-cards.ts  lot-slides.ts   # lecture des lots (mapping cellules / diaporamas)
```

## Comment le temps réel fonctionne

1. À l'arrivée sur `b/[token]`, la page charge l'état initial du plateau via l'API (placements de cartes, post-its, flèches, étape active) et résout le plateau (le catalogue d'étapes/matrices) associé à l'atelier.
2. Le client ouvre ensuite une connexion Socket.io et rejoint la « room » du plateau.
3. Chaque action (déplacer une carte, tracer une flèche, écrire un post-it, jouer une carte de sa main, naviguer dans un diaporama) est envoyée au serveur, persistée en base si besoin, et rediffusée aux autres participants de la room.
4. Les curseurs et les réactions sont diffusés en continu, sans persistance.

L'état de référence vit donc en base : un participant qui recharge sa page retrouve le plateau exact, et un atelier peut reprendre plus tard là où il s'était arrêté, y compris son étape active.

## Les cartes

Les métadonnées des 283 cartes (titres, textes recto/verso) sont dans `data/cards.json`. Les images, elles, ne sont pas versionnées dans le dépôt : elles se déposent dans `public/cards/` par langue. Ce découpage garde le dépôt léger et permet d'ajouter une langue sans toucher au code.
