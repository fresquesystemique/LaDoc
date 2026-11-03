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
2. Setup Node 24 + cache npm
3. npm ci --legacy-peer-deps
4. npx prisma generate (régénère le client dans generated/prisma)
5. npm run typecheck (tsc sur code prod, exclude __tests__)
6. npm run lint (eslint)
7. npm test (jest)
```

:::info Pourquoi Node 24 en CI alors que la production est sur Node 22
`yoastseo` tire `parse5` en ESM, et `require(ESM)` avec les API `vm` synchrones de Jest exige Node >= 24.9. Sur Node 20 ou 22, trois suites SEO échouent avec « Test suite failed to run ». Le runtime de production reste sur `node:22-alpine` : `yoastseo` ne tourne que dans un Web Worker navigateur, jamais côté serveur.
:::

**Erreurs bloquantes** :
- Échec typecheck → build échoue.
- Échec linter → build échoue.
- Échec test → build échoue.

#### Job `deploy` (dépend de `quality`)

S'exécute après `quality` seulement si succès. SSH sur le VPS et redéploie.

```bash
1. Checkout code (repo local CI)
2. SSH vers VPS (credentials: host, user, key)
3. set -e  (toute commande en échec arrête le script)
4. cd [repo-dir] && git pull origin main
5. npm ci --legacy-peer-deps  (les crons de l'hôte tournent depuis ce dossier)
6. ./node_modules/.bin/prisma generate  (client Prisma 7 dans generated/, hors git)
7. docker compose build app (build image Next standalone)
8. docker compose up -d postgres (lance/relance Postgres)
9. sleep 10 (attendre la connexion DB)
10. Récupère l'IP interne de PostgreSQL + le mot de passe depuis .env
11. DATABASE_URL=... npx prisma@7.10.1 migrate deploy (applique les migrations)
12. docker compose up -d --no-deps app (redémarre le conteneur app)
13. docker image prune -f (nettoie les images non utilisées)
```

Les étapes 5 et 6 ne servent pas au conteneur (qui a son propre `npm ci` dans le Dockerfile) mais aux **crons de l'hôte**, qui exécutent `scripts/reconcile-*.ts` depuis ce dossier : leurs dépendances et leur client Prisma généré doivent suivre le code déployé.

:::danger Un run vert ne prouve pas un déploiement
L'action SSH exécute un script shell : sans `set -e`, une commande en échec au milieu du script laissait le run **vert** alors que le conteneur n'avait jamais été reconstruit. Le garde-fou est en place aujourd'hui, mais la bonne vérification reste la même : regarder **l'âge du conteneur et de l'image**, pas la couleur du run. Les commandes sont dans LeRunbook ; depuis l'extérieur, on vérifie en sondant la page modifiée.
:::

**Après déploiement réussi** :
- Le conteneur app tourne avec la dernière version.
- Nginx (hôte) continue d'envoyer les requêtes vers le conteneur, sans intervention.
- **Un reload de Nginx n'est nécessaire que si la configuration Nginx elle-même a changé** (par exemple l'alias des uploads). Un déploiement applicatif ordinaire n'en demande pas.

### Vérifier que le déploiement est passé

1. **Commit deployé** : push vers `main` → regarder GitHub Actions, onglet « Workflows » → chercher le workflow `Deploy` pour ce commit.
2. **Status** : ✅ all checks passed = succès ; ❌ = échec (consulter les logs du workflow GitHub).
3. **Logs applicatifs** : en cas d'échec ou pour diagnostic, les accès au serveur et les commandes de consultation des logs se trouvent dans LeRunbook.
4. **Page à recharger** : la version new est active dès la fin du step 9 du deploy. **Attention** : les assets CSS/JS en cache navigateur peuvent être obsolètes. Force-reload : Ctrl+Shift+R (Chrome/Firefox).

## Architecture déploiement

```
┌─────────────────────────────────────────────────────┐
│  GitHub (fresquesystemique/LeHub, branche main)     │
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
- **Image de base** : `node:22-alpine`.
- **Next.js standalone output** : compilation autoporteuse (pas de serveur Next externe).
- **Prisma 7 sans moteur natif** : le client généré dans `generated/prisma` est compilé dans le bundle Next et se connecte via `@prisma/adapter-pg`. Il n'y a plus de `libquery_engine` à copier, ni de dépendance à OpenSSL dans l'image.
- **Variables `NEXT_PUBLIC_*` passées en build args** : elles sont inlinées à la compilation, donc les URLs croisées (Hub, Board, LeSite) doivent être fournies au moment du build et pas seulement au démarrage du conteneur.

**Sortie** : image prête à lancer le serveur Next standalone.

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

Il n'y en a plus. `dev.hub` a été supprimé le 20 août 2026 : le déploiement va du local à la production, sans étage intermédiaire. Les branches de développement restent dans le dépôt.

:::warning Ne pas pousser deux projets Fresque en prod coup sur coup
Deux builds Docker simultanés sur le VPS ont déjà provoqué un verrou containerd (juillet 2026). Espacer les déploiements de LeHub, LeSite et LeBoard, ou relancer le run échoué une fois le premier terminé. Pour les chantiers qui touchent plusieurs applications, l'ordre compte : voir la page [Pièges connus](../si/pieges.md).
:::

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
