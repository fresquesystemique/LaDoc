---
id: deploiement
title: Déploiement
sidebar_position: 8
---

# Déploiement

LeSite dispose d'un CI/CD automatisé. Tout push vers la branche `main` déclenche une chaîne de déploiement via GitHub Actions.

## CI/CD GitHub Actions

Le workflow est défini dans `.github/workflows/deploy.yml`.

### Déclencheur

- Branche : `main` uniquement
- Événement : push

### Étapes du pipeline

Le workflow effectue en résumé :

1. Checkout du code depuis GitHub.
2. Accès au serveur de déploiement (les identifiants et la procédure complète sont dans LeRunbook).
3. Mise à jour du code depuis `main`.
4. Build de l'image Docker Next.js.
5. Redémarrage du conteneur avec la nouvelle image.
6. Nettoyage des images inutilisées.
7. Reload du reverse proxy Nginx.

**Explication** :

- Pas de barrière de qualité dans le workflow (contrairement à LeHub) : les tests Vitest et le lint se lancent en local. C'est une dette assumée, pas une absence de tests — il y en a 26 fichiers.
- Le build est fait `--no-cache` : les variables `NEXT_PUBLIC_*` sont inlinées au build, un cache d'étape pourrait reservir un bundle portant d'anciennes URL.
- Le script commence par `set -e`.

:::danger `set -e` : pourquoi cette ligne existe
Sans elle, un échec de `docker compose build` n'arrêtait rien : la suite s'exécutait, `up -d` redémarrait l'**ancienne** image, le `reload nginx` final réussissait, et le run passait au vert alors que la production n'avait pas bougé. Constaté le 6 septembre 2026. La vérification fiable reste l'âge du conteneur ou de l'image, pas la couleur du run.
:::

### Architecture déploiement

```
┌──────────────────────────────────────────────────────────────┐
│  GitHub (repo LeSite, branche main)                          │
└──────────────────────┬───────────────────────────────────────┘
                       │ push
                       ▼
        ┌──────────────────────────────┐
        │  GitHub Actions              │
        │  (runner ubuntu-latest)      │
        └──────────────────┬───────────┘
                           │ SSH
                           ▼
        ┌────────────────────────────────────────┐
        │  VPS (répertoire LeSite)               │
        │                                        │
        │  1. git pull origin main               │
        │  2. docker compose build app           │
        │  3. docker compose up -d --no-deps app│
        │  4. systemctl reload nginx             │
        └────────────────────────────────────────┘
                           │
                           ▼
        ┌────────────────────────────────────────┐
        │  Nginx (port 80/443, reverse proxy)   │
        │  ↓                                    │
        │  Conteneur LeSite (reverse proxy)    │
        └────────────────────────────────────────┘
                           │
                           ▼
        ┌────────────────────────────────────────┐
        │  Public : https://fresquesystemique.org│
        └────────────────────────────────────────┘
```

## Vérifier que le déploiement est passé

1. **Commit déployé** : push vers `main` → regarder GitHub Actions (onglet « Workflows »).
2. **Status du workflow** : ✅ all steps completed = succès ; ❌ = échec (consulter les logs du workflow GitHub).
3. **Logs applicatifs** : en cas d'échec du workflow ou de problème détecté, les accès au serveur et les commandes de diagnostic se trouvent dans LeRunbook.
4. **URL à recharger** : `https://fresquesystemique.org`
   - La version nouvelle est active dès que le conteneur redémarre.
   - **Attention** : assets CSS/JS peuvent être cachés. Force-reload : **Ctrl+Shift+R** (Chrome/Firefox).

## Il n'y a que deux environnements

| Env | SITE_URL | HUB_URL | Indexation |
|-----|----------|---------|------------|
| **local** | `http://localhost:3002` | Hub local ou Hub de production | décidée par le Hub |
| **prod** | `https://fresquesystemique.org` (conteneur sur le port 3002) | `https://hub.fresquesystemique.org` | décidée par le Hub |

L'environnement partagé de préproduction a été supprimé le 20 août 2026.

**L'indexation n'est plus un argument de build.** Elle se décide à chaud dans le Hub (`seoIndexingEnabled`), croisée avec l'`indexability` de chaque route du registre. La levée du mode chantier ne demande donc aucun redéploiement de LeSite : le sitemap s'étend et les balises `robots` changent d'elles-mêmes.

## Variables d'environnement

Le CI/CD utilise deux niveaux de configuration :

- **Secrets GitHub** : identifiants d'accès au serveur (host, user, key).
- **Fichier `.env` sur le serveur** : les `NEXT_PUBLIC_*` (passées en build args par `docker-compose.yml`) et les trois secrets partagés avec le Hub (`REVALIDATE_SECRET`, `CONTACT_NOTIFY_SECRET`, `SEO_CRAWLER_SECRET`).

