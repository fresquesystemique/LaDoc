---
id: integrations
title: Intégrations externes
sidebar_position: 6
---

# Intégrations externes

LeHub s'intègre avec plusieurs services externes critiques pour son fonctionnement métier.

| Service | Ce qu'il porte | Sans lui |
|---|---|---|
| HelloAsso | Paiements des inscriptions, des cotisations et des droits d'utilisation | Plus d'inscription payante |
| Resend | Tous les e-mails transactionnels | Aucune confirmation, aucun rappel |
| Google Slides | Supports projetés en atelier, rattachés à une version de cartes | Plus de projection depuis LeBoard |
| API Adresse (BAN) | Autocomplétion d'adresse à la création d'un atelier | Saisie libre, pins moins précis sur LeSite |
| API recherche-entreprises | Lookup SIRET des organisations | Saisie manuelle |
| Telegram | Notifications admin instantanées | Les notifications e-mail restent |
| Backblaze B2 | Sauvegardes de la base et des uploads | Plus de filet en cas de perte du VPS |
| Plausible | Analytics sans cookie | Aucun impact fonctionnel |
| Logo.dev | Logos d'organisations (optionnel) | Logos absents |

## HelloAsso (paiements)

Gère les paiements pour les inscriptions aux ateliers et les déclarations de droits professionnels.

### Ce qu'elle apporte

- **Création d'intention de paiement** : génère un lien de paiement sécurisé valide 15 minutes.
- **Traçabilité des ordres** : chaque paiement reçoit un `orderId` unique, permet la réconciliation.
- **Webhook pour confirmation** : notification asynchrone quand le paiement est accepté.
- **Remboursement** (en pause) : refund API utilisable une fois le privilège `RefundManagement` accordé par HelloAsso.

### Fichiers clés

| Fichier | Rôle |
|---------|------|
| `lib/helloasso.ts` | Client OAuth2, fonctions `createCheckoutIntent()`, `getOrder()`, `refundPayment()` |
| `app/api/checkout/route.ts` | Création d'intention de paiement (endpoint public) |
| `app/api/webhooks/helloasso/route.ts` | Traitement webhook paiements et rapports utilisation |
| `lib/cotisation-webhook.ts` | Traitement spécifique paiements cotisation |
| `scripts/reconcile-registrations.ts` | Cron quotidien : webhooks perdus, remboursements externes, paniers abandonnés |
| `lib/refund-sync.ts` | Remboursements décidés depuis le back-office HelloAsso |

### Variables d'environnement

| Nom | Rôle |
|-----|------|
| `HELLOASSO_WEBHOOK_TOKEN` | Token secret passé en query string du webhook (sécurité) |

:::info Les identifiants HelloAsso ne sont **pas** des variables d'environnement
Contrairement à ce que laisse croire le `.env.example`, le code ne lit jamais `HELLOASSO_CLIENT_ID` et compagnie dans l'environnement : les identifiants prod et sandbox, le slug d'organisation et le choix de l'environnement vivent dans la table `Settings` et s'éditent dans `/admin/settings` → Intégrations. Seul le token du webhook reste une variable d'environnement, puisqu'il est vérifié avant tout accès à la base.
:::

### Comportement en cas d'indisponibilité

- **HelloAsso inaccessible au moment du checkout** : endpoint `/api/checkout` retourne erreur 503. L'utilisateur voit un message d'erreur.
- **Webhook perdu** : registration reste `pending`. **Réconciliation quotidienne** (job cron, script `reconcile-registrations.ts` dans LeRunbook) retro-trouve l'ordre chez HelloAsso et met à jour.
- **Remboursement HelloAsso échoue** : notif Telegram admin pour traitement manuel, registration reste `paid` mais `refundMethod='blocked'`.

### Piège : authentification HelloAsso

