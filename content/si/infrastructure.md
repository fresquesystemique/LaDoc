---
title: Infrastructure
weight: 3
---

# Infrastructure

Tout le SI tient sur un unique VPS (OVH, Ubuntu). Ce choix privilégie la simplicité d'exploitation pour une petite association : une seule machine à surveiller, sauvegarder et maintenir.

## Vue d'ensemble

{{< mermaid >}}
flowchart TB
    subgraph Internet
        U[Navigateurs]
    end
    subgraph VPS["VPS OVH (Ubuntu)"]
        N[Nginx frontal<br/>HTTPS Let's Encrypt]
        subgraph Docker
            HUB[LeHub<br/>Next.js]
            SITE[LeSite<br/>Next.js]
            BOARD[LeBoard<br/>Next.js + Socket.io]
            PG[(PostgreSQL 18)]
            PL[Plausible CE<br/>+ ClickHouse]
        end
        ST[Sites statiques<br/>dont cette documentation]
    end
    U --> N
    N --> HUB
    N --> SITE
    N --> BOARD
    N --> PL
    N --> ST
    HUB --> PG
    BOARD --> PG
{{< /mermaid >}}

## Nginx, le chef d'orchestre

Nginx tourne directement sur l'hôte (pas dans Docker) et joue trois rôles :

1. **Reverse proxy** : chaque sous-domaine est routé vers le conteneur de l'application correspondante. Le virtual host de LeBoard ajoute le support WebSocket (en-têtes `Upgrade`/`Connection`) pour Socket.io.
2. **Serveur de fichiers statiques** : les images uploadées depuis l'admin de LeHub sont servies directement par Nginx depuis le système de fichiers de l'hôte (plus rapide qu'un passage par Next.js, et les fichiers survivent aux rebuilds des conteneurs). Cette documentation est aussi servie statiquement.
3. **Terminaison HTTPS** : un certificat Let's Encrypt par sous-domaine, obtenu et renouvelé par certbot.

## Docker Compose, une stack par application

Chaque application a son propre `docker-compose.yml` dans son dépôt :

| Stack | Conteneurs | Particularités |
|---|---|---|
| LeHub | app Next.js (build standalone) + PostgreSQL 18 | La base sert aussi à LeBoard |
| LeSite | app Next.js seule | Pas de base de données, tout vient de l'API LeHub |
| LeBoard | app Next.js + serveur Socket.io (serveur HTTP custom) | Se connecte à la base de LeHub |
| Plausible CE | Plausible + PostgreSQL + ClickHouse | Analytics auto-hébergé |

Les applications Next.js sont buildées en mode `standalone` : l'image finale ne contient que le nécessaire à l'exécution.

## Base de données

PostgreSQL 18 en conteneur, avec Prisma comme ORM et gestionnaire de migrations dans les trois applications. LeHub et LeBoard partagent la même base ; LeSite n'en a pas.

Les migrations sont appliquées à chaque déploiement (`prisma migrate deploy`), ce qui garantit que le schéma en production correspond toujours au code déployé.

## Environnements de développement

Deux environnements de préproduction tournent sur le même VPS, avec le vrai routage Nginx :

- `dev.hub.fresquesystemique.org` et `dev.board.fresquesystemique.org`
- Une stack Docker dédiée (`fresque-dev`) avec sa propre instance PostgreSQL, isolée de la production
- LeHub-dev et LeBoard-dev y partagent une base commune, comme en production

Cela permet de valider les évolutions dans des conditions réelles (HTTPS, domaines, WebSocket) avant de les déployer.

## Déploiement continu

Le déploiement de LeHub et LeSite est automatique via GitHub Actions à chaque push sur `main` :

1. Connexion SSH au VPS
2. `git pull` du dépôt
3. `docker compose build --no-cache app`
4. `npx prisma migrate deploy` (LeHub)
5. `docker compose up -d --no-deps app`
6. `sudo systemctl reload nginx`

LeBoard et cette documentation se déploient par script sur le même principe.

## Analytics : Plausible Community Edition

La mesure d'audience de LeSite passe par une instance auto-hébergée de Plausible (édition communautaire) : pas de cookies, pas de données personnelles, conformité RGPD sans bandeau de consentement. La stack comprend Plausible, sa base PostgreSQL et ClickHouse pour le stockage des événements.

## Tâches planifiées et supervision

Plusieurs crons tournent sur l'hôte :

- **Rappels J-2** : chaque matin, un appel à l'endpoint de rappels de LeHub (protégé par secret) envoie un e-mail aux participants des ateliers ayant lieu dans deux jours.
- **Monitoring** : un script vérifie toutes les 15 minutes l'état du serveur (disque, mémoire, conteneurs, certificats) et alerte sur Telegram en cas d'anomalie, avec un rapport quotidien.
- **Nettoyage Docker** : purge hebdomadaire des images et caches de build orphelins.

## Cette documentation

Le site que vous lisez suit la même philosophie : un site statique généré par [Hugo](https://gohugo.io) (thème Book), buildé sur le VPS depuis le dépôt [LaDoc](https://github.com/raphaeldeux/LaDoc) et servi directement par Nginx. Une commande (`./deploy.sh`) reconstruit et publie le site.
