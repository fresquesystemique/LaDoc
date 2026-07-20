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

- Pas de quality gates (contrairement à LeHub) : LeSite est du contenu statique public.
- Build Docker : génère l'image Next.js standalone à partir de `Dockerfile`.
- Redémarrage conteneur : force le chargement du nouveau build.
- Reload Nginx : le reverse proxy recharge sa config (important pour les changements `NEXT_PUBLIC_*` qui nécessitent un rebuild).

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

## Variantes d'env (dev, preview, prod)

LeSite supporte 3 environnements via des variables `NEXT_PUBLIC_*` :

| Env | SITE_URL | HUB_URL | ALLOW_INDEXING | Branch |
|-----|----------|---------|----------------|--------|
| **dev** | local (localhost:3002) | local (localhost:3001) | `false` | (local) |
| **preview** | (environnement partagé, voir LeRunbook) | `https://hub.fresquesystemique.org` | `false` | `main` |
| **prod** | `https://fresquesystemique.org` | `https://hub.fresquesystemique.org` | `true` | `main` |

Le passage **preview** → **prod** nécessite :

1. Activer `NEXT_PUBLIC_ALLOW_INDEXING=true` en variable d'env.
2. Redéployer (la variable est inlinée au build).
3. Robots moteurs verront la balise `<meta name="robots" content="index">`.

## Variables d'environnement

Le CI/CD utilise deux niveaux de configuration :

- **Secrets GitHub** : identifiants d'accès au serveur (host, user, key).
- **Fichier `.env` sur le serveur** : variables applicatives publiques (`NEXT_PUBLIC_*`) et secrets (NEXTAUTH_SECRET, REVALIDATE_SECRET, clés API).

Les identifiants d'infrastructure et les valeurs secrètes sont stockés dans **LeRunbook**, dont l'accès est restreint.

**Important** : toute modification d'une variable `NEXT_PUBLIC_*` nécessite un redéploiement (rebuild Docker) pour être prise en compte, car ces valeurs sont inlinées dans le bundle au build time.

## Pièges de déploiement

### 1. Nginx doit être reload après le build

Le workflow inclut l'étape `systemctl reload nginx`. Sans elle, l'ancien conteneur reste servi. Important si :

- Ports changent.
- Certificats SSL changent (rare).

### 2. Les `NEXT_PUBLIC_*` sont cachées dans le bundle

Un changement à `NEXT_PUBLIC_HUB_URL` après le build **ne sera pas appliqué**. Seule une rebuild Docker peut le prendre en compte.

Vérification : en navigateur, ouvre la DevTools et cherche dans le bundle :

```javascript
// chunk.js (build Next.js)
window.__NEXT_PUBLIC_HUB_URL = "https://hub.fresquesystemique.org"
```

### 3. Les assets CSS/JS sont cachés en production

Après un déploiement, tu risques de voir d'anciens assets CSS/Js. C'est normal (cache navigateur ou CDN).

**Force-reload** : Ctrl+Shift+R ou Cmd+Shift+R (vide le cache local).

### 4. Mode chantier peut masquer la vraie app

Si le flag `chantier=true` est actif dans LeHub et ton administrateur n'est pas reconnu (cookie invalide), tu verras `/chantier` au lieu du vrai site.

Vérification : dans DevTools Console,
```javascript
await fetch('/api/site-mode').then(r => r.json())
// {chantier: true/false}
```

### 5. Revalidation ISR peut être lente après un déploiement

Si tu publies un nouvel article dans LeHub juste après un déploiement LeSite, la revalidation peut tarder si :

- Webhook n'arrive pas (réseau, secret mauvais).
- ISR cache prend jusqu'à 5 min.

La revalidation immédiate est déclenchée par un webhook POST vers l'endpoint `/api/revalidate` avec un en-tête HTTP `x-revalidate-secret`. Les détails d'implémentation (test, diagnostic) se trouvent dans LeRunbook.

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
