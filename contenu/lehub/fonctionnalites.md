---
id: fonctionnalites
title: Présentation & fonctionnalités
sidebar_position: 2
---

# Présentation & fonctionnalités

## Les rôles et ce qu'ils peuvent faire

| Rôle | Accès au Hub | Périmètre |
|------|---|---|
| **Adhérent** | **Aucun** | Il n'existe pas de profil adhérent dans le Hub. `adherent` n'est pas un profil que l'on attribue, c'est la valeur par défaut du champ `role` et le résultat de la dérivation faite par `lib/parcours.ts` quand un membre ne porte aucun axe d'animation. Un membre dans cet état est refusé à la connexion (`lib/auth.ts`), avec une redirection vers `/login?deny=adherent`. L'accès minimum au Hub est animateur. |
| **Animateur** | Accès complet aux fonctionnalités d'animation | Création et édition d'ateliers grand public, sélection des co-animateurs, gestion des inscriptions et présences, accès aux supports pédagogiques « Animer ». Tableau de bord « Mes événements » avec section À venir/Terminés/Annulés. |
| **Formateur** | Accès animateur + formation | Création de formations, gestion des habilitations des participants, accès aux supports pédagogiques « Former ». Émission de badges aux formés. |
| **Administrateur** | Accès complet | Tous les droits : gestion des membres, événements, organisations, codes avantage, intégrations, paramètres. Modération des contenus. **Important** : les administrateurs ont `isAdmin=true` mais `role='formateur'` — toujours vérifier `isAdmin` dans le code, jamais seulement le `role`. |

## Parcours : un animateur crée et anime un atelier

1. Connexion via `/login` (page dans `app/(auth)/login/`) avec email/mot de passe ou LinkedIn OAuth.
2. Navigation vers `/membres/events/new` (page dans `app/members/events/new/`) — formulaire de création d'atelier (`NewWorkshopForm` dans `app/members/events/new/NewWorkshopForm.tsx`).
3. Saisie du titre, description, date/heure/durée (avec timezone), localisation (autocomplétion BAN API), type (atelier/formation), contexte (grand public/inter-organisations), capacité, sélection des co-animateurs directs, grille tarifaire.
   - **Grille tarifaire libre** (depuis octobre 2026) : l'atelier porte une liste de tarifs nommés (`Workshop.priceTiers`, 8 maximum), chacun avec son identifiant, son libellé, sa description et son montant HT. `lib/price-tiers.ts` est le seul module qui tranche : quand la grille existe elle gagne, sinon les trois tarifs historiques (solidaire / classique / soutien) sont reconstruits depuis les colonnes de l'atelier ou de `PricingPolicy`, avec les mêmes identifiants — un panier ouvert sur LeSite avant le passage continue donc de payer le bon montant.
   - **Cadre bénévole (pro bono)** : contexte réservé au public associatif (`lib/workshop-form.ts`, `PRO_BONO_CONTEXT`). Il ouvre l'atelier à tou·tes les animateur·ices et sort du périmètre des droits d'utilisation professionnels.
4. Création du plateau en ligne (si atelier en ligne) : sélection d'un modèle de plateau depuis `WorkshopModel` en DB, création automatique d'une entrée `Board` et `BoardLotDistribution` par lot. Le support Google Slides est rattaché au modèle (`WorkshopModel.slidesFileId`) : un seul fichier par version de cartes, dans lequel chaque lot choisit ses diapositives.
5. Publication via le bouton Publier dans `/membres/events/[id]` (page dans `app/members/events/[id]/page.tsx`) → appel API `PUT /api/admin/workshops/[id]/publish` qui change le statut à `published`.
6. Suivi des inscriptions sur la fiche atelier (`app/members/events/[id]/WorkshopRegistrationsTable.tsx`) : liste des inscrits payés, boutons de pointage de présence (`CheckInButton`), accès aux résultats satisfaction via `SatisfactionResults`.
7. Optionnel : ajout de co-animateurs après coup via `AnimatorsEditor` sur la même page, avec rôle lead/co.

Les ateliers créés via le Hub alimentent aussi la vitrine publique LeSite (via une API publique `/api/public/workshops`).

## Parcours : un participant s'inscrit et paie

