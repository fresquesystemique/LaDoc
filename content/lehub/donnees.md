---
title: Modèle de données
weight: 3
---

# Modèle de données

Le schéma Prisma (`prisma/schema.prisma`) est la source de vérité : 30 modèles, que l'on peut regrouper en cinq domaines. La base est partagée avec LeBoard, qui possède ses propres tables dans le même schéma.

## Les relations au cœur du système

{{< mermaid >}}
erDiagram
    Member ||--o{ WorkshopAnimator : anime
    Workshop ||--o{ WorkshopAnimator : "animé par (lead/co)"
    Workshop ||--o{ Registration : "reçoit"
    Participant ||--o{ Registration : "s'inscrit"
    Workshop ||--o{ WaitlistEntry : "liste d'attente"
    Workshop }o--|| Organisation : "rattaché à (optionnel)"
    Member ||--o{ OrganisationManager : "gère"
    Organisation ||--o{ OrganisationManager : "gérée par"
    Member ||--o{ CotisationPayment : "cotise"
    Member ||--o{ BadgeAssertion : "reçoit des badges"
    Workshop }o--|| WorkshopModel : "modèle de plateau"
    Workshop ||--o| Board : "plateau en ligne"
{{< /mermaid >}}

Deux entités jouent des rôles proches mais distincts :

- **Member** : un compte sur LeHub (animateur·ice, formateur·ice, admin), avec rôle pédagogique, habilitations, cotisation et profil.
- **Participant** : une personne inscrite à au moins un atelier, membre ou non. C'est la base du CRM (notes, étiquettes, historique), dédupliquée par e-mail.

## Domaine membres et association

| Modèle | Rôle |
|---|---|
| `Member` | Compte membre : rôle pédagogique, `isAdmin`, habilitations animation/formation, genre, type de licence, bio, tagline, avatar, étiquettes, consentement annuaire, suppression douce |
| `CotisationPayment` | Historique des paiements de cotisation (montant, date, source HelloAsso) |
| `Organisation` | Fiche organisation : nom, type, SIRET, adresse |
| `OrganisationManager` | Liaison membre ↔ organisation (gestionnaire) |
| `PendingLink` | Liaison LinkedIn en attente de confirmation (durée de vie 15 minutes) |
| `UsageReport` | Déclarations d'utilisation professionnelle et paiement des droits |

## Domaine ateliers et inscriptions

| Modèle | Rôle |
|---|---|
| `Workshop` | Atelier ou formation : dates, lieu ou lien, type, contexte, prix par tiers, organisation, modèle de plateau, liste d'attente, statut (dont `cancelled`), suppression douce |
| `WorkshopAnimator` | Relation atelier ↔ animateur·ice avec rôle `lead` ou `co` ; le lead est le responsable de l'atelier. Porte aussi la date de dernière visite de la fiche (pastille « nouveaux inscrits ») |
| `Registration` | Inscription d'un participant à un atelier, avec jeton d'annulation, date et méthode de remboursement le cas échéant |
| `Participant` | CRM : identité, e-mail unique, notes internes, étiquettes |
| `WaitlistEntry` | Entrée en liste d'attente (position, date de notification) |
| `BadgeAssertion` | Badge Open Badges 3.0 émis (type, niveau, atelier d'origine, credential signé) |
| `SatisfactionResponse` | Réponse à l'enquête de satisfaction post-atelier (réponses par critère, commentaire libre) |
| `DiscountCode` | Code de réduction : pourcentage ou montant fixe, restrictions (e-mail, atelier), quota d'utilisations, expiration |

## Domaine contenus

| Modèle | Rôle |
|---|---|
| `Article` | Actualité : slug, catégorie, contenu Markdown, extrait, image, carrousel PDF, auteur, état de publication |
| `Resource` | Ressource de la médiathèque : titre, lien, type, date, auteurs, thématiques, langues |
| `PedagogicalVersion` | Support pédagogique versionné par section et emplacement, avec niveau d'accès |

## Domaine plateaux (partagé avec LeBoard)

| Modèle | Rôle |
|---|---|
| `WorkshopModel` | Modèle de plateau : nom, description, et référence vers le catalogue d'étapes/matrices codé dans les deux applications |
| `Lot` | Lot d'un modèle, rattaché à une étape : cartes (avec placement en cellule) ou diaporama (`contentType`), ordre de distribution |
| `CardMeta` / `ModelCardTitle` | Titres et métadonnées de cartes personnalisés par lot ou par modèle |
| `BoardLotDistribution` | Distribution des lots pour un plateau donné, avec le mode choisi (distribution classique ou pop-corn) |
| `Board` | Un plateau en ligne : jeton d'accès, atelier associé, état, étape active |
| `CardPlacement` | Position et face de chaque carte posée sur un plateau |
| `Connection` | Flèche tracée entre deux éléments d'un plateau |
| `AnimatorSession` | Session SSO animateur vers LeBoard (jeton signé, durée courte) |

## Domaine configuration

| Modèle | Rôle |
|---|---|
| `Settings` | Paramètres globaux de l'association (identité, e-mail, intégrations, drapeaux dont le mode chantier de LeSite) |
| `PricingPolicy` | Tarification par type d'événement × type de public, en trois tiers |
| `FormatPricing` | Ancien modèle de tarification, conservé en repli |
| `NotificationConfig` | Notifications admin (e-mail, Telegram) par type d'événement |

## Migrations

Prisma gère les migrations. Les tables purement liées au dessin du plateau (`CardPlacement`, `StickyNote`, `BoardArrow`, `Connection`) sont créées et migrées depuis le dépôt LeBoard. Toutes les autres, y compris les évolutions de `Board`, `WorkshopModel`, `Lot` et `BoardLotDistribution` liées aux étapes et aux matrices, sont créées et migrées depuis LeHub, qui est l'outil d'admin de référence pour la composition des ateliers en ligne. En production, `prisma migrate deploy` s'exécute à chaque déploiement : le schéma suit toujours le code.
