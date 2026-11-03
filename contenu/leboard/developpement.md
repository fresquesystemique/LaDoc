---
id: developpement
title: Développement
sidebar_position: 7
---

# Développement

## Prérequis

- **Node.js** 22 (image de production `node:22-alpine` ; la barrière de qualité du CI tourne sur Node 24)
- **PostgreSQL** 18+ (partagée avec LeHub, même instance)
- **Git**
- Accès repo GitHub : `https://github.com/fresquesystemique/LeBoard`

## Installation locale

```bash
# 1. Clone le repo
git clone https://github.com/fresquesystemique/LeBoard.git
cd LeBoard

# 2. Copy .env.example et remplir variables
cp .env.example .env.local
# Renseigner DATABASE_URL (même DB que LeHub)
# NEXT_PUBLIC_SOCKET_URL = http://localhost:3001
# BOARD_ADMIN_JWT_SECRET

# 3. Install dépendances
npm install

# 4. Créer et appliquer les migrations
npx prisma migrate deploy

# 5. Lancer le serveur custom (Next.js + Socket.io)
npm run dev
```

L'app est accessible sur [localhost:3000](http://localhost:3000).

**Note** : LeBoard ne tourne pas seul. Il a besoin du Hub pour trois choses : signer le jeton d'animateur (le lien « Animer » part de la fiche atelier), composer les versions de cartes et les lots, et servir les images de diapositives que `/api/uploads` relaie. En local, cliquer « Animer » depuis le Hub lancé sur sa machine ; à défaut, signer un jeton à la main avec `signAdminToken()` de `src/lib/admin-auth.ts`.

## Variables d'environnement

| Nom | Rôle | Exemple |
|-----|------|---------|
| `DATABASE_URL` | URL PostgreSQL (partagée avec LeHub) | `postgresql://fresque:password@localhost:5432/fresquesystemique` |
| `NEXT_PUBLIC_SOCKET_URL` | URL Socket.io (pour le client) | `http://localhost:3001` (dev) ou `https://board.fresquesystemique.org` (prod) |
| `PORT` | Port d'écoute Next.js | `3000` (défaut) |
| `BOARD_ADMIN_JWT_SECRET` | Secret de signature du jeton d'animateur, **partagé avec le Hub** | Chaîne de 32 caractères minimum (`openssl rand -base64 32`) |
| `SOCKET_ALLOWED_ORIGINS` | Origines autorisées à ouvrir une connexion Socket.io | Séparées par des virgules |
| `HUB_INTERNAL_URL` | URL interne du Hub pour le relais des images de diapositives | `http://hub:3000` par défaut |

Ce sont les seules variables lues par le code. LeBoard n'a **aucune** clé d'API tierce.

## Lancer les tests

```bash
npm test          # Jest — lib (matrix, plateaux, cards…), composants, gestionnaire Socket.io
npm run lint      # ESLint
npx tsc --noEmit  # Vérification des types (il n'y a pas de script `typecheck` ici,
                  # c'est la commande que lance le CI)
```

:::note Pourquoi cette barrière existe
LeBoard se déployait sur simple push, sans jamais lancer les tests : **deux tests étaient rouges sur `master` depuis des mois** sans que rien ne le signale. La barrière de qualité a été ajoutée, bloquante, sur le modèle de celle de LeHub.
:::

## Structure locale conseillée

Si vous développez LeHub et LeBoard ensemble sur la même machine :

```
~/dev/
├── LeHub/
│   ├── docker-compose.yml  (lance PostgreSQL)
│   └── .env.local
└── LeBoard/
    ├── .env.local          (DATABASE_URL pointe même DB)
    └── server.ts
```

Lancez PostgreSQL depuis LeHub :
```bash
cd ~/dev/LeHub
docker compose up -d postgres
```

Puis LeBoard et LeHub en parallèle :
```bash
# Terminal 1 : LeHub
cd ~/dev/LeHub && npm run dev

# Terminal 2 : LeBoard
cd ~/dev/LeBoard && npm run dev
```

## Il n'y a plus d'environnement `dev.board`

`dev.board` et sa base partagée ont été **supprimés le 20 août 2026**, en même temps que `dev.hub`. Les branches de développement restent dans le dépôt. Une évolution se teste donc en local contre un Hub local, puis part en production.

## Pièges de développement

### Piège 1 : Socket.io écoute sur le même port que Next.js

LeBoard use un serveur custom `server.ts` qui lance à la fois le serveur Next.js ET Socket.io sur le **même port**. Il n'existe pas de port séparé pour Socket.io.

Le serveur HTTP écoute sur la variable d'environnement `PORT` (défaut 3000 en dev) :
```typescript
// server.ts, ligne 9
const port = parseInt(process.env.PORT ?? '3000', 10)
// ligne 38
httpServer.listen(port, ...)
```

Socket.io est attaché au même serveur HTTP et reçoit donc les connexions WebSocket sur ce port.

