---
title: Déploiement
weight: 5
---

# Déploiement

## Le pipeline

Le déploiement est automatique, mais soumis à condition : chaque push sur `main` déclenche le workflow GitHub Actions `deploy.yml`, qui commence par un job qualité (vérification des types, lint, suite de tests complète). Ce n'est que si ce job passe que le job de déploiement se connecte au VPS en SSH et exécute :

1. `git pull` du dépôt
2. `docker compose build` de l'image de l'application
3. démarrage du conteneur PostgreSQL (le temps qu'il soit prêt)
4. `npx prisma migrate deploy` contre ce conteneur
5. remplacement du conteneur de l'application par la nouvelle image
6. nettoyage des anciennes images Docker

{{< mermaid >}}
flowchart LR
    DEV[Commit sur main] --> Q[Job qualité : types, lint, tests]
    Q -- OK --> GH[Job déploiement]
    GH -- SSH --> VPS[VPS]
    VPS --> B[build de l'image]
    B --> M[migrations Prisma]
    M --> U[remplacement du conteneur]
{{< /mermaid >}}

Si le job qualité échoue, rien n'est déployé. Si une migration échoue, le déploiement s'arrête avant le remplacement du conteneur : la version précédente continue de tourner.

## L'image

Le build Next.js utilise la sortie `standalone` : l'image finale ne contient que le serveur et ses dépendances d'exécution. Le moteur Prisma est épinglé pour l'environnement Alpine du conteneur.

## Devant l'application : Nginx

- Nginx (sur l'hôte) fait reverse proxy du sous-domaine `hub.fresquesystemique.org` vers le conteneur, avec certificat Let's Encrypt.
- **Cas particulier des uploads** : les images téléversées depuis l'admin (avatars, images d'articles, PDF) sont écrites dans un volume monté sur l'hôte et servies directement par Nginx via un bloc `location /uploads/ { alias ... }`, sans passer par Next.js. Elles survivent ainsi aux rebuilds du conteneur.
  - L'alias couvre tout le préfixe `/uploads/` : un **nouveau type d'upload** (nouveau sous-dossier sous `public/uploads/`) est servi sans modifier la conf Nginx.
  - Le pipeline ne recharge pas Nginx automatiquement : ce n'est nécessaire qu'en cas de **changement de la conf elle-même** (nouvel alias, nouveau sous-domaine…), pas pour un déploiement normal de l'application ni pour découvrir de nouveaux fichiers uploadés. Un `sudo systemctl reload nginx` manuel suffit dans ce cas.

## Tâches planifiées

Plusieurs tâches tournent chaque jour sur le VPS, indépendamment du déploiement :

- **Rappels J-2** : un cron appelle chaque matin l'endpoint de rappels de LeHub (protégé par un secret porteur). Les participants des ateliers ayant lieu dans environ 48 heures reçoivent leur e-mail de rappel ; le même passage émet aussi les invitations à l'enquête de satisfaction pour les ateliers terminés et délivre les badges Open Badges en attente.
- **Réconciliation des inscriptions et des rapports d'usage** : deux tâches quotidiennes rattrapent les inscriptions et les déclarations d'usage professionnel qui seraient restées incomplètes si un webhook HelloAsso s'était perdu.
- **Sauvegarde** : dump quotidien de la base PostgreSQL partagée avec LeBoard et archive des fichiers uploadés, envoyés vers un stockage objet externe. Rétention quotidienne courte et mensuelle plus longue ; une alerte est envoyée en cas d'échec.

## Webhook HelloAsso

Le webhook de paiement se configure dans l'espace HelloAsso de l'association (Paramètres → Notifications), en pointant vers l'endpoint `api/webhooks/helloasso` de LeHub. Sans lui, les paiements aboutissent côté HelloAsso mais les inscriptions et cotisations ne se créent pas côté LeHub.

## Environnement de préproduction

`dev.hub.fresquesystemique.org` fait tourner la même application dans une stack Docker séparée, avec sa propre base PostgreSQL (voir [Infrastructure]({{< relref "/si/infrastructure" >}})). Les évolutions y sont validées avant d'arriver en production.
