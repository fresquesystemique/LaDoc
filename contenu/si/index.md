---
id: index
title: Le SI transverse
sidebar_position: 1
---

# Le SI transverse

Cette section regroupe les éléments d'infrastructure, d'opération et de fonctionnement du système d'information qui touchent toutes les applications : les environnements de déploiement, le monitoring, les sauvegardes et les pièges courants lors de l'évolution du SI.

Les trois applications ([LeHub](/lehub/), [LeSite](/lesite/) et [LeBoard](/leboard/)) reposent sur une infra partagée et quelques choix d'architecture qui méritent d'être bien compris pour ne pas y laisser des plumes.

| Page | Contenu |
|------|---------|
| [Infrastructure](./infrastructure.md) | Un VPS unique, applications en conteneurs Docker, Nginx, PostgreSQL, certificats TLS, analytics auto-hébergées. Architecture élémentaire mais robuste. |
| [Environnements](./environnements.md) | Production et développement partagé : la base de données unique est un piège majeur. Comment les migrants de schéma se propagent entre les deux environnements. |
| [Monitoring](./monitoring.md) | Une sonde périodique et un rapport quotidien. Ce qui est surveillé, ce que signifie une alerte, et comment recevoir les alertes. |
| [Sauvegardes](./sauvegardes.md) | Sauvegarde automatique des données et des fichiers. Pourquoi la clé d'accès n'a pas le droit de suppression, et comment tester une restauration. |
| [Pièges connus](./pieges.md) | La page la plus utile : les douze pièges courants au fil de l'évolution du SI, symptôme → cause → ce qu'il faut faire. |
