---
id: deploiement
title: Déploiement
sidebar_position: 8
---

# Déploiement

LeBoard dispose d'un CI/CD complètement automatisé. Tout push vers la branche `master` déclenche une chaîne de quality gates et de déploiement via GitHub Actions.

## CI/CD GitHub Actions

Le workflow est défini dans `.github/workflows/deploy.yml`.

### Déclencheur

- Branche : `master` uniquement
- Événement : push

### Étapes du pipeline

#### Job `quality` (bloquant)

S'exécute en premier. En cas d'échec, le déploiement est interdit.

```bash
1. Checkout code
2. Setup Node 20 + cache npm
3. npm ci
4. npx prisma generate (régénère client Prisma)
5. npm run typecheck (tsc sur code prod)
6. npm run lint (eslint)
7. npm test (jest)
```

**Erreurs bloquantes** :
- Échec typecheck → build échoue.
- Échec linter → build échoue.
- Échec test → build échoue.

#### Job `deploy` (dépend de `quality`)

S'exécute après `quality` seulement si succès. SSH sur le VPS et redéploie.

```bash
1. Checkout code (repo local CI)
2. SSH vers VPS (credentials: host, user, key)
3. cd [LeBoard-repo-dir]
4. git pull origin master
5. docker compose build --no-cache app
6. Récupère DATABASE_URL depuis LeHub .env (partagé)
7. npx prisma@5 migrate deploy (applique migrations)
8. docker compose up -d --no-deps app (redémarre conteneur)
9. docker image prune -f (nettoie images non utilisées)
```

Les chemins exacts et les commandes serveur sont dans LeRunbook.

**Après déploiement réussi** :
- Conteneur app tourne avec la dernière version.
- Nginx reverse proxy (host) envoie les requêtes vers le conteneur app.

### Vérifier que le déploiement est passé

1. **Commit deployé** : push vers `master` → regarder GitHub Actions, onglet « Workflows » → chercher le workflow `Deploy` pour ce commit.
2. **Status** : ✅ all checks passed = succès ; ❌ = échec (consulter les logs du workflow GitHub).
3. **Logs applicatifs** : en cas d'échec ou pour diagnostic, les accès au serveur et les commandes de consultation des logs se trouvent dans LeRunbook.
4. **Page à recharger** : la version new est active dès la fin du step 8 du deploy. **Attention** : les assets CSS/JS en cache navigateur peuvent être obsolètes. Force-reload : Ctrl+Shift+R (Chrome/Firefox).

## Architecture déploiement

```
┌─────────────────────────────────────────────────┐
│  GitHub (repo fresquesystemique/LeBoard, master)│
└──────────────────────┬──────────────────────────┘
                       │ push
                       ▼
        ┌──────────────────────────────┐
        │   GitHub Actions (workflow)  │
        │  1. Quality (typecheck, lint)│
        │  2. Deploy (SSH VPS)         │
        └──────────────┬───────────────┘
                       │ git pull + build
                       ▼
    ┌───────────────────────────────────────────┐
    │   VPS (board.fresquesystemique.org)      │
    │  ├─ Docker container: app (Next.js)      │
    │  ├─ PostgreSQL (shared with LeHub)       │
    │  ├─ Nginx (reverse proxy, host)          │
    │  └─ Socket.io (custom server)            │
    └───────────────────────────────────────────┘
```

## Dockerfile

Le Dockerfile utilise :
- **Image de base** : Node.js (version pinée en repo)
- **Next.js standalone output** : compilation self-contained (pas de serveur Next externe)
- **Prisma engine** : `linux-musl-openssl-3.0.x` (pinné dans `schema.prisma`)
- **Custom server** : `server.ts` lance Next.js + Socket.io sur le même port

**Output** : image prête à run `npm run start` (lance le serveur custom).

## Docker Compose

Le fichier `docker-compose.yml` définit :

- **Service `app`** : conteneur Next.js + Socket.io
- **Port** : écoute locale, reverse proxy externe gère le TLS
- **Network** : `hub_network` (partagé avec LeHub pour accès DB)
- **Labels `maintenant.*`** : routing et certificats TLS gérés automatiquement

## Commandes serveur (LeRunbook)

Les commandes manuelles (SSH, docker compose, systemctl, etc.) appartiennent à LeRunbook (repo privé) :

