---
id: index
title: LeHub
sidebar_position: 1
---

# LeHub

LeHub est l'intranet et le moteur central du système d'information de La Fresque Systémique. Il sert d'espace privé aux animateurs, formateurs et administrateurs de l'association. L'accès minimum est animateur : les membres qui ne portent aucun axe d'animation n'entrent pas dans le Hub. C'est la source unique de vérité pour les ateliers, les inscriptions, les paiements, les formations et l'attribution des badges numériques.

Depuis juin 2026, LeHub alimente aussi le site public [LeSite](https://fresquesystemique.org) via une API publique, un cookie de session partagé (pont d'authentification) et un flag « mode chantier ». La plateforme gère l'intégralité de la chaîne métier : de la création d'un atelier à l'envoi du badge, en passant par l'inscription, le paiement HelloAsso et le suivi des habilitations.

| Page | Contenu |
|------|---------|
| [Présentation & fonctionnalités](./fonctionnalites.md) | Les rôles, les parcours utilisateur (animateurs, participants, formateurs, administrateurs), et les fonctionnalités clés par profil. |
| [Architecture technique](./architecture.md) | Stack technologique, structure des répertoires, conventions de routage, tokens shadcn/ui, authentification. |
| [Modèle de données](./donnees.md) | Tous les modèles Prisma (40+ entités), leurs relations et un diagramme ER des flux principaux. |
| [Flux métier](./flux.md) | Les workflows critiques : inscription + paiement HelloAsso, annulation + remboursement, attribution des badges, tâches planifiées (crons), modération. |
| [Intégrations externes](./integrations.md) | HelloAsso, API Adresse BAN, Telegram, Backblaze B2, Plausible. Configuration, comportement en cas d'indisponibilité, pièges. |
| [Développement](./developpement.md) | Prérequis, installation locale, variables d'environnement, environnement `dev.hub`, pièges de développement spécifiques à LeHub. |
| [Déploiement](./deploiement.md) | CI/CD GitHub Actions, étapes du déploiement automatique, vérification, commandes serveur dans LeRunbook. |
