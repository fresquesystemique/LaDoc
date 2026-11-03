---
id: fonctionnalites
title: Présentation & fonctionnalités
sidebar_position: 2
---

# Présentation & fonctionnalités

LeSite s'adresse au grand public : personnes curieuses de la démarche systémique, futures participantes d'ateliers, organisations intéressées. Voici ses pages et les parcours d'un visiteur.

## Le registre des pages, source unique des noms

Avant de parcourir les pages, il faut connaître `lib/public-routes.ts`. C'est l'**inventaire explicite** des pages publiques, et la source unique de tous les noms d'une page : libellé de menu, libellé de pied de page, maillon du fil d'Ariane, titre d'onglet, gros titre, et libellé affiché dans l'éditeur SEO du Hub.

Chaque entrée porte aussi :

- son `group` de menu (« Nos offres », « Ressources », « En savoir plus ») — un regroupement n'a pas de page à lui, il apparaît dans le fil d'Ariane sans lien ;
- son `indexability` : `when-live` (le cas courant), `never` (pages transactionnelles), `chantier-only` (réservé à `/chantier`), `always` (aucune page aujourd'hui) ;
- son `breadcrumb` : `auto` (calculé depuis le registre), `self` (la page rend son propre fil, pour un titre dynamique) ou `none`.

**Ajouter une page publique, c'est ajouter une ligne ici.** Le test `tests/routes-completeness.test.ts` échoue si une page de `app/` n'y figure pas : c'est ce qui empêche le fil d'Ariane de bricoler un libellé (« Cgu ») pour une page oubliée. L'introspection du système de fichiers n'étant pas fiable dans un build `standalone`, cet inventaire est tenu à la main.

## Carte des pages

| Route | Rôle | Indexable |
|---|---|---|
| `/` | Accueil | à la levée du chantier |
| `/offres/suivre-un-atelier` | Participer à un atelier : déroulé, prérequis, tarif, dates | idem |
| `/offres/se-former` | Se former à l'animation — **page « en construction »** qui renvoie vers `/contact` | idem |
| `/offres/organiser-un-atelier` | Organiser un atelier chez soi (B2B) — **page « en construction »** qui renvoie vers `/contact` | idem |
| `/evenements` | Agenda filtrable + carte | idem |
| `/evenements/[slug]` | Fiche d'un atelier public | idem |
| `/catalogue` | Catalogue des ateliers et formations | idem |
| `/catalogue/atelier-citoyen` | Fiche de l'atelier citoyen | idem |
| `/ressources/blog` | Blog | idem |
| `/ressources/blog/[slug]` | Article | idem |
| `/ressources/mediatheque` | Médiathèque | idem |
| `/association/a-propos` | À propos de l'association | idem |
| `/association/ce-que-la-systemique-change` | Ce que la systémique change | idem |
| `/contact` | Formulaire de contact | idem |
| `/mentions-legales`, `/cgu` | Mentions légales et conditions d'utilisation | idem |
| `/accessibilite` | Déclaration d'accessibilité | idem |
| `/ecoconception` | Déclaration d'écoconception RGESN et bilan carbone du site | idem |
| `/chantier` | Page « site en construction » | **pendant le chantier seulement** |
| `/confirmation` | Retour après paiement HelloAsso | jamais |
| `/annulation/[token]` | Annulation d'une inscription | jamais |

Les anciennes URL sont conservées : une vingtaine de redirections permanentes (308) vivent dans `next.config.js`, dont celles de l'ancien WordPress (`/actualites`), celles du renommage du 3 septembre 2026 (`/participer`, `/devenir-animateur`, `/organisations`, `/ateliers/*`) et celles du regroupement du 4 septembre (`/blog`, `/mediatheque`, `/a-propos`). Elles pointent toutes vers la **destination finale**, jamais vers une étape intermédiaire : enchaîner deux sauts est déprécié par Google et mal mis en cache par les navigateurs.

## Accueil

Route : `/`

La page raconte la démarche systémique avant même d'y participer, dans le système visuel « Le tracé » :

- un fond de réseau (`NetworkBackground`) et le tracé lui-même (`Trace`, géométrie dans `lib/trace-paths.ts`) ;
- une matrice qui fusionne les piliers et la comparaison avec d'autres approches (`SystemMatrix`) ;
- le parcours en U du participant (`UJourney`) et l'empilement comparatif (`ComparisonStack`) ;
- les témoignages en bento (`TestimonialCard`, `lib/testimonials.ts`), la note Google (`GoogleRating`), les logos de références (`LogoRef`, `lib/references.ts`) ;
- un appel à l'action collant sur mobile (`StickyMobileCta`).

## Agenda des événements

Route : `/evenements`

Liste des ateliers ouverts au public, filtrables par type (atelier ou formation), département, format (en ligne, présentiel, hybride) et disponibilité de places. Une carte Leaflet (`WorkshopMap`) localise les séances, et un tiroir (`WorkshopDrawer`) ouvre le détail sans quitter la liste.

Cette page est **rendue côté client** : elle appelle l'API du Hub depuis le navigateur. C'est la raison pour laquelle le Hub doit figurer dans `connect-src` de la politique de sécurité — l'en retirer vide l'agenda sans autre symptôme qu'une erreur dans la console.

## Fiche atelier

Route : `/evenements/[slug]`

Titre, description, horaires dans le fuseau de l'atelier, durée, adresse complète, animateur·ices, places restantes, et la **grille tarifaire telle que le Hub la sert** (`lib/price-tiers.ts` côté LeSite ne fait que l'afficher et renvoyer l'identifiant du tarif choisi au checkout). Métadonnées et données structurées JSON-LD `Event` viennent des champs SEO de l'atelier.

## Blog et article

Routes : `/ressources/blog` et `/ressources/blog/[slug]`

- Liste triable et filtrable, avec le vocabulaire partagé avec la médiathèque (`lib/listing.ts`, `components/listing/`) : les deux listings trient de la même façon et nomment leurs tris pareil.
- Article en Markdown GFM, avec carrousel de pages PDF (`[pdf-carrousel:id]` → `PdfCarousel`, conversion en WebP côté Hub).
- Trois partages qui fonctionnent réellement, avec leurs modèles de texte (`lib/share-templates.ts`) : LinkedIn n'accepte aucun texte dans son URL de partage depuis 2018, l'aperçu est entièrement construit depuis les balises Open Graph — d'où l'image OpenGraph générée à la demande par `/api/og/articles/[slug]`.
- Un appel à l'action vers un atelier en fin d'article (`ArticleWorkshopCta`, `lib/article-cta.ts`).

## Médiathèque

Route : `/ressources/mediatheque`

Sélection publique de ressources documentaires (articles, livres, rapports, podcasts, vidéos) gérée dans LeHub, avec les mêmes filtres et tris que le blog.

## Catalogue

Routes : `/catalogue` et `/catalogue/atelier-citoyen`

Présentation des ateliers et formations proposés. La fiche de l'atelier citoyen détaille le déroulé et les objectifs (`lib/atelier-citoyen.ts`).

:::warning Qualiopi appartient à KAIROS, pas à l'association
Le certificat Qualiopi couvre **KAIROS Accompagnement & Recherches**, l'organisme de formation de Valérie Brunel, co-fondatrice — et non La Fresque Systémique. On n'écrit donc jamais « La Fresque Systémique est certifiée Qualiopi », et le logo ne sort pas du composant `FundingBlock`. Les valeurs sont recopiées sur le certificat ICPF dans `lib/qualiopi.ts` et ne doivent pas être paraphrasées.
:::

## À propos et « Ce que la systémique change »

Routes : `/association/a-propos` et `/association/ce-que-la-systemique-change`

Histoire, fonctionnement et valeurs de l'association, conseil scientifique, partenaires (carrousel horizontal sur mobile). La première page a été refondue au système « Le tracé » le 1er septembre 2026 et c'est la seule à utiliser le composant `PageHeader`.

## Contact

Route : `/contact`

Formulaire (prénom et nom séparés, e-mail, téléphone, sujet, message) qui alimente directement les demandes entrantes du Hub.

- Cinq sujets, dont « Organiser un atelier » qui déplie des champs de qualification (organisation, fonction, effectif, période, format). **La liste des sujets est recopiée dans LeHub** (`lib/contact-request.ts`) : toute valeur ajoutée d'un côté doit l'être de l'autre.
- Garde anti-robots maison (`lib/anti-bot.ts`) : deux signaux, aucun tiers, aucun script chargé chez le visiteur. Ni reCAPTCHA ni équivalent, qui demanderaient d'ouvrir la politique de sécurité, d'exporter des données personnelles et de charger des centaines de kilo-octets.
- Limite de débit en mémoire : 5 envois par IP et par 10 minutes, l'IP étant lue dans `X-Real-IP` posé par Nginx (non falsifiable, contrairement à `X-Forwarded-For`).
- L'envoi part vers `POST /api/public/contact-notification` du Hub, qui persiste la demande, accuse réception au demandeur et notifie les admins. **LeSite n'envoie plus d'e-mail lui-même** : il n'a plus de clé Resend.

## Écoconception et accessibilité

Routes : `/ecoconception` et `/accessibilite`

- **Écoconception** : déclaration RGESN 2024 (`lib/rgesn.ts` reprend les 78 critères, familles, priorités et poids de l'outil officiel de l'Arcep — seuls `statut` et `justification` nous appartiennent), score de conformité, tableau EcoIndex par page, bilan carbone du site et comparaison avec l'empreinte de l'IA utilisée pour le construire.
- **Accessibilité** : déclaration de conformité RGAA.

## Mode chantier

Route : `/chantier`

Page affichée tant que le flag `siteChantierMode` du Hub est actif, pour tout visiteur qui n'est pas administrateur. Trois exceptions traversent le mode chantier :

1. les **administrateurs** reconnus par le pont d'authentification ;
2. les **robots d'aperçu de lien** (LinkedIn, Facebook, Slack, WhatsApp, Telegram…), pour que le partage affiche les vraies balises Open Graph au lieu de « Site en construction » ;
3. le **récupérateur de pages SEO** du Hub, qui présente un secret partagé dans l'en-tête `x-seo-crawler` — un secret, pas une usurpation de user-agent, qui se falsifie depuis n'importe quel navigateur.

## Routes API côté LeSite

| Route | Méthode | Rôle |
|-------|---------|------|
| `/api/me` | GET | Session reconnue par le pont d'auth (menu compte) |
| `/api/contact` | POST | Réception du formulaire de contact, transmis au Hub |
| `/api/revalidate` | POST | Webhook du Hub : revalidation ISR immédiate, chemins et tags |
| `/api/seo/routes` | GET | Inventaire des pages publiques, servi au tableau SEO du Hub |
| `/api/seo/pages` | GET | Contenu d'une page à analyser, lu en boucle locale |
| `/api/og/articles/[slug]` | GET | Image OpenGraph d'un article, générée à la demande (cache 1 h) |

Les routes d'inscription (`/api/checkout`, `/api/discount-codes/validate`, `/api/workshops/:id/waitlist`, `/api/public/registrations/:token` et son `/cancel`) sont des **rewrites** vers l'API du Hub dans `next.config.js` : le navigateur reste en same-origin et le Hub valide tout.
