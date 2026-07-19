---
title: Déploiement
weight: 5
---

# Déploiement

## Mise en production

Le déploiement est continu : tout changement poussé sur la branche principale déclenche automatiquement une pipeline qui se connecte au VPS, récupère le code, reconstruit l'image Docker, applique les migrations Prisma puis redémarre le conteneur. Il n'y a pas de déploiement manuel à effectuer : lancer soi-même `docker compose up` en parallèle du pipeline provoquerait une collision entre les deux.

```bash
git pull
docker compose build
# migrations Prisma des tables du plateau (voir Modèle de données)
docker compose up -d
```

Le premier déploiement d'un environnement, lui, reste manuel : clonage du dépôt, copie du fichier d'environnement avec les valeurs de production, puis premier build et premier lancement du conteneur.

## Le support WebSocket

Le trafic vers `board.fresquesystemique.org` a une exigence de plus que les autres applications : le reverse proxy doit transmettre les en-têtes de montée en version du protocole pour laisser passer les WebSockets (`Upgrade`, `Connection: upgrade`), en plus du routage HTTP habituel.

Symptôme classique d'une configuration incomplète : le plateau se charge (les pages passent) mais rien ne se synchronise entre participants (les sockets ne passent pas).

## Les images de cartes

Les images des 283 cartes (par langue) ne sont pas dans le dépôt : elles vivent dans un volume dédié sur le serveur. Un nouveau déploiement ne les touche pas ; une nouvelle langue ou une refonte graphique se déploie en copiant les fichiers.

## Environnement de préproduction

`dev.board.fresquesystemique.org` fait tourner LeBoard dans la stack Docker de développement, avec la base PostgreSQL de préproduction partagée avec `dev.hub` (voir [Infrastructure]({{< relref "/si/infrastructure" >}})). Le duo dev.hub + dev.board permet de tester le parcours complet : création d'atelier en ligne, génération du plateau, SSO animateur, avant de pousser en production.
