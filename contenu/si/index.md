---
id: index
title: Le SI transverse
sidebar_position: 1
---

# Le SI transverse

Cette section regroupe les éléments d'infrastructure, d'opération et de fonctionnement du système d'information qui touchent toutes les applications : les environnements de déploiement, le monitoring, les sauvegardes et les pièges courants lors de l'évolution du SI.

Les trois applications ([LeHub](/lehub/), [LeSite](/lesite/) et [LeBoard](/leboard/)) reposent sur une infra partagée et quelques choix d'architecture qui méritent d'être bien compris pour ne pas y laisser des plumes.

Elle recense aussi les **outils que l'association utilise sans les avoir écrits** — messagerie, documents partagés, coordination — parce que certains portent des dépendances dont les applications ne se relèvent pas seules.

| Page | Contenu |
|------|---------|
| [Infrastructure](./infrastructure.md) | Un VPS unique : conteneurs Docker, Nginx et ses vhosts, PostgreSQL 18, certificats TLS, durcissement cyber, convention de journalisation, analytics auto-hébergée. |
| [Environnements](./environnements.md) | Deux environnements seulement, local et production : l'étage de développement partagé a été supprimé. Les domaines, la base partagée, les ports, et les valeurs qui doivent rester identiques entre les dépôts. |
| [Monitoring](./monitoring.md) | Une sonde toutes les 15 minutes et un rapport quotidien. Ce qui est surveillé, ce qui ne l'est **pas** (aucune sonde HTTP sur les sites), et ce que signifie chaque alerte. |
| [Sauvegardes](./sauvegardes.md) | Base, uploads et analytics sauvegardés chaque nuit, avec une copie mensuelle conservée indéfiniment. Pourquoi la clé d'accès n'a pas le droit de suppression, et comment restaurer. |
| [Les outils de l'association](./outils.md) | Ce que le SI utilise sans l'avoir écrit : Google Workspace (boîtes du domaine, Drive, Meet), la boucle Signal du bureau, Telegram, LinkedIn. Les deux chemins de l'e-mail, et ce qui casse quand un compte Google disparaît. |
| [Pièges connus](./pieges.md) | La page la plus utile : trente-cinq pièges qui échouent en silence, symptôme → cause → ce qu'il faut faire. |
