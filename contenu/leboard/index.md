---
id: index
title: LeBoard
sidebar_position: 1
---

# LeBoard

LeBoard est le plateau collaboratif temps réel utilisé pour animer les ateliers [La Fresque Systémique](https://fresquesystemique.org) en ligne. Il est construit sur Socket.io pour la synchronisation en direct et Konva.js pour le rendu du canvas, et partage la même base de données PostgreSQL que [LeHub](../lehub/index.md).

Depuis juin 2026, LeHub crée automatiquement un plateau pour chaque atelier en ligne. L'animateur y accède par un lien signé depuis la fiche atelier du Hub ; les participants reçoivent un lien sans authentification.

Quatre choses à savoir avant de lire le reste :

1. **LeBoard ne s'ouvre pas sous 1024 px** : en dessous, il affiche un message d'indisponibilité. Le support mobile est hors périmètre.
2. **Le feuillet « Régénération »** (depuis août 2026) lit son contenu en direct dans la base, édité depuis le Hub.
3. **Les images de diapositives sont relayées** par LeBoard lui-même, jamais chargées depuis le domaine du Hub : sa politique de sécurité n'accepte que ses propres images.
4. **Il tourne derrière un serveur Node maison** (`server.ts`), parce que Socket.io a besoin du serveur HTTP — ce n'est pas un `next start`.

**Production** → [board.fresquesystemique.org](https://board.fresquesystemique.org)

| Page | Contenu |
|------|---------|
| [Présentation & fonctionnalités](./fonctionnalites.md) | Les rôles, les parcours utilisateur (animateur, participants), et les fonctionnalités clés du plateau. |
| [Architecture technique](./architecture.md) | Stack technologique, structure des répertoires, conventions de routage, rendu Konva, pièges de performance. |
| [Modèle de données](./donnees.md) | Les quatorze modèles du schéma miroir de LeBoard, et ce que veut dire partager une base avec le Hub. |
| [Flux métier](./flux.md) | Workflows critiques : lancement d'atelier, distribution des lots, pop-corn et matrices, undo/redo, collaboration temps réel. |
| [Intégrations externes](./integrations.md) | Aucun service externe : LeBoard ne parle qu'au Hub et à la base partagée. Ce qui tombe, et ce qui tient, quand l'un des deux manque. |
| [Développement](./developpement.md) | Prérequis, installation locale, variables d'environnement, barrière de qualité, pièges de développement. |
| [Déploiement](./deploiement.md) | CI/CD GitHub Actions, étapes du déploiement automatique, vérification. |