- SSH vers VPS
- Logs Docker (`docker compose logs app`)
- Redémarrage manual app
- Nettoyage Docker
- Certificat Let's Encrypt renouvellement
- Accès à la base PostgreSQL

**Aucune de ces commandes ne doit être documentée ici** (données sensibles).

:::danger Ne pas déployer à la main

LeBoard dispose d'un CI/CD qui redéploie automatiquement sur push. Lancer en plus un déploiement manuel (SSH + docker compose) provoque une collision : deux processus tentent de modifier le conteneur en même temps, causant des erreurs ou un état incohérent.

**Procédure correcte** :
1. Commit + push vers `master` (local).
2. Attendre le workflow GitHub Actions (5–10 min).
3. Vérifier les logs GitHub et les logs app (voir LeRunbook pour les commandes).
4. Recharger page navigateur (F5 ou Ctrl+Shift+R).

**Si le déploiement échoue** : consulter les logs GitHub (job `quality` ou `deploy`) et LeRunbook pour les commandes de récupération.

:::

## Rollback

En cas de problème post-déploiement :

1. **Revert sur GitHub** : `git revert HEAD` + push vers `master`.
2. **Attendre le redéploiement** : le workflow se déclenche avec la version précédente.
3. Alternativement (immédiat mais non idéal) : procédure manuelle sur le serveur (voir LeRunbook pour l'accès et les commandes).

## Environnements additionnels

### `dev.board` (environnement partagé)

- Branche : `dev` (push manuel).
- Même procédure CI/CD, déploie sur l'environnement partagé.
- Base DB partagée avec `dev.hub`.
- Accès et adresses dans LeRunbook.

## Considérations performance

- **Quality gates** : ~2–3 min (tests, typecheck, lint).
- **Docker build** : ~1 min (dépend du cache Docker).
- **Migration Prisma** : quelques secondes (dépend du nombre de migrations + taille DB).
- **Redémarrage app** : ~5 sec (Socket.io reinit, connexion HTTP probe).

**Total temps déploiement** : ~5–7 minutes du push au new code en prod.

## Problèmes courants

### Migration Prisma échoue au déploiement

- Cause : schéma incompatible avec la base prod.
- Solution : tester `npx prisma migrate deploy` localement avant de push.
- Si déjà en prod : voir LeRunbook pour rollback DB.

### Conteneur app reste `exited` après déploiement

- Vérifier les logs du conteneur (`docker compose logs app`).
- Causes communes : variable d'env manquante, port déjà utilisé, erreur startup Node.
- Solution : diagnostic via LeRunbook, corriger la cause, puis repush vers `master` pour retrigger le déploiement automatique.

### Socket.io affiche `GET /socket.io/?... 404`

- Cause : Socket.io serveur n'écoute pas (serveur custom `server.ts` n'a pas démarré).
- Vérifier : les logs du conteneur doivent afficher "Socket.io server listening on port 3000".
- Solution : vérifier que `npm run start` démarre le serveur custom (pas `next start`).

### Assets CSS/JS obsolètes après déploiement

- Cause : cache navigateur.
- Solution : force-reload page (Ctrl+Shift+R ou Cmd+Shift+R sur Mac).

### Nginx reverse proxy renvoie 502 Bad Gateway

- Cause : conteneur app inaccessible.
- Diagnostic et solutions (commandes serveur, etc.) : voir LeRunbook.

## Vérifications après déploiement

Checklist pour vérifier qu'un déploiement est sain :

1. **Page board charge** : `https://board.fresquesystemique.org/b/[token]` affiche le plateau.
2. **Socket.io connecté** : Network tab du navigateur montre WebSocket actif (pas 404).
3. **Cartes se chargent** : images WebP s'affichent (recto/verso).
4. **Tempo réel fonctionnel** : drag une carte → apparaît chez autres participants dans < 200ms.
5. **Aucune erreur console** : vérifier la console navigateur (F12 → Console).

## Secrets et variables en production

Les variables d'env de production sont stored dans le `.env` du VPS (fichier sensible) et passées au conteneur Docker via `docker compose up`. **Aucune de ces valeurs ne doit figurer dans le repo** (`.env.example` suffit pour documenter la structure).

Voir LeRunbook pour l'accès au fichier `.env` du VPS et la procédure de renouvellement des secrets.