1. Navigation depuis LeSite vers une fiche atelier publique (`app/(no-header)/events/[slug]/`).
2. Saisie des informations d'inscription (prénom, nom, email, téléphone optionnel) et choix d'un tarif dans la grille de l'atelier (libellés libres, ou solidaire / classique / soutien pour les ateliers qui n'ont pas de grille propre).
3. Appel API `POST /api/checkout/route.ts` qui :
   - Valide les paramètres (email unique, capacité restante, tarif valide pour l'atelier).
   - Crée une intention de paiement HelloAsso via `createCheckoutIntent()` (dans `lib/helloasso.ts`).
   - Crée une `Registration` en DB avec `paymentStatus='pending'` et un token d'annulation (`cancellationToken`).
   - Redirige vers le lien de paiement HelloAsso (valide 15 min).
4. Paiement sur HelloAsso, puis redirection vers `NEXT_PUBLIC_APP_URL` avec les paramètres `?checkoutIntentId=xxx&code=succeeded&orderId=yyy`.
5. Webhook HelloAsso vers `/api/webhooks/helloasso` (dans `app/api/webhooks/helloasso/route.ts`) :
   - Valide le token de sécurité (`HELLOASSO_WEBHOOK_TOKEN` en query string).
   - Trouve la `Registration` par `helloassoCheckoutIntentId`.
   - Crée ou met à jour un `Participant` (CRM).
   - Change la `Registration` à `paymentStatus='paid'`.
   - Envoie l'e-mail de confirmation (via Resend, `lib/email.ts`). **Le reçu de paiement est émis par HelloAsso** : le Hub ne génère aucune facture PDF, et la colonne `Registration.invoiceUrl` n'est écrite par personne.
6. Optionnel : reçoit un rappel email J-2 avant l'atelier (cron `POST /api/cron/reminders`).
7. Après l'atelier (J+1), reçoit une invitation au questionnaire de satisfaction. Elle part du **même cron que les rappels** (`app/api/cron/reminders/route.ts`, étape 5), et non d'un cron dédié : la fenêtre d'envoi est calculée par `lib/satisfaction-window.ts`, et le lien pointe vers `/satisfaction/[token]`. L'envoi n'a lieu que si le gabarit d'e-mail `satisfaction_invitation` est activé.
8. Peut voir son badge obtenu et le partager (badges Open Badges 3.0).

**Si le webhook est perdu** : la `Registration` reste en `pending` ; un mécanisme de réconciliation quotidienne (job cron, voir LeRunbook) rattrape les inscriptions non confirmées en interrogeant HelloAsso en direct par les `checkoutIntentId` enregistrés.

## Parcours : un formateur suit une formation et ses habilitations

1. Connexion avec rôle `formateur`.
2. Accès au dashboard qui affiche les formations à venir et les habilitations courantes (expiration).
3. Navigation vers `/membres/resources` (page dans `app/members/resources/page.tsx`) — accès aux supports pédagogiques gating à `access='formateur'` (fichiers PDF, slides, liens).
4. Optionnel : création d'un atelier de test depuis `/membres/resources` (onglet Supports) — création d'une `Workshop` temporaire avec lien animateur direct SSO, expiration automatique 24h, suppression manuelle possible.
5. Attributions d'habilitations depuis l'admin (les habilitations sont créées pour chaque formé via le champ `habilitationAnimation` et `habilitationFormation` sur `Member`), avec dates d'expiration (`habilitationExpiry`).
6. Suivi des parcours : 2 axes indépendants (animateur·ice / formateur·ice × citoyen·ne / pro), toggles Pro en admin, émission de badges automatique par lot selon les niveaux atteints.

## Parcours : un administrateur pilote et modère

1. Connexion avec `isAdmin=true` (note: `role='formateur'`).
2. Navigation vers `/admin` → dashboard d'administration (`app/admin/dashboard/`).
3. **Gestion des événements** : `/admin/events` (page dans `app/admin/events/page.tsx`) — table de tous les ateliers, filtres, actions (Éditer/Publier/Annuler/Dupliquer/Supprimer), édition en masse des tarifications.
4. **Modération des ateliers** : activation/désactivation du mode `workshopModerationOn` pour forcer la validation admin avant publication des ateliers animateurs.
5. **CRM participants** : `/admin/participants` — table des `Participant` (adresses email), édition (notes internes, étiquettes texte libre), historique cliquable, anonymisation RGPD à la suppression.
6. **Gestion des membres** : `/admin/members` — le rôle pédagogique ne se choisit pas directement, il est **dérivé** des axes cochés dans le formulaire de parcours (`lib/parcours.ts`) : un axe formateur donne `formateur`, un axe animateur donne `animateur`, aucun axe laisse `adherent` et donc aucun accès au Hub. La page gère aussi les habilitations (animation/formation, type grand public/inter-orga/interne), type de licence, étiquettes annuaire.
7. **Organisations** : `/admin/organisations` — CRUD des fiches organisation avec type, SIRET (lookup API recherche-entreprises automatique), adresse, gestionnaires (liaison membre ↔ organisation).
8. **Codes avantage** : `/admin/discount-codes` — CRUD des codes de réduction (% ou montant fixe), max utilisations, liaison optionnelle à un atelier.
9. **Actualités** : `/admin/blog` — CRUD d'articles Markdown GFM complet, auteur via dropdown admins, image upload → WebP, PDF upload → carrousel sur LeSite via shortcode `[pdf-carrousel:id]`, publication.
10. **Médiathèque** : `/admin/library` — articles, livres, rapports, podcasts, vidéos avec types, thématiques, import CSV.
11. **Jeux de cartes** : `/admin/cards` — les versions de cartes (`WorkshopModel`) qui alimentent LeBoard. La page d'une version (`/admin/cards/[id]`, refondue en novembre 2026) suit le déroulé de l'atelier : les lots sont regroupés par étape du plateau, et trois onglets séparent **Lots** (composition, cartes, mode de distribution, ciblage de matrice), **Titres** (titres personnalisés par carte) et **Régénération** (familles, pratiques, rattachement des exemples). Un en-tête porte le titre réel de la version, une ligne d'état (`lib/version-readiness.ts`) signale ce qui manque avant d'animer, et les réglages de version vivent dans un panneau latéral avec la resynchronisation du support Google Slides.
12. **Modèles emails** : `/admin/emails` — prévisualisation des 15 emails transactionnels (invitation, confirmation d'inscription, 3 issues d'annulation, annulation d'atelier, réinitialisation de mot de passe, rappel J-2, expiration cotisation/habilitation, place libérée, badge obtenu, invitation satisfaction, accusé de réception d'une demande de contact, test de configuration).
13. **Pédagogie** : `/admin/pedagogie` — supports pédagogiques versionnés (`PedagogicalVersion`), par section et par emplacement, avec un niveau d'accès animateur ou formateur. Les fichiers sont servis par `/api/pedagogical-files/[filename]` derrière le même contrôle d'accès.
14. **Référencement** : `/admin/seo` — tableau des pages publiques de LeSite et des articles, avec leurs scores SEO et de lisibilité ; l'optimisation d'une page se fait dans sa propre sous-page `/admin/seo/optimiser`. Voir la section « Référencement de LeSite » ci-dessous.
15. **Demandes entrantes** : `/admin/contact-requests` — les demandes du formulaire de contact de LeSite, persistées dans `ContactRequest`, avec statut (`nouveau` / `en_cours` / `traite` / `archive`), notes internes, origine (`site` ou `manuel`) et saisie manuelle d'une demande reçue par téléphone. Une pastille sur l'entrée de navigation compte les demandes jamais ouvertes.
16. **Paramètres** : `/admin/settings` → page multi-sections (Identité, Tarification, Droits d'utilisation, Email, Intégrations, Notifications, Référencement, Mode chantier) — identité et mentions légales de l'association, grilles de prix, config Resend, intégrations HelloAsso/Telegram/Logo.dev, notifications email/Telegram par événement admin, réglages SEO globaux, et bascule du mode chantier de LeSite.
17. **Tarification** : section « Tarification » des paramètres (composant `app/admin/pricing/TarificationSection.tsx`, également servi tel quel sur `/admin/pricing`) — gestion des `PricingPolicy` (prix par eventType × publicType × tarif solidaire/classique/soutien) et de `FormatPricing`.
18. **Annulation/remboursement** : gestion des demandes d'annulation (décision auto remboursement/avoir/blocage selon délai et statut de paiement). Remboursement HelloAsso automatique en pause — en attendant le privilège `RefundManagement`, chaque demande déclenche une notif admin Telegram pour traitement manuel. Dans l'autre sens, un remboursement décidé depuis le back-office HelloAsso est rattrapé par `lib/refund-sync.ts` et annule l'inscription côté Hub.

## Référencement de LeSite, piloté depuis le Hub

Depuis août 2026, les balises `<meta>` du site public ne sont plus écrites dans le code de LeSite : elles sont éditées dans le Hub et lues par LeSite à chaque rendu.

- **Réglages globaux** (`Settings`) : gabarit de titre, description par défaut, image OpenGraph par défaut, balise Search Console, et l'interrupteur `seoIndexingEnabled` qui autorise ou non l'indexation. Il reste à `false` tant que le mode chantier n'est pas levé.
- **Par page statique** : une ligne `SeoMeta` par chemin (`path` unique) porte titre SEO, meta description, mot-clé cible, image OpenGraph, `noindex` et les deux scores.
- **Par contenu** : les articles (`Article`) et les ateliers (`Workshop`) portent leurs propres champs SEO, distincts de leur contenu éditorial.
- **Analyse** : le moteur `yoastseo` tourne dans un **Web Worker navigateur** (`lib/seo/analyze`, `lib/seo/worker.ts`), jamais côté serveur. Il produit un score SEO, un score de lisibilité, une liste d'analyses traduites en français et un aperçu Google avec la largeur de titre mesurée en pixels.
- **Propagation** : à l'enregistrement, le Hub invalide le cache `seo-meta` de LeSite (`lib/seo/revalidate-lesite.ts`). L'inventaire des pages à analyser est lui-même demandé à LeSite (`lib/seo/lesite.ts`, en-tête `x-seo-crawler`), ce qui permet au tableau de rester juste quand une route publique est ajoutée ou renommée.

## Demandes de contact

Le formulaire de contact de LeSite n'envoie plus seulement un e-mail : il écrit une ligne `ContactRequest` dans le Hub, puis déclenche un accusé de réception au demandeur et une notification aux admins.

- Les champs de qualification du sujet « Organiser un atelier » (organisation, fonction, effectif, période, format) sont stockés dans la colonne `context`, à part du message, pour être affichés comme des champs. Les demandes reçues avant le 7 septembre 2026 gardent ce contexte en tête de leur message.
- Conservation : trois ans après le dernier échange, annoncés dans les mentions légales de LeSite. La purge est greffée sur le cron quotidien (`lib/contact-request-purge.ts`).