Le client HelloAsso utilise OAuth2 **credentials flow** (pas d'utilisateur interactif) — les identifiants sont stockés en DB (`Settings`) et utilisés directement par le serveur. Si les credentials manquent ou sont incorrects, toute tentative de paiement échoue avec erreur 401 auth.

**Vérification** : endpoint admin `/api/admin/helloasso/test` (GET + admin gate) teste la connexion et retourne le status (accessible depuis `/admin/parametres` → Intégrations → Test HelloAsso).

## API Adresse BAN (autocomplétion adresse)

Fournit l'autocomplétion d'adresse complète lors de la création d'un atelier.

### Ce qu'elle apporte

- **Géocoding** : transforme une saisie partielle (rue + ville) en adresse complète avec coordonnées.
- **Déduplication** : prévient les doublons d'adresses via la normalisation.
- **Précision cartes** : adresses complet améliore la précision des pins sur les cartes LeSite.

### Fichiers clés

- `app/members/events/new/NewWorkshopForm.tsx` : intégration du composant autocomplétion.
- Appel direct à `https://api-adresse.data.gouv.fr/search` (fetch côté client, pas d'authentification requise).

### Aucune variable d'environnement

L'API est publique, gratuite et sans authentification. Aucune clé secrète requise.

### Comportement en cas d'indisponibilité

- L'autocomplétion devient simple champ de saisie libre.
- L'atelier peut toujours être créé avec une adresse partielle.

## Google Slides (supports d'atelier)

Les supports projetés pendant un atelier sont des présentations Google Slides, lues par le Hub et relayées à LeBoard.

### Ce qu'elle apporte

- **Un fichier par version de cartes** (`WorkshopModel.slidesFileId`) : chaque lot y choisit ses diapositives, plutôt que d'avoir un fichier par lot.
- **Images exportées** : les diapositives sont exportées en images (`exportSlideImage`) et servies à LeBoard derrière le jeton du plateau, via `/api/uploads`.
- **Détection de péremption** : la révision du fichier (`getFileRevision`) permet de savoir quels lots projettent une version périmée, et de proposer une resynchronisation globale.
- **Notes du présentateur** : extraites du fichier (`extractNotesText`) pour accompagner l'animation.

### Fichiers clés

| Fichier | Rôle |
|---------|------|
| `lib/google-slides.ts` | Client googleapis (OAuth), liste, révision, export d'image, notes |
| `lib/google-slides-url.ts` | Extraction de l'ID d'un fichier depuis l'URL collée par un admin |
| `lib/lot-slides.ts` | Sélection des diapositives d'un lot |
| `app/api/admin/google-slides/` | Liste et miniatures côté admin |
| `scripts/google-slides-oauth.ts` | Obtention initiale du refresh token |

### Variables d'environnement

| Nom | Rôle |
|-----|------|
| `GOOGLE_OAUTH_CLIENT_ID` | Client OAuth Google |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Secret du client OAuth |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | Refresh token d'un compte ayant accès aux présentations |

### Comportement en cas d'indisponibilité

La liste des présentations et les miniatures échouent, l'éditeur de version affiche un bandeau d'échec de chargement plutôt qu'une page vide. Les images déjà exportées restent servies.

## Telegram (notifications administrateur)

Envoie des notifications instantanées aux admins pour des événements critiques (remboursements qui échouent, rapports d'utilisation payés, erreurs cron).

### Ce qu'elle apporte

- **Notifications temps réel** : alertes immédiates sans attendre un polling.
- **Canal unique** : un seul groupe Telegram centralisé pour les notifs Hub.

### Fichiers clés

| Fichier | Rôle |
|---------|------|
| `lib/notifications.ts` | Fonction `notifyAdmin()` qui envoie email + Telegram selon config |
| `app/api/admin/settings/notifications/route.ts` | Gestion config notifications par type événement |

### Variables d'environnement

| Nom | Rôle |
|-----|------|
| `TELEGRAM_BOT_TOKEN` | Token du bot Telegram (obtenu via @BotFather) |
| `TELEGRAM_CHAT_ID` | ID du groupe/canal Telegram destination |

Stocker aussi dans `Settings` DB pour modification sans redéploiement.

### Configuration

1. Créer un bot Telegram via @BotFather (obtenez un token).
2. Ajouter le bot au groupe admin.
3. Déterminer l'ID du groupe (complexe, voir LeRunbook pour la procédure).
4. Configurer `/admin/settings` → Intégrations → Telegram.

### Comportement en cas d'indisponibilité

- Erreur envoi Telegram → log serveur, l'email est toujours envoyé en fallback.
- L'absence de notifications Telegram n'empêche pas le Hub de fonctionner.

## Backblaze B2 (sauvegardes)

Stockage des sauvegardes automatiques de la base de données et des uploads (images, PDFs).

### Ce qu'elle apporte

- **Sauvegardes régulières** (quotidien) : PostgreSQL + fichiers uploads.
- **Intégrité** : clé sans droit de suppression, restauration testée.

### Fichiers clés

Voir LeRunbook (hors repo public).

### Variables d'environnement

Aucune en `.env.example` — la configuration appartient au **script de sauvegarde de l'hôte** (LeRunbook).

### Comportement en cas d'indisponibilité

La sauvegarde échoue, alerté via monitoring VPS. Le Hub fonctionne normalement. Risque de perte de données en cas de défaillance complète du VPS.

## Plausible (analytics)

Auto-hébergé sur le VPS, collecte des données d'usage anonymes (nombre visites, pages, durées).

### Ce qu'elle apporte

- **Analytics privé** : pas de Google Analytics, conforme RGPD.
- **Tableau de bord** : interface web de l'instance Plausible auto-hébergée (accès dans LeRunbook).

### Fichiers clés

Scripts de tracking Plausible injectés dans `app/layout.tsx` (racine Next.js).

### Configuration

Plausible est auto-hébergé sur le VPS (Docker) — voir LeRunbook pour setup et accès.

### Comportement en cas d'indisponibilité

Le tracker Plausible échoue silencieusement (fallback client). L'app fonctionne sans analytics.

## Resend (emails transactionnels)

Envoie les emails de confirmation d'inscription, rappels J-2, résets de mot de passe, notifications badges, etc.

### Ce qu'elle apporte

- **Emails transactionnels** : fiabilité et delivery rate élevé.
- **Templates HTML** : contenu défini en code (`lib/email-template-defaults.ts`), rendu avec `renderBlocks()`.

### Fichiers clés

| Fichier | Rôle |
|---------|------|
| `lib/email.ts` | Fonction `sendEmail()`, `sendConfirmationEmail()` etc. |
| `lib/email-template-defaults.ts` | Contenu des 15 gabarits d'e-mail (blocs sectionlabel, textcard, etc.) |
| `lib/email-blocks.ts` | Composants réutilisables pour le rendu HTML |
| `lib/email-layout.ts` | Layout wrapper emails (header logo, footer) |

### Variables d'environnement

La clé API et les adresses expéditrices sont lues **dans la table `Settings`**, pas dans l'environnement (`lib/email.ts` prend `settings.resendApiKey`). Elles s'éditent dans `/admin/settings` → Email. Les variables `RESEND_*` encore présentes dans le `.env.example` ne sont plus utilisées par le code.

Trois adresses expéditrices cohabitent : l'adresse par défaut (`emailFrom`), et deux adresses par catégorie (`emailFromBilling`, `emailFromSupport`, cf. `lib/email-categories.ts`) — l'adresse d'envoi décide de l'endroit où atterrissent les réponses. Laissées vides, les gabarits de ces catégories repartent de l'adresse par défaut.

### Comportement en cas d'indisponibilité

- Erreur envoi email → log serveur.
- L'utilisateur voit un message d'erreur lors du checkout (si Resend est down au moment du paiement webhook).
- **Fallback** : les emails non envoyés ne sont pas retriggered automatiquement ; il faut un cron de retentative (non implémenté actuellement).

### Piège : template emails

Les 15 gabarits d'e-mail sont **codés en dur** dans `lib/email-template-defaults.ts` (blocs sectionlabel, textcard, récap/total/boutons, variables `{{placeholder}}`). Il n'y a **pas d'édition WYSIWYG en DB** — seuls les toggles activé/désactivé persistent (`Settings.emailsEnabled`).

**Conséquence** : pour modifier un template (ex: changer le texte du rappel J-2), il faut modifier le fichier source et redéployer (pas d'interface admin pour le contenu).

---

## Piège global : CSP (Content Security Policy)

:::warning Piège : la CSP n'est active qu'en production
Un domaine externe absent de `connect-src` ne provoque aucune erreur avec `npm run dev` (dev server sans CSP). Toute nouvelle intégration doit être testée avec un build de production local avant déploiement.

Pour tester localement :
```bash
npm run build
npm run start
```
Puis vérifier les requêtes réseau dans les DevTools — un blocage CSP apparaît comme erreur `net::ERR_BLOCKED_BY_CLIENT` ou message console.
:::
