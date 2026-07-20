---
id: deploiement
title: Déploiement
sidebar_position: 8
---

# Déploiement

LeHub dispose d'un CI/CD complètement automatisé. Tout push vers la branche `main` déclenche une chaîne de quality gates et de déploiement via GitHub Actions.

## CI/CD GitHub Actions

Le workflow est défini dans `.github/workflows/deploy.yml`.

### Déclencheur

- Branche : `main` uniquement
- Événement : push

### Étapes du pipeline

#### Job `quality` (bloquant)

S'exécute en premier. En cas d'échec, le déploiement est interdit.

```bash
1. Checkout code
2. Setup Node 20 + cache npm
3. npm ci --legacy-peer-deps
4. npx prisma generate (régénère client Prisma)
5. npm run typecheck (tsc sur code prod, exclude __tests__)
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
3. cd [repo-dir] && git pull origin main
4. docker compose build app (build image Next standalone)
5. docker compose up -d postgres (lance/relance Postgres)
6. sleep 10 (attendre connexion DB)
7. Récupère IP interne PostgreSQL + password depuis .env
8. DATABASE_URL=... npx prisma@5 migrate deploy (applique migrations)
9. docker compose up -d --no-deps app (redémarre conteneur app)
10. docker image prune -f (nettoie images non utilisées)
```

**Après déploiement réussi** :
- Conteneur app tourne avec la dernière version.
- Nginx reverse proxy (host) envoie les requêtes vers le conteneur app.
- **Nginx doit être reloadé manuellement** : voir LeRunbook pour la commande de reload.

### Vérifier que le déploiement est passé

1. **Commit deployé** : push vers `main` → regarder GitHub Actions, onglet « Workflows » → chercher le workflow `Deploy` pour ce commit.
2. **Status** : ✅ all checks passed = succès ; ❌ = échec (consulter les logs du workflow GitHub).
3. **Logs applicatifs** : en cas d'échec ou pour diagnostic, les accès au serveur et les commandes de consultation des logs se trouvent dans LeRunbook.
4. **Page à recharger** : la version new est active dès la fin du step 9 du deploy. **Attention** : les assets CSS/JS en cache navigateur peuvent être obsolètes. Force-reload : Ctrl+Shift+R (Chrome/Firefox).

## Architecture déploiement

```
┌─────────────────────────────────────────────────────┐
│  GitHub (repo OpenFresqueSystemique, branche main)  │
└──────────────────────┬──────────────────────────────┘
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
    │   VPS (hub.fresquesystemique.org)        │
    │  ├─ Docker container: app (Next.js)      │
    │  ├─ Docker container: postgres           │
    │  ├─ Nginx (reverse proxy, host)          │
    │  └─ systemd: nginx reload (manuel)       │
    └───────────────────────────────────────────┘
```

## Dockerfile

Le Dockerfile utilise :
- **Image de base** : Node.js (version pinée en repo)
- **Next.js standalone output** : compilation self-contained (pas de server Next externe)
- **Prisma engine** : `linux-musl-openssl-3.0.x` (pinné dans `schema.prisma:3`)

**Output** : image prête à run `node .next/standalone/server.js`.

## Commandes serveur (LeRunbook)

Les commandes manuelles (SSH, systemctl, etc.) appartiennent à LeRunbook (repo privé) :

- SSH vers VPS
- Logs Docker
- Redémarrage manual app/postgres
- Nettoyage Docker
- Certificat Let's Encrypt renouvellement
- Reload Nginx après déploiement

**Aucune de ces commandes ne doit être documentée ici** (données sensibles).

:::danger Ne pas déployer à la main

LeHub dispose d'un CI/CD qui redéploie automatiquement sur push. Lancer en plus un déploiement manuel (SSH + docker compose) provoque une collision : deux processus tentent de modifier le conteneur en même temps, causant des erreurs ou un état incohérent.

**Procédure correcte** :
1. Commit + push vers `main` (local).
2. Attendre le workflow GitHub Actions (30–60 sec).
3. Vérifier les logs GitHub et les logs app (`docker compose logs app` sur le VPS).
4. Recharger page navigateur (F5 ou Ctrl+Shift+R).

**Si le déploiement échoue** : consulter les logs GitHub (job `quality` ou `deploy`) et LeRunbook pour les commandes de récupération.

:::

## Rollback

En cas de problème post-déploiement :

1. **Revert sur GitHub** : `git revert HEAD` + push vers `main`.
2. **Attendre le redéploiement** : le workflow se déclenche avec la version précédente.
3. Alternativement (immédiat mais non idéal) : procédure manuelle sur le serveur (voir LeRunbook pour l'accès et les commandes).

## Environnements additionnels

### `dev.hub` (environnement partagé)

- Branche : `dev` (push manuel).
- Même procédure CI/CD, déploie sur l'environnement partagé.
- Base DB partagée avec `dev.board`.
- Accès et adresses dans LeRunbook.

## Considérations performance

- **Build Next.js** : ~2 min (typecheck, lint, tests, build).
- **Docker build** : ~1 min (dépend du cache Docker).
- **Migration Prisma** : quelques secondes (dépend du nombre de migrations + taille DB).
- **Redémarrage app** : ~5 sec (connexion HTTP probe).

**Total temps déploiement** : ~4–5 minutes du push au new code en prod.

## Problèmes courants

### Migration Prisma échoue au déploiement

- Cause : schéma incompatible avec la base prod.
- Solution : tester `npx prisma migrate deploy` localement avant de push.
- Si déjà en prod : voir LeRunbook pour rollback DB.

### Conteneur app reste `exited` après déploiement

- Vérifier les logs du conteneur.
- Causes communes : variable d'env manquante, port déjà utilisé, erreur startup Next.js.
- Solution : diagnostic via LeRunbook, corriger la cause, puis repush vers `main` pour retrigger le déploiement automatique.

### Assets CSS/JS obsolètes après déploiement

- Cause : cache navigateur.
- Solution : force-reload page (Ctrl+Shift+R ou Cmd+Shift+R sur Mac).

### Nginx reverse proxy renvoie 502 Bad Gateway

- Cause : conteneur app inaccessible.
- Diagnostic et solutions (commandes serveur, reload nginx, etc.) : voir LeRunbook.
