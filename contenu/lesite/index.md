---
id: index
title: LeSite
sidebar_position: 1
---

# LeSite

LeSite est le site public de La Fresque Systémique, servi sur le domaine apex `fresquesystemique.org`. Depuis juin 2026, c'est le seul site public de l'association ; LeHub (`hub.fresquesystemique.org`) en est l'intranet et le moteur central. LeSite n'a aucune base de données : tout son contenu dynamique provient de l'API publique de LeHub, mis en cache avec ISR et régénéré à la demande.

Le site offre une vitrine pour les ateliers (agenda filtrable, fiches d'inscription en ligne), le blog, la médiathèque publique et le catalogue des ateliers et formations. Un pont d'authentification permet aux administrateurs de voir le vrai site pendant le mode chantier.

Trois choses ont changé en profondeur depuis l'été 2026, et il faut les connaître avant de lire le reste :

1. **Le système visuel « Le tracé »** a remplacé l'ancienne identité (août-septembre 2026).
2. **Les URL ont été réorganisées** sous `/offres`, `/ressources` et `/association`, avec un registre unique (`lib/public-routes.ts`) qui est désormais la source de tous les noms d'une page. Une vingtaine de redirections permanentes conservent les anciennes adresses.
3. **Le référencement est piloté depuis le Hub** : plus de drapeau d'indexation au build, un sitemap dynamique, et une déclaration d'écoconception publiée sur `/ecoconception`.

Et une quatrième, moins visible mais plus importante : **LeSite ne déchiffre plus le cookie de session** et ne détient plus aucun secret d'authentification.

| Page | Contenu |
|------|---------|
| [Présentation & fonctionnalités](./fonctionnalites.md) | Le registre des pages, la carte des URL, chaque page et ses particularités, le mode chantier et ses trois laissez-passer. |
| [Architecture technique](./architecture.md) | Stack, registre des routes, régimes de rendu et de cache, système visuel « Le tracé », politique de sécurité du contenu, pont d'authentification, SEO. |
| [Modèle de données](./donnees.md) | Les routes du Hub consommées, les deux contrats d'atelier, ce que LeSite envoie, les secrets partagés. |
| [Flux métier](./flux.md) | Inscription et paiement, mode chantier, revalidation du cache, demande de contact. |
| [Intégrations externes](./integrations.md) | LeHub, HelloAsso (indirect), OpenStreetMap, Plausible. Ce qui a disparu : Resend et le secret d'authentification. |
| [Développement](./developpement.md) | Installation locale, variables d'environnement, pièges spécifiques à LeSite. |
| [Déploiement](./deploiement.md) | CI/CD GitHub Actions, étapes du déploiement, vérification. |