Les identifiants d'infrastructure et les valeurs secrètes sont stockés dans **LeRunbook**, dont l'accès est restreint.

**Important** : toute modification d'une variable `NEXT_PUBLIC_*` nécessite un redéploiement (rebuild Docker) pour être prise en compte, car ces valeurs sont inlinées dans le bundle au build time.

## Pièges de déploiement

### 1. Le reload Nginx du workflow

Le workflow termine par un `reload nginx`. Il est utile quand la configuration du vhost ou un certificat a changé ; pour un simple redéploiement applicatif, le conteneur reprend le même port et le proxy n'a rien à réapprendre.

### 2. Les `NEXT_PUBLIC_*` sont cachées dans le bundle

Un changement à `NEXT_PUBLIC_HUB_URL` après le build **ne sera pas appliqué**. Seule une rebuild Docker peut le prendre en compte.

Vérification : chercher la valeur attendue dans le JavaScript servi (les bundles sous `/_next/static/chunks/`). Si l'ancienne URL y figure encore, c'est que l'image n'a pas été reconstruite.

:::warning Un repli silencieux
`lib/config.ts` utilise `||` et non `??`, précisément parce qu'un build arg absent vaut la **chaîne vide** et non `undefined` : avec `??`, `HUB_URL` serait devenu `""`, les requêtes seraient parties en relatif et `/api/checkout` serait tombé en 404. Le repli de `SITE_URL` a aussi son histoire : resté sur un sous-domaine dont le DNS avait été supprimé, il envoyait canonical, sitemap et URL Open Graph sur un domaine mort sans que rien n'échoue visiblement.
:::

### 3. Les assets CSS/JS sont cachés en production

Après un déploiement, tu risques de voir d'anciens assets CSS/Js. C'est normal (cache navigateur ou CDN).

**Force-reload** : Ctrl+Shift+R ou Cmd+Shift+R (vide le cache local).

### 4. Mode chantier peut masquer la vraie app

Si le flag `chantier=true` est actif dans LeHub et ton administrateur n'est pas reconnu (cookie invalide), tu verras `/chantier` au lieu du vrai site.

Vérification : interroger le Hub, qui porte le flag.

```bash
curl -s https://hub.fresquesystemique.org/api/public/site-mode
# {"chantier":true|false}
```

Le middleware met la réponse en cache 15 secondes, donc un changement de flag se voit avec ce léger retard.

### 5. Revalidation ISR peut être lente après un déploiement

Si tu publies un nouvel article dans LeHub juste après un déploiement LeSite, la revalidation peut tarder si :

- Webhook n'arrive pas (réseau, secret mauvais).
- ISR cache prend jusqu'à 5 min.

La revalidation immédiate est déclenchée par un webhook POST vers l'endpoint `/api/revalidate` avec un en-tête HTTP `x-revalidate-secret`. Les détails d'implémentation (test, diagnostic) se trouvent dans LeRunbook.

### 6. Ne pas déployer deux projets Fresque coup sur coup

Deux builds Docker simultanés sur le VPS ont déjà provoqué un verrou containerd. Espacer les déploiements de LeSite, LeHub et LeBoard.

Pour un chantier qui touche LeHub **et** LeSite, l'ordre compte : **déployer le Hub d'abord**. LeSite consomme son API ; l'inverse fait tourner un site qui réclame des champs que le Hub ne sert pas encore.

### 7. Un onglet ouvert pendant la mise en ligne affiche une erreur

Le premier fichier réclamé par un onglet resté ouvert n'existe plus après un déploiement, et Next affiche « Une erreur est survenue » que « Réessayer » ne répare pas. LeSite se recharge désormais tout seul dans ce cas (`lib/stale-build.ts`). Si un utilisateur signale ce message juste après une mise en ligne, c'est ce cas-là.

## Opérations manuelles et rollback

Les déploiements manuels (sans GitHub Actions) et les rollbacks sont des opérations rares qui impliquent l'accès direct au serveur. Ces procédures, ainsi que toutes les commandes serveur et accès associés, sont documentées dans **LeRunbook**.

**Préférer** : coordonner un revert propre via un nouveau commit et un push vers `main` plutôt que des opérations manuelles directes sur le serveur.

## Performance post-déploiement

LeSite est très rapide en production :

- Pages statiques servies par le cache ISR (hit 99% du temps).
- Pas de requête DB.
- Plausible auto-hébergé (pas de latence tiers).
- Nginx reverse proxy (très rapide).

Temps de requête typique : < 100ms (sans revalidation) à ~500ms (revalidation API LeHub).

## Monitoring et alertes

Le monitoring du serveur et les alertes Telegram associées (scripts, cron, configuration) sont gérés via **LeRunbook**.
