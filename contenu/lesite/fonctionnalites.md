---
id: fonctionnalites
title: Présentation & fonctionnalités
sidebar_position: 2
---

# Présentation & fonctionnalités

LeSite s'adresse au grand public : personnes curieuses de la démarche systémique, futures participantes d'ateliers, organisations intéressées. Voici ses pages et les parcours d'un visiteur.

## Accueil

Route : `/`

Une page d'accueil riche et interactive qui raconte la démarche systémique. Elle contient :

- Un fond animé en réseau et boucles systémiques (composant `SystemicLoops`).
- Un diagramme de l'iceberg interactif (composant `IcebergDiagram`).
- Une carte des liens (composant `SystemicMap`).
- Un parcours en U du participant (composant `UJourney`).

L'objectif est de faire comprendre la fresque et son approche avant même d'y participer.

## Agenda des événements

Route : `/evenements`

Liste des ateliers ouverts au public, triable et filtrables par :

- Type : atelier ou formation.
- Département (liste française complète).
- Format : en ligne, présentiel, hybride.
- Statut de place : ateliers avec places disponibles.

Affiche aussi une carte interactive (Leaflet, composant `WorkshopListMap`) localisant les ateliers publiés. Les données sont récupérées depuis LeHub via `GET /api/public/workshops` et cachées en ISR (revalidation 5 min).

## Fiche atelier

Route : `/evenements/[slug]`

Détail d'un atelier public :

- Titre, description, dates/horaires (timezone respectée), durée.
- Lieu avec adresse complète (autocomplétion BAN).
- Animateur·ices (nom, avatar, tagline ou rôle).
- Tarifs par tier (solidaire, classique, soutien), affichés en HT et TTC.
- Nombre de places restantes.
- Bouton d'inscription qui ouvre un formulaire ou bascule vers `/checkout`.
- Données structurées JSON-LD `Event` pour le référencement.

L'inscription est gérée côté LeHub : le navigateur reste en same-origin grâce à un rewrite de `/api/checkout` vers l'API du hub.

## Actualités

Route : `/blog`

Liste des articles publiés depuis l'admin LeHub :

- Titre, extrait, image, catégorie.
- Auteur avec avatar (custom ou Gravatar) et tagline « En une ligne » du profil LeHub, ou rôle associatif par défaut.
- Date de publication.

Les articles sont récupérés via `GET /api/public/articles` et cachés en ISR (revalidation 5 min).

## Article individuel

Route : `/blog/[slug]`

L'article complet :

- Contenu Markdown riche (GFM complet).
- Possibilité d'embarquer un carrousel de pages PDF (shortcode `[pdf-carrousel:id]` remplacé à la publication, composant `PdfCarousel`) : upload d'un PDF dans LeHub, conversion en images WebP via Poppler, affichage en scroll-snap.
- Données structurées JSON-LD `Article`.

La page est régénérée en ISR (revalidation 5 min), et à chaque publication dans l'admin LeHub, un appel à `/api/revalidate` force la revalidation immédiate.

## Médiathèque

Route : `/mediatheque`

Sélection publique de ressources documentaires (articles, livres, rapports, podcasts, vidéos) gérée dans LeHub. Les ressources sont récupérées via `GET /api/public/resources` et cachées en ISR.

## Formations (Qualiopi)

Route : `/formations`

Page de présentation des formations certifiées Qualiopi.

Route : `/formations/citoyen`

Détail de l'atelier citoyen (parcours, objectifs).

(La section formations est prévue mais ne redéploie pas d'API spécifique : elle s'alimente des ateliers de type `eventType='formation'`.)

## À propos

Route : `/a-propos` (ancienne URL `/qui-sommes-nous` redirigée vers `/a-propos` avec code 308)

Présentation de l'association, son histoire, son fonctionnement, ses valeurs.

## Contact

Route : `/contact`

Formulaire de contact (prénom, nom, email, message) :

- Soumission via `POST /api/contact` (composant `ContactForm`).
- Envoi de l'email via Resend (si clé API configurée).
- Notification optionnelle au hub via `POST /api/public/contact-notification` pour déléguées au LeHub par sa config Paramètres (email/Telegram selon préférences admin).

## Accessibilité

Route : `/accessibilite`

Déclaration d'accessibilité du site (conformité RGAA).

## Mentions légales

Route : `/mentions-legales`

Mentions légales et responsabilité de l'association.

## Page de confirmation

Route : `/confirmation`

Affichage après retour du paiement HelloAsso : confirmation de l'inscription, récapitulatif de la commande, lien vers le dashboard LeHub.

## Mode chantier

Route : `/chantier`

Page affichée quand le flag `siteChantierMode` du hub est actif et l'utilisateur n'est pas un administrateur. Indique que le site est en construction.

**Pour les administrateurs** : le pont d'authentification (cookie partagé) les reconnaît ; ils voient le vrai site avec une barre de bascule (`ChantierBar`) permettant de passer en vue visiteur/admin selon leur préférence.

## Annulation d'inscription

Route : `/annulation/[token]`

Page de confirmation/détail d'une annulation d'inscription, utilisant un token d'annulation unique généré lors de l'inscription. Permet de vérifier les détails avant validation.

## Routes API côté LeSite

| Route | Méthode | Rôle |
|-------|---------|------|
| `/api/me` | GET | Expose la session reconnue par le pont d'auth (menu compte). |
| `/api/contact` | POST | Réception du formulaire contact, envoi email via Resend. |
| `/api/revalidate` | POST | Webhook depuis LeHub : revalidation ISR immédiate au changement de contenu (protégé par secret partagé). |
| `/api/site-mode` | GET | État du flag mode chantier. |

Toutes les autres routes d'API (`/api/checkout`, `/api/discount-codes/*`, `/api/workshops/*/waitlist`, `/api/public/registrations/*`) sont des rewrites vers l'API du hub via `next.config.js`.