**En dev** : Le `.env.example` déclare `PORT=3000` mais contient `NEXT_PUBLIC_SOCKET_URL=http://localhost:3001`. Cette incohérence est un piège : si vous copiez le fichier tel quel, Socket.io ne sera accessible sur aucun port et la synchronisation temps réel échouera (le client attend le port 3001, le serveur ne l'expose pas).

**Correction** : alignez `NEXT_PUBLIC_SOCKET_URL` sur la valeur de `PORT` :
```bash
PORT=3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

**En prod** : `NEXT_PUBLIC_SOCKET_URL=https://board.fresquesystemique.org` (pas d'URL Socket spécifique, elle est dérivée automatiquement du domaine racine).

### Piège 2 : Migrations Prisma partagées

LeBoard et LeHub partagent le même schéma Prisma. Appliquer une migration LeBoard modifie la structure pour **les deux apps**. Avant de créer une migration :

1. Vérifier qu'elle n'impacte pas les modèles LeHub existants.
2. Tester `npx prisma migrate dev` et `npx prisma db push` en local.
3. Faire tourner les deux apps de dev après la migration (elles doivent accepter la même DB).

### Piège 3 : JWT animateur expiré

Les JWTs d'animateur ont une TTL courte (24h en prod). En dev, vous générez un JWT une fois et le réutilisez via URL. S'il expire :

```bash
# Générer manuellement un JWT valide
node -e "
const jwt = require('jsonwebtoken');
const secret = process.env.BOARD_ADMIN_JWT_SECRET || 'your-secret';
const token = jwt.sign(
  { sub: 'admin-1', aud: 'board-admin' },
  secret,
  { expiresIn: '24h' }
);
console.log(token);
"
```

Puis ajouter en URL : `?admin=<token>`.

### Piège 4 : Konva cache bitmap et rendu

Lors du développement avec beaucoup de cartes, les performances peuvent se dégrader. Vérifier :

1. **Culling** : `BoardCanvas.tsx` a un `CULLING_PADDING` qui cache les cartes en dehors du viewport. Réduire la valeur peut améliorer les perfs si vous avez beaucoup de cartes visibles.
2. **highDetail flag** : à faible zoom (moins de 40%), le rendu bitmappé accélère. Vérifier que le threshold `HIGH_DETAIL_OFF = 0.4` et `HIGH_DETAIL_ON = 0.5` sont appropriés pour votre cas d'usage.
3. **Nombre de cartes** : en local avec 283 cartes sur le canvas, le rendu peut être lent. Considérer un subset pour les tests rapides.

### Piège 5 : Socket.io room isolation

Les participants d'un board sont une `room` Socket.io unique (`boardToken`). Les broadcasts sont scoped à la room, donc :

- Les tests avec plusieurs browser tabs doivent avoir le même token.
- Les tests avec plusieurs boards doivent avoir des tokens différents.
- Les participants d'une autre salle ne reçoivent pas les événements.

Vérifier avec les dev tools Socket.io (`io().on('*', (e, a) => console.log(e, a))`).

### Piège 6 : Variables d'env et build Next.js

Les variables `NEXT_PUBLIC_*` sont intégrées au bundle statique au build. Si vous changez `NEXT_PUBLIC_SOCKET_URL` après `npm run dev`, vous devez restart le serveur :

```bash
# Arrêter npm run dev
# Modifier .env.local
# npm run dev (rebuild + restart Socket.io)
```

### Piège 7 : Prisma et hot reload

Quand vous modifiez `prisma/schema.prisma`, vous devez :

1. `npx prisma generate` → régénère le client Prisma.
2. Restart le serveur dev (hot reload ne détecte pas les changements Prisma).

### Piège 8 : Assets des cartes manquants

Les images de cartes (283 paires recto/verso en WebP) ne sont pas dans le repo. Elles doivent être placées dans `public/cards/fr/`, `public/cards/en/`, etc.

En dev sans les images :

```typescript
// CardNode.tsx verra une requête GET 404 pour l'image
img.onerror = () => console.warn(`Card image missing: ${cardId}`)
```

Les cartes s'affichent avec un placeholder vide. Pas bloquant pour tester la logique du plateau.

### Piège 9 : Database sharing

LeBoard et LeHub partagent la même DB. Si vous lancez les deux en local :

1. **Migrations** : chaque app a ses migrations. Appliquer les deux :
   ```bash
   npx prisma migrate deploy  # Applique toutes les migrations Board + Hub
   ```
2. **Seed** : LeHub a un `db:seed` qui popule des ateliers. Utile pour avoir des données de test.
   ```bash
   cd ~/dev/LeHub && npm run db:seed
   ```
   Puis LeBoard verra les ateliers crés.

### Piège 10 : Logs Socket.io verbeux

Socket.io en dev envoie beaucoup de logs (`io.on('debug')`, etc.). Pour réduire le bruit :

```javascript
// server/socket-handler.ts
const io = new Server(server, {
  // ...
  transports: ['websocket'],  // Désactiver polling HTTP
})
// io.engine.on('any', (data) => console.log(data))  // Commenter
```
