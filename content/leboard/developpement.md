---
title: Lancer en local
weight: 4
---

# Lancer en local

## Prérequis

- Node.js 20 ou plus récent
- Une instance PostgreSQL : celle de votre LeHub local, puisque les deux applications partagent la base

## Installation

```bash
git clone <dépôt LeBoard>
cd LeBoard

cp .env.example .env.local
# renseigner les variables ci-dessous

npm install
npx prisma migrate deploy    # applique les migrations du plateau
npm run dev                  # serveur custom : Next.js + Socket.io, http://localhost:3000
```

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL (la même base que LeHub) |
| `NEXT_PUBLIC_SOCKET_URL` | URL du serveur Socket.io (en production, l'URL publique de l'application) |
| `PORT` | Port d'écoute |
| `BOARD_ADMIN_JWT_SECRET` | Secret de signature des jetons d'authentification admin, basés sur le modèle `Member` partagé avec LeHub |

## Les images de cartes

Les images ne sont pas dans le dépôt. Pour un plateau fonctionnel en local, déposer les fichiers dans `public/cards/fr/` (et `en/`, `es/` si besoin) au format `card-NNN-recto.webp` / `card-NNN-verso.webp`. Sans elles, l'application fonctionne mais les cartes s'affichent vides.

## Tester le temps réel

Ouvrir le même plateau (`http://localhost:3000/b/<token>`) dans deux navigateurs ou deux fenêtres privées : les déplacements de cartes et les curseurs doivent se refléter instantanément d'une fenêtre à l'autre. C'est le test de fumée de toute modification touchant `socket-handler.ts`.

Pour créer un plateau de test sans passer par LeHub, le plus simple est de créer un « atelier test » depuis l'espace Supports d'un LeHub (local ou de préproduction), qui génère un lien direct.

## Lancer les tests

```bash
npm test    # Jest : géométrie des matrices, plateaux, émergences, cartes, composants, socket-handler
npm run lint
```
