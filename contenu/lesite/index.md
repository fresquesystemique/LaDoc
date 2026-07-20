---
id: index
title: LeSite
sidebar_position: 1
---

# LeSite

LeSite est le site public de La Fresque Systémique, servi sur le domaine apex `fresquesystemique.org`. Depuis juin 2026, c'est le seul site public de l'association ; LeHub (`hub.fresquesystemique.org`) en est l'intranet et le moteur central. LeSite n'a aucune base de données : tout son contenu dynamique provient de l'API publique de LeHub, mis en cache avec ISR et régénéré à la demande.

Le site offre une vitrine pour les ateliers (agenda filtrable, fiches d'inscription en ligne), les actualités, la médiathèque publique et les formations Qualiopi. Un pont d'authentification partage le cookie de session avec LeHub, permettant aux administrateurs de contourner un mode chantier et de voir le site en construction.

| Page | Contenu |
|------|---------|
| [Présentation & fonctionnalités](./fonctionnalites.md) | Pages du site, parcours d'un visiteur, le mode chantier. |
| [Architecture technique](./architecture.md) | Stack (Next.js, Tailwind, React-Leaflet), structure des répertoires, conventions, pont d'authentification. |
| [Modèle de données](./donnees.md) | Données consommées depuis LeHub (ateliers, articles, ressources), ce que LeSite lit et n'écrit pas, routes d'API. |
| [Flux métier](./flux.md) | Workflows critiques : inscription + paiement HelloAsso, mode chantier, ISR + revalidation. |
| [Intégrations externes](./integrations.md) | LeHub (API publique), HelloAsso (paiements), Plausible (analytics). Configuration et comportement en cas d'indisponibilité. |
| [Développement](./developpement.md) | Installation locale, variables d'environnement, pièges spécifiques à LeSite. |
| [Déploiement](./deploiement.md) | CI/CD GitHub Actions, étapes du déploiement, vérification. |
