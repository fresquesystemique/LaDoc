---
id: pieges
title: Pièges connus
sidebar_position: 6
---

# Pièges connus

Chaque piège est présenté sous la forme : **symptôme observé** → **cause** → **ce qu'il faut faire**.

## 1. Administrateurs avec `role='formateur'`, pas `role='admin'`

**Symptôme** : un utilisateur administrateur peut voir le menu `/admin`, mais un `if (session.user.role === 'admin')` échoue à lui donner accès.

**Cause** : les administrateurs sont créés avec `isAdmin=true` mais `role='formateur'` (pour des raisons de modèle de données). Tester le `role` seul ne suffit pas.

**Ce qu'il faut faire** : toujours vérifier `session.user.isAdmin`, jamais `session.user.role === 'admin'`. Voir [LeHub - Permissions](/lehub/fonctionnalites.md#les-rôles-et-ce-quils-peuvent-faire).

```typescript
// ❌ MAUVAIS
if (session.user.role === 'admin') { /* ... */ }

// ✅ BON
if (session.user.isAdmin) { /* ... */ }
```

## 2. Adhérents exclus du Hub, accès minimum = animateur

**Symptôme** : un utilisateur marqué comme `role='adhérent'` reçoit une redirection `/login` ou une erreur 403 sur toutes les pages du Hub.

**Cause** : les adhérents n'ont pas accès au Hub ; l'accès minimum requis est animateur. Le Hub est réservé aux animateurs, formateurs et administrateurs.

**Ce qu'il faut faire** : lors de la création ou l'assignation d'un rôle, assigner au minimum `role='animateur'` pour accéder au Hub. Voir [LeHub - Présentation](/lehub/fonctionnalites.md#les-rôles-et-ce-quils-peuvent-faire).

## 3. `hasProHabilitation()` exige ses trois arguments

**Symptôme** : une fonction retourne silencieusement `false` alors qu'elle devrait retourner `true`; l'utilisateur perd accès à une fonctionnalité qu'il devrait avoir (rapport d'utilisation professionnelle, par exemple).

**Cause** : la fonction `hasProHabilitation(habilitationAnimation, cotisationStatus, cotisationExpiry)` (dans `lib/permissions.ts`) n'a **pas de valeurs par défaut**. Un appel avec seulement 2 arguments retourne `false` en silence (le 3ème argument est `undefined`).

**Ce qu'il faut faire** : fournir tous les trois arguments. Voir [LeHub - Développement](/lehub/developpement.md#1-hasprohabilitation-exige-ses-3-arguments).

```typescript
// ❌ MAUVAIS — retourne false sans erreur TypeScript
hasProHabilitation(member.habilitationAnimation, member.cotisationStatus)

// ✅ BON
hasProHabilitation(
  member.habilitationAnimation,
  member.cotisationStatus,
  member.cotisationExpiry
)
```

## 4. Responsable d'un atelier = animateur principal, pas créateur

**Symptôme** : un atelier importé de Pretix a `createdById=null`, mais le code suppose que le créateur est l'animateur responsable et casse.

**Cause** : sur les imports massifs (Pretix), le `createdById` n'existe pas (c'est null). Le modèle Prisma a `createdBy Member? @relation(fields: [createdById], references: [id])` avec `createdById String?`, donc nullable. Le responsable **réel** d'un atelier est son **animateur principal** (`WorkshopAnimator` avec `role='lead'`), pas son créateur.

