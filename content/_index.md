---
title: Accueil
---

# LaDocumentation

Bienvenue sur la documentation technique du système d'information de **La Fresque Systémique**, une association qui sensibilise aux enjeux systémiques par des ateliers collaboratifs, en présentiel et en ligne.

Cette documentation s'adresse aux développeur·euses : celles et ceux qui rejoignent le projet, veulent comprendre comment le SI est construit, ou s'y intéressent dans la perspective de son ouverture en open source. Tout y est public : elle ne contient ni secret, ni donnée personnelle, ni détail d'exploitation sensible.

## Les trois applications

Le SI tient en trois applications web, développées sur mesure, qui se partagent les rôles :

| | Application | Rôle |
|---|---|---|
| 🌍 | **[LeSite]({{< relref "/lesite" >}})** | Le site public sur `fresquesystemique.org` : découvrir la démarche, consulter l'agenda des ateliers, s'inscrire, lire les actualités. Sans base de données : tout son contenu vient de LeHub. |
| 🛠️ | **[LeHub]({{< relref "/lehub" >}})** | L'intranet de l'association et le moteur du SI : membres, ateliers, inscriptions, paiements, contenus, e-mails, badges numériques. Sa base de données fait référence pour tout le reste. |
| 🃏 | **[LeBoard]({{< relref "/leboard" >}})** | Le plateau collaboratif temps réel pour les ateliers en ligne : 283 cartes, post-its, flèches, tout se synchronise en direct entre les participants. |

Une phrase pour les retenir : **LeSite montre, LeHub gère, LeBoard anime.**

## Par où commencer

Trois parcours de lecture selon ce que vous cherchez :

1. **Comprendre l'ensemble** : commencez par [Le SI en un coup d'œil]({{< relref "/si" >}}), qui présente l'articulation des trois applications, puis [Architecture des échanges]({{< relref "/si/architecture" >}}) pour tout ce qui circule entre elles, et [Infrastructure]({{< relref "/si/infrastructure" >}}) pour l'hébergement.
2. **Plonger dans une application** : chaque section suit le même plan en cinq pages : fonctionnalités, stack technique, modèle de données, lancement en local, déploiement.
3. **Mettre les mains dans le code** : allez directement aux pages « Lancer en local » ([LeHub]({{< relref "/lehub/developpement" >}}), [LeSite]({{< relref "/lesite/developpement" >}}), [LeBoard]({{< relref "/leboard/developpement" >}})).

## Un socle technique commun

Les trois applications partagent les mêmes fondations, ce qui rend le passage de l'une à l'autre facile :

- **Next.js** (App Router) avec **React** et **TypeScript**
- **Tailwind CSS** pour les styles
- **PostgreSQL** avec l'ORM **Prisma** (LeHub et LeBoard partagent la même base)
- **Docker Compose** pour l'exécution, **Nginx** en frontal, sur un unique VPS
- Déploiement automatisé par **GitHub Actions** ou par script

Les différences sont là où elles ont du sens : Socket.io et Konva pour le temps réel de LeBoard, Leaflet pour la carte de LeSite, HelloAsso et Resend pour les paiements et e-mails de LeHub.

## À propos de cette documentation

Ce site est lui-même un projet du SI : un site statique [Hugo](https://gohugo.io), dont la source est publique sur [GitHub](https://github.com/raphaeldeux/LaDoc). Il est rédigé en français ; sa structure est prête pour une traduction future. La recherche (en haut du menu) couvre toutes les pages.

Une coquille, une section obsolète, une question sans réponse ? Ouvrez une issue sur [le dépôt LaDoc](https://github.com/raphaeldeux/LaDoc/issues).
