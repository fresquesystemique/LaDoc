---
id: index
title: LeBoard
sidebar_position: 1
---

# LeBoard

LeBoard est le plateau collaboratif temps réel utilisé pour animer les ateliers [La Fresque Systémique](https://fresquesystemique.org) en ligne. Il est construit sur Socket.io pour la synchronisation en direct et Konva.js pour le rendu du canvas, et partage la même base de données PostgreSQL que [LeHub](../lehub/index.md).

Depuis juin 2026, LeHub crée automatiquement un board pour chaque atelier en ligne (`format='en_ligne'`). L'animateur accède au plateau via un lien SSO généré depuis la fiche atelier du Hub ; les participants reçoivent un lien sans authentification requise.

**Production** → [board.fresquesystemique.org](https://board.fresquesystemique.org)

| Page | Contenu |
|------|---------|
| [Présentation & fonctionnalités](./fonctionnalites.md) | Les rôles, les parcours utilisateur (animateur, participants), et les fonctionnalités clés du plateau. |
| [Architecture technique](./architecture.md) | Stack technologique, structure des répertoires, conventions de routage, rendu Konva, pièges de performance. |
| [Modèle de données](./donnees.md) | Modèles Prisma spécifiques au Board (Board, CardPlacement, Connection, BoardLotDistribution, etc.) et relation avec les modèles Hub. |
| [Flux métier](./flux.md) | Workflows critiques : lancement d'atelier, distribution des lots, pop-corn et matrices, undo/redo, collaboration temps réel. |
| [Intégrations externes](./integrations.md) | Aucune intégration externe (Board reste interne au SI). Références vers Hub et LeSite. |
| [Développement](./developpement.md) | Prérequis, installation locale, variables d'environnement, environnement `dev.board`, pièges de développement. |
| [Déploiement](./deploiement.md) | CI/CD GitHub Actions, étapes du déploiement automatique, vérification. |