**Ce qu'il faut faire** : pour identifier le responsable d'un atelier, chercher le `WorkshopAnimator` avec `role='lead'`, pas utiliser `createdById`. Voir [LeHub - Fonctionnalités](/lehub/fonctionnalites.md#parcours--un-animateur-crée-et-anime-un-atelier).

## 5. Nom du cookie de session dupliqué à trois endroits

**Symptôme** : le cookie session LeHub n'est pas reconnu par LeSite ou LeBoard; la session ne se propage pas entre les apps.

**Cause** : le nom du cookie session (`__Secure-fresque.session-token` par défaut) est codé en dur dans **trois fichiers distincts** : `LeHub/lib/auth.ts`, `LeSite/lib/hub-auth.ts`, et `LeBoard/server/auth.ts`. Modifier le nom dans un seul endroit ne synchronise pas les trois.

**Ce qu'il faut faire** : après changement du nom du cookie, mettre à jour **tous les trois fichiers** en même temps, sinon le pont d'authentification casse. Voir [LeHub - Environnements](/si/environnements.md#urls-codées-en-dur).

## 6. CSP (Content-Security-Policy) active en production seulement

**Symptôme** : un appel API vers un domaine externe fonctionne pendant `npm run dev` en local, mais échoue silencieusement en production avec une erreur CSP dans la console navigateur.

**Cause** : la CSP (policy `connect-src`) n'est active qu'en production. En dev (`npm run dev`), la CSP n'est pas appliquée, donc les appels externes passent. En prod (build standalone), la CSP est active et bloque tout domaine non listé.

**Ce qu'il faut faire** : tester les appels externes avec un build production local :

```bash
npm run build
npm run start
# Puis vérifier la console DevTools pour les erreurs CSP
```

Puis ajouter le domaine à la CSP dans la configuration (voir chaque application pour le fichier CSP). Voir [LeHub - Développement](/lehub/developpement.md#8-csp-en-prod-seulement).

## 7. Cascade CSS : un reset non-layé bat les utilitaires Tailwind layés

**Symptôme** : les utilitaires Tailwind (`mx-auto`, `px-4`, `mb-16`, etc.) disparaissent silencieusement; le contenu s'affiche collé aux bords sans marge/padding.

**Cause** : en cas de cohabitation entre du CSS maison legacy (non-`@layer`) et Tailwind v4/shadcn (dont les utilitaires vivent dans des `@layer`), une règle universelle non scopée (`*, *::before, *::after { margin: 0; padding: 0; }`) neutralise TOUS les utilitaires Tailwind de marge/padding, même les nouveaux composants shadcn.

Par la spec CSS Cascade Layers, une règle non-layée gagne toujours sur une règle layée pour la même propriété/élément.

**Ce qu'il faut faire** : scoper les resets CSS legacy aux seules classes/éléments concernés (ex: `.legacy-reset *`), et laisser Tailwind gérer le reset natif (`@import "tailwindcss"`). Ne pas mettre de règle universelle non-layée en cohabitation avec Tailwind layé.

## 8. Filtrer par statut de paiement « payé » cache les inscrits d'un atelier annulé

**Symptôme** : la table des inscrits d'un atelier annulé est vide; aucun inscrit n'apparaît, y compris ceux qui ont payé.

**Cause** : le code compte les inscrits en filtrant sur `paymentStatus: 'paid'`, ce qui exclut les inscrits d'ateliers annulés dont le statut n'est pas `'paid'` (ex: `'pending'`, `'refunded'`). Quand un atelier est annulé, les inscriptions ne changent pas de statut de paiement, mais la logique métier suppose que tous les inscrits visibles ont payé.

**Ce qu'il faut faire** : au lieu de filtrer sur `paymentStatus: 'paid'`, inclure aussi les inscrits annulés selon le contexte (atelier annulé? afficher tous les inscrits peu importe le statut de paiement). Voir le modèle de données `Workshop` et `Registration` pour les transitions de statut.

## 9. Cache bitmap Konva et flou au zoom

**Symptôme** : au zoom avant sur une carte LeBoard, la carte apparaît floue ou pixelisée, même avec une image haute résolution.

**Cause** : Konva.js cache le rendu de la carte dans un bitmap interne lors du premier rendu. Ce bitmap n'est pas recalculé lors du zoom (seule la resolution de l'écran est prise en compte). Le zoom mathématique amplifie le bitmap cache, d'où le flou.

**Ce qu'il faut faire** : ne pas relever la résolution du bitmap, ni essayer de refondre l'image. Le piège est connu et accepté : les cartes sont lisibles à la résolution de l'écran, et le zoom est pour la navigation, pas l'inspection fine. Une alternative serait de rendre les cartes en SVG ou en Canvas brut (non-Konva), mais ce serait une refonte majeure.

## 10. CI/CD présent sur les trois apps : ne pas déployer aussi à la main

**Symptôme** : après un déploiement manuel pendant que le CI/CD est en cours, des erreurs Docker, des conflits d'images ou des conteneurs qui ne convergent pas.

**Cause** : les trois applications (LeHub, LeSite, LeBoard) ont un CI/CD GitHub Actions qui redéploie automatiquement sur chaque push vers la branche de production (LeHub: `main`, LeBoard: `master`, LeSite: `main`). Si on redéploie **aussi** à la main pendant ce temps, les deux processus se marching sur les pieds (build image simultanés, conteneur redémarrés deux fois, état incohérent).

**Ce qu'il faut faire** : faire confiance au CI/CD. Un seul déploiement à la fois : soit le CI/CD automatique, soit manuel, pas les deux. Voir [LeHub - Déploiement](/lehub/deploiement.md), [LeSite - Déploiement](/lesite/deploiement.md), [LeBoard - Déploiement](/leboard/deploiement.md).

## 11. Uploads servis par Nginx, rechargement requis

**Symptôme** : une nouvelle image d'upload sur LeHub apparaît en production, mais l'image ne s'affiche pas (erreur 404 ou cache stale).

**Cause** : les fichiers d'upload sont servis par Nginx directement depuis le système de fichiers de l'hôte via un alias. Quand une nouvelle image est créée, elle doit être visible immédiatement via le chemin `/uploads/...`. Mais si la configuration Nginx n'a pas été rechargée après l'ajout du fichier, le cache interne Nginx peut servir une réponse stale.

**Ce qu'il faut faire** : après l'upload d'un fichier, vérifier qu'il apparaît bien en production. Si non, un rechargement Nginx est nécessaire (voir LeRunbook). Les chemins exacts et la procédure sont dans LeRunbook.

Voir aussi [Infrastructure](/si/infrastructure.md#serveur-web-nginx-hôte).

## 12. Webhook de paiement perdu : un rattrapage quotidien existe

**Symptôme** : une inscription avec paiement effectué reste en `paymentStatus='pending'` des heures ou des jours après le paiement HelloAsso.

**Cause** : le webhook HelloAsso → LeHub peut se perdre ou échouer pour diverses raisons (timeout réseau, erreur serveur transitoire, retry HelloAsso expiré). L'inscription reste alors en `pending` indéfiniment sans email de confirmation.

**Ce qu'il faut faire** : un job cron quotidien existe pour rattraper ces cas (voir LeRunbook). Il interroge HelloAsso directement par les `checkoutIntentId` enregistrés, trouve les ordres payés mais non confirmés en DB, et bascule les registrations en `paid` avec email de confirmation rétroactif. Ce job s'exécute automatiquement; il n'y a aucune intervention manuelle requise.

Voir aussi [LeHub - Fonctionnalités](/lehub/fonctionnalites.md#parcours--un-participant-sinscrit-et-paie) et [LeHub - Intégrations](/lehub/integrations.md#helloasso-paiements).

## 13. Catalogue de plateaux dupliqué en dur entre LeBoard et LeHub

**Symptôme** : un plateau ajouté ou modifié d'un côté ne se comporte pas de la même façon dans l'autre application. Cartes mal placées, étapes manquantes, erreurs à la distribution des lots.

**Cause** : le catalogue de plateaux (étapes, matrices, identifiants de cartes) est codé en dur dans un fichier source, et ce fichier est **dupliqué dans les deux dépôts** : `src/lib/plateaux.ts` côté LeBoard, `lib/plateaux.ts` côté LeHub. Les chemins diffèrent, ce qui rend la duplication facile à manquer. Rien ne garantit la synchronisation, elle repose entièrement sur la discipline de celui qui modifie le catalogue.

La divergence n'est pas théorique : au 20 juillet 2026, la copie de LeHub porte une fonction `listPlateaux()` absente de celle de LeBoard. L'écart est aujourd'hui sans effet, puisqu'il s'agit d'un utilitaire de lecture, mais il montre que la synchronisation manuelle a déjà lâché au moins une fois.

**Ce qu'il faut faire** : à chaque modification du catalogue, répliquer le changement dans les deux dépôts et vérifier avec `diff LeBoard/src/lib/plateaux.ts LeHub/lib/plateaux.ts`. À terme, une source unique éliminerait le problème plutôt que de le surveiller.

Voir aussi [LeBoard - Architecture](/leboard/architecture).

## 14. Port du serveur temps réel de LeBoard incohérent dans le fichier d'exemple

**Symptôme** : en développement local, le plateau s'affiche mais ne se synchronise pas. Les autres participants ne voient rien bouger, sans message d'erreur explicite.

**Cause** : Socket.io n'a pas de serveur ni de port distinct, il est attaché au serveur HTTP de Next.js et écoute donc sur la variable `PORT`, valant 3000 par défaut. Or le fichier `.env.example` de LeBoard déclarait `PORT=3000` et `NEXT_PUBLIC_SOCKET_URL=http://localhost:3001` : qui copiait ce fichier tel quel obtenait une URL de socket pointant sur un port où rien n'écoute.

Le fichier d'exemple a été corrigé le 20 juillet 2026, mais un poste de développement configuré avant cette date garde la mauvaise valeur dans son `.env.local`.

**Ce qu'il faut faire** : vérifier que `NEXT_PUBLIC_SOCKET_URL` pointe bien sur le même port que `PORT`.

Voir aussi [LeBoard - Développement](/leboard/developpement).

## 15. Un changement de rôle ne prend effet qu'à la reconnexion

**Symptôme** : un administrateur promeut un membre d'animateur à formateur dans `/admin/members`, et rien ne change pour l'intéressé. Il ne voit toujours pas les fonctions réservées aux formateurs, par exemple le sélecteur « Formation à l'animation » dans « Planifier un événement ». Aucun message d'erreur n'oriente vers la cause : la page s'ouvre normalement, seule l'option manque.

**Cause** : la session est un jeton JWT, et `token.role` n'est écrit qu'à la connexion, dans le callback `jwt` de `lib/auth.ts`, quand l'objet `user` est présent. Aux requêtes suivantes le jeton est réutilisé tel quel, sans jamais être relu depuis la base. Le rôle porté par la session est donc celui qu'avait le membre au moment de sa dernière connexion.

La durée de vie du jeton est de 30 jours avec « se souvenir de moi », 1 heure sinon. L'écart entre la base et la session peut donc durer un mois.

Le même raisonnement vaut pour les autres champs figés dans le jeton au moment de la connexion : `isAdmin`, `habilitationAnimation` et `habilitationFormation`. Un changement d'habilitation ne se voit pas davantage tant que la personne ne s'est pas reconnectée.

**Ce qu'il faut faire** : demander à la personne de se déconnecter puis de se reconnecter. C'est le seul moyen aujourd'hui de propager un changement de rôle ou d'habilitation.

Au moment du diagnostic, aucun mécanisme de rafraîchissement n'existe. Le corriger suppose de relire le membre en base dans le callback `jwt`, ce qui ajoute une requête par requête authentifiée : un compromis à arbitrer, pas une évidence.

Voir aussi [LeHub - Architecture](/lehub/architecture) et [LeHub - Fonctionnalités](/lehub/fonctionnalites).

## 16. Un type d'événement sans politique tarifaire sort à 0 €

**Symptôme** : un événement créé avec le type « Formation à l'animation » affiche trois tarifs à 0 €, sans avertissement. Publié tel quel avec l'inscription ouverte, il est gratuit.

**Cause** : les tarifs recommandés viennent de la table `PricingPolicy`, cherchée par le couple `eventType` et `publicType`. Quand aucune ligne ne correspond, le code retombe sur `?? 0` et propose zéro plutôt que de signaler l'absence de politique. Au 20 juillet 2026, la table ne contient qu'une seule ligne, `atelier / grand_public` : tout autre couple, dont `formation / grand_public`, produit donc des tarifs nuls.

Les trois formations présentes en base à cette date sont toutes enregistrées à 0 €.

**Ce qu'il faut faire** : avant d'ouvrir un nouveau type d'événement à l'inscription, vérifier qu'une ligne `PricingPolicy` existe pour le couple `eventType` et `publicType` visé. Les tarifs restent saisissables à la main dans le formulaire, mais rien ne rappelle de le faire.

Voir aussi [LeHub - Modèle de données](/lehub/donnees).
