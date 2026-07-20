---
id: fonctionnalites
title: Présentation & fonctionnalités
sidebar_position: 2
---

# Présentation & fonctionnalités

## Les rôles et ce qu'ils peuvent faire

| Rôle | Accès au Hub | Périmètre |
|------|---|---|
| **Adhérent** | Lecture seule | Dashboard personnel avec badges obtenus, annuaire des membres (opt-in), médiathèque publique, supports pédagogiques selon le rôle pédagogique. Les adhérents **n'ont pas accès au Hub** ; l'accès minimum est animateur. |
| **Animateur** | Accès complet aux fonctionnalités d'animation | Création et édition d'ateliers grand public, sélection des co-animateurs, gestion des inscriptions et présences, accès aux supports pédagogiques « Animer ». Tableau de bord « Mes événements » avec section À venir/Terminés/Annulés. |
| **Formateur** | Accès animateur + formation | Création de formations, gestion des habilitations des participants, accès aux supports pédagogiques « Former ». Émission de badges aux formés. |
| **Administrateur** | Accès complet | Tous les droits : gestion des membres, événements, organisations, codes avantage, intégrations, paramètres. Modération des contenus. **Important** : les administrateurs ont `isAdmin=true` mais `role='formateur'` — toujours vérifier `isAdmin` dans le code, jamais seulement le `role`. |

## Parcours : un animateur crée et anime un atelier

1. Connexion via `/login` (page dans `app/(auth)/login/`) avec email/mot de passe ou LinkedIn OAuth.
2. Navigation vers `/membres/events/new` (page dans `app/members/events/new/`) — formulaire de création d'atelier (`NewWorkshopForm` dans `app/members/events/new/NewWorkshopForm.tsx`).
3. Saisie du titre, description, date/heure/durée (avec timezone), localisation (autocomplétion BAN API), type (atelier/formation), contexte (grand public/inter-organisations), capacité, sélection des co-animateurs directs, prix personnalisés par tier.
4. Création du plateau en ligne (si atelier en ligne) : sélection d'un modèle de plateau depuis `WorkshopModel` en DB, création automatique d'une entrée `Board` et `BoardLotDistribution` par lot.
5. Publication via le bouton Publier dans `/membres/events/[id]` (page dans `app/members/events/[id]/page.tsx`) → appel API `PUT /api/admin/workshops/[id]/publish` qui change le statut à `published`.
6. Suivi des inscriptions sur la fiche atelier (`app/members/events/[id]/WorkshopRegistrationsTable.tsx`) : liste des inscrits payés, boutons de pointage de présence (`CheckInButton`), accès aux résultats satisfaction via `SatisfactionResults`.
7. Optionnel : ajout de co-animateurs après coup via `AnimatorsEditor` sur la même page, avec rôle lead/co.

Les ateliers créés via le Hub alimentent aussi la vitrine publique LeSite (via une API publique `/api/public/workshops`).

## Parcours : un participant s'inscrit et paie

1. Navigation depuis LeSite vers une fiche atelier publique (`app/(no-header)/events/[slug]/`).
2. Saisie des informations d'inscription (prénom, nom, email, téléphone optionnel) et sélection du tier tarifaire (solidaire/classique/soutien) sur `/checkout` (dans `app/(inscription)/checkout/` — page en construction ou formulaire intégré).
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
   - Génère une PDF d'invoice (via `lib/pdf.ts`).
   - Envoie un email de confirmation avec la facture (via `Resend` dans `lib/email.ts`).
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
6. **Gestion des membres** : `/admin/members` — attribution des rôles pédagogiques (adhérent/animateur/formateur), habilitations (animation/formation, type grand public/inter-orga/interne), type de licence, étiquettes annuaire.
7. **Organisations** : `/admin/organisations` — CRUD des fiches organisation avec type, SIRET (lookup API recherche-entreprises automatique), adresse, gestionnaires (liaison membre ↔ organisation).
8. **Codes avantage** : `/admin/discount-codes` — CRUD des codes de réduction (% ou montant fixe), max utilisations, liaison optionnelle à un atelier.
9. **Actualités** : `/admin/blog` — CRUD d'articles Markdown GFM complet, auteur via dropdown admins, image upload → WebP, PDF upload → carrousel sur LeSite via shortcode `[pdf-carrousel:id]`, publication.
10. **Médiathèque** : `/admin/library` — articles, livres, rapports, podcasts, vidéos avec types, thématiques, import CSV.
11. **Modèles de plateau** : `/admin/cards` — création et gestion des modèles de plateau (lots, cartes, titres personnalisés par lot, réordonnement).
12. **Templates emails** : `/admin/emails` — prévisualisation des 14 emails transactionnels (invitation, confirmation inscription, 3 issues d'annulation, reset MDP, rappel J-2, expiration cotisation/habilitation, liste d'attente, badge obtenu, invitation satisfaction, test config).
13. **Paramètres** : `/admin/parametres` → page multi-sections (IdentiteSection, EmailSection, IntegrationsSection, NotificationsSection, MentionsLegalesSection, UsageRightsPricingSection) — identité association, config email Resend, intégrations HelloAsso/Telegram/Logo.dev, notifications email/Telegram par événement admin.
14. **Tarification** : `/admin/pricing` (page dans `app/admin/pricing/TarificationSection.tsx`) — gestion des `PricingPolicy` (price par eventType × publicType × tier solidaire/classique/soutien).
15. **Annulation/remboursement** : gestion des demandes d'annulation (décision auto remboursement/avoir/blocage selon délai et statut de paiement). Remboursement HelloAsso automatique en pause — en attendant le privilège `RefundManagement`, chaque demande déclenche une notif admin Telegram pour traitement manuel.
