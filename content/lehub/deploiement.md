---
title: Déploiement
weight: 5
---

# Déploiement

## Le pipeline

Le déploiement est automatique : chaque push sur `main` déclenche le workflow GitHub Actions `deploy.yml`, qui se connecte au VPS en SSH et exécute :

1. `git pull` du dépôt
2. `docker compose build --no-cache app`
3. `npx prisma migrate deploy` sur le conteneur PostgreSQL
4. `docker compose up -d --no-deps app`
5. `sudo systemctl reload nginx`

{{< mermaid >}}
flowchart LR
    DEV[Commit sur main] --> GH[GitHub Actions]
    GH -- SSH --> VPS[VPS]
    VPS --> B[build de l'image]
    B --> M[migrations Prisma]
    M --> U[remplacement du conteneur]
    U --> N[reload Nginx]
{{< /mermaid >}}

Si une migration échoue, le déploiement s'arrête avant le remplacement du conteneur : la version précédente continue de tourner.

## L'image

Le build Next.js utilise la sortie `standalone` : l'image finale ne contient que le serveur et ses dépendances d'exécution. Le moteur Prisma est épinglé pour l'environnement Alpine du conteneur.

## Devant l'application : Nginx

- Nginx (sur l'hôte) fait reverse proxy du sous-domaine `hub.fresquesystemique.org` vers le conteneur, avec certificat Let's Encrypt.
- **Cas particulier des uploads** : les images téléversées depuis l'admin (avatars, images d'articles, PDF) sont écrites dans un volume monté sur l'hôte et servies directement par Nginx via un bloc `location /uploads/ { alias ... }`, sans passer par Next.js. Elles survivent ainsi aux rebuilds du conteneur.
  - L'alias couvre tout le préfixe `/uploads/` : un **nouveau type d'upload** (nouveau sous-dossier sous `public/uploads/`) est servi sans modifier la conf Nginx.
  - Le reload Nginx du pipeline sert à autre chose : recharger un **changement de la conf elle-même** (nouvel alias, nouveau sous-domaine…), pas à découvrir de nouveaux fichiers.

## Tâche planifiée : rappels J-2

Un cron du VPS appelle chaque matin l'endpoint de rappels de LeHub (protégé par un secret porteur). Les participants des ateliers ayant lieu dans environ 48 heures reçoivent leur e-mail de rappel.

## Webhook HelloAsso

Le webhook de paiement se configure dans l'espace HelloAsso de l'association (Paramètres → Notifications), en pointant vers l'endpoint `api/webhooks/helloasso` de LeHub. Sans lui, les paiements aboutissent côté HelloAsso mais les inscriptions et cotisations ne se créent pas côté LeHub.

## Environnement de préproduction

`dev.hub.fresquesystemique.org` fait tourner la même application dans une stack Docker séparée, avec sa propre base PostgreSQL (voir [Infrastructure]({{< relref "/si/infrastructure" >}})). Les évolutions y sont validées avant d'arriver en production.
