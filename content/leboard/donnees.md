---
title: Modèle de données
weight: 3
---

# Modèle de données

LeBoard n'a pas de base à lui : il travaille dans la base PostgreSQL de LeHub. Son dépôt porte son propre schéma Prisma, limité aux tables dont il a besoin, et c'est historiquement depuis ce dépôt qu'ont été créées les tables du plateau.

## Les tables du plateau

| Modèle | Rôle |
|---|---|
| `Board` | Un plateau : jeton d'accès (l'URL `b/[token]`), atelier LeHub associé, état (verrouillage, étape active), marqueur d'atelier test |
| `CardPlacement` | Chaque carte posée : position, face visible (recto/verso), rotation |
| `StickyNote` | Un post-it : position, taille, couleur, texte, taille de police |
| `BoardArrow` / `Connection` | Une flèche entre deux éléments : extrémités, sens, style, couleur |
| `AnimatorSession` | Session SSO d'un animateur venu de LeHub (jeton signé, durée courte) |

## Les tables partagées avec LeHub

| Modèle | Rôle |
|---|---|
| `WorkshopModel` | Le modèle d'atelier choisi, avec le plateau (catalogue d'étapes/matrices) auquel il se réfère |
| `Lot` | Les lots de cartes ou de diapositives du modèle, leur étape, et le mapping des cartes vers les cellules d'une matrice |
| `BoardLotDistribution` | Quels lots sont distribués sur quel plateau, et selon quel mode (distribution classique ou pop-corn) |
| `Member` | Identité de l'animateur (via le SSO), lecture seule côté LeBoard |

Le catalogue complet de ces tables est documenté dans [le modèle de données de LeHub]({{< relref "/lehub/donnees" >}}).

## Qui migre quoi

À l'origine, LeBoard a créé et migré l'ensemble de ces tables, y compris `WorkshopModel`, `Lot` et `BoardLotDistribution`. Depuis l'introduction des étapes et des matrices (mi-2026), la règle a changé : LeHub est devenu l'outil d'admin unique pour composer les modèles d'atelier et les lots, et c'est donc désormais depuis son dépôt que sont créées les migrations qui font évoluer ces tables, ainsi que certains champs du `Board` lui-même (l'étape active, par exemple).

En pratique : les migrations qui créent ou modifient les tables purement liées au dessin du plateau (`CardPlacement`, `StickyNote`, `BoardArrow`, `Connection`) restent créées et appliquées depuis le dépôt LeBoard. Toutes les évolutions liées à la structure des ateliers, des étapes et des lots viennent de LeHub. Les deux dépôts déclarent ces tables dans leur propre `schema.prisma` pour pouvoir les lire et les écrire, mais un seul des deux doit créer une migration pour une table donnée à un instant donné : c'est la source de vérité la plus fréquente de bugs de synchronisation entre les deux applications.
