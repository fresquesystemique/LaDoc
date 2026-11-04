---
id: pieges
title: Pièges connus
sidebar_position: 6
---

# Pièges connus

Chaque piège est présenté sous la forme : **symptôme observé** → **cause** → **ce qu'il faut faire**.

Trente-cinq pièges, dont le point commun est d'échouer **en silence** : presque aucun ne lève d'erreur. Un run vert qui n'a rien déployé, une classe CSS absente du build, une image refusée sans trace, une fonction qui renvoie `false` faute d'un argument, un secret qui a dérivé d'un dépôt à l'autre. C'est la raison d'être de cette page : ils ne se trouvent pas en lisant les logs.

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

## 5. Nom du cookie de session dupliqué entre LeHub et LeSite

**Symptôme** : un administrateur connecté au Hub est traité comme un visiteur anonyme par LeSite — il tombe sur la page chantier et n'a pas de menu compte.

**Cause** : le nom du cookie de session (`__Secure-fresque.session-token` par défaut, surchargeable par `AUTH_SESSION_COOKIE_NAME`) est écrit dans **deux fichiers** : `LeHub/lib/auth.ts` et `LeSite/lib/hub-session.ts`. S'ils divergent, LeSite transmet un en-tête vide au Hub, qui répond « personne ». Aucune erreur n'est levée.

**Ce qu'il faut faire** : changer les deux ensemble.

:::note Ce piège a changé de forme en 2026
Il concernait trois fichiers, dont le middleware de LeSite. Celui-ci importe maintenant la valeur depuis `hub-session.ts`, et LeBoard n'utilise pas ce cookie du tout (son SSO animateur passe par un jeton signé). Plus important : **LeSite ne déchiffre plus le cookie**. Il le transmet au Hub, parce que partager le `NEXTAUTH_SECRET` donnait au composant public le pouvoir de forger une session administrateur. Ne pas réintroduire de déchiffrement local.
:::

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

## 17. Prisma 7 : un champ « inexistant » alors que la migration est passée

**Symptôme** : après un `git pull`, le code se plaint qu'un champ n'existe pas sur un modèle, alors que la migration est bien appliquée en base et que le schéma le déclare.

**Cause** : depuis Prisma 7 (octobre 2026), le client n'est plus généré dans `node_modules/.prisma` mais dans **`generated/prisma`**, dossier ignoré par git. Un `git pull` apporte donc le schéma, mais pas le client qui va avec.

**Ce qu'il faut faire** : lancer `npx prisma generate` après tout pull qui touche un schéma. C'est aussi pour cette raison que le déploiement de LeHub exécute `npm ci` puis `prisma generate` **sur l'hôte** : les crons de l'hôte tournent avec ce client généré, pas avec celui du conteneur.

Voir aussi [LeHub - Architecture](/lehub/architecture) et [LeBoard - Modèle de données](/leboard/donnees).

## 18. Un run GitHub vert ne prouve pas un déploiement

**Symptôme** : le workflow est vert, le commit est sur la branche, et la production affiche toujours l'ancienne version.

**Cause** : l'action SSH exécute un script shell. Sans `set -e`, une commande en échec au milieu du script n'arrêtait rien : la suite s'exécutait, `docker compose up -d` redémarrait l'**ancienne** image, le reload Nginx final réussissait, et le run passait au vert. Constaté sur LeSite le 6 septembre 2026.

**Ce qu'il faut faire** : les trois workflows commencent désormais par `set -e`. Mais la vérification fiable reste la même : regarder **l'âge du conteneur et de l'image**, pas la couleur du run. Depuis l'extérieur, sonder la page modifiée. Et attention, `gh` n'est pas installé sur le VPS : on ne suit pas un déploiement avec `gh run watch` depuis là.

## 19. Deux déploiements rapprochés verrouillent containerd

**Symptôme** : un déploiement échoue avec une erreur Docker obscure, alors que rien n'a changé dans le projet.

**Cause** : deux builds Docker concurrents sur le même VPS. Constaté en juillet 2026 en poussant deux projets de la Fresque coup sur coup.

**Ce qu'il faut faire** : espacer les déploiements, ou relancer le run échoué une fois le premier terminé. Et quand un chantier touche plusieurs applications, respecter l'ordre : **le Hub d'abord**, parce que LeSite consomme son API publique et que LeBoard lit ses versions de cartes et relaie ses images de diapositives.

## 20. Une classe Tailwind absente du CSS de production

**Symptôme** : un style appliqué en développement disparaît en production. L'élément n'a aucune règle, et la classe est pourtant bien dans le HTML.

**Cause** : Tailwind v4 ne génère que les classes qu'il **voit écrites** dans les sources. Deux cas passent la revue de code :

1. une classe arbitraire calculée, comme `h-[calc(100vh-var(--spacing-header))]` ;
2. une classe **composée à l'exécution**, comme `` `text-${size}` `` — jamais générée, puisqu'elle n'existe pas dans le code source.

**Ce qu'il faut faire** : chercher le motif dans `.next/static/*.css` après un build. Si la règle n'y est pas, écrire la classe en entier ou passer par un token CSS. Constaté sur LeSite le 6 septembre 2026.

## 21. Aucune police personnalisée ne s'applique

**Symptôme** : le site s'affiche avec la police système, alors que `next/font` est bien configuré.

**Cause** : avec `next/font` et Tailwind v4, les variables de police doivent être posées sur la balise `<html>`. Placées plus bas dans l'arbre, elles ne sont pas vues par les utilitaires de police.

**Ce qu'il faut faire** : poser les variables sur `<html>`. Corrigé sur LeSite le 31 août 2026 ; LeHub était encore concerné à cette date.

## 22. Une image distante refusée sans aucune trace

**Symptôme** : les images de diapositives ont disparu des ateliers en ligne. Aucune erreur serveur, rien dans les journaux. Six semaines sans que la cause soit identifiée.

**Cause** : la politique de sécurité du contenu de LeBoard n'accepte que `img-src 'self'`, alors que les données de lot portaient une URL absolue vers le domaine du Hub. Le navigateur refuse l'image en silence.

**Ce qu'il faut faire** : les images passent par un relais de LeBoard (`/api/uploads/[...path]`), et les données de lot portent un **chemin relatif**. Plus généralement : toute nouvelle ressource distante exige soit un relais, soit une modification explicite de la politique — et une politique ne se teste pas en développement sur LeHub, où elle n'est active qu'en production (voir piège 6).

## 23. Le référencement ne bouge pas, ou pas tout de suite

**Symptôme** : un titre SEO modifié dans le Hub n'apparaît pas sur LeSite ; ou le tableau `/admin/seo` affiche un bandeau d'indisponibilité au lieu de la liste des pages.

**Cause** : trois mécanismes distincts, à ne pas confondre.

1. **Hub → LeSite** : LeSite lit `/api/public/seo` et met le résultat en cache 300 secondes sous le tag `seo-meta`. Le Hub invalide ce tag à l'enregistrement, mais le profil de cache applique une sémantique *stale-while-revalidate* : la **toute première** visite après l'enregistrement peut encore afficher l'ancienne valeur, la suivante aura la nouvelle.
2. **LeSite → Hub** : le tableau `/admin/seo` demande à LeSite son inventaire de routes, avec l'en-tête `x-seo-crawler`. Sans `LESITE_URL` ni `SEO_CRAWLER_SECRET` côté Hub, il ne peut pas la lire.
3. **Indexation** : rien n'est indexable tant que `seoIndexingEnabled` est à `false` côté Hub, quelle que soit la page.

**Ce qu'il faut faire** : identifier lequel des trois est en cause avant de chercher plus loin. Et se souvenir qu'une URL renommée côté LeSite laisse sa ligne `SeoMeta` **orpheline** : le rapprochement se fait par le chemin de page, pas par un identifiant.

## 24. `npx jest` échoue là où `npm test` passe

**Symptôme** : trois suites de tests SEO de LeHub échouent avec « Test suite failed to run », alors que le code est bon (37 tests ne sont jamais exécutés).

**Cause** : `npm test` passe `NODE_OPTIONS="--experimental-vm-modules"`, indispensable parce que `yoastseo` tire `parse5` en ESM. C'est aussi pourquoi la barrière de qualité en CI tourne sur Node 24 alors que la production est sur Node 22.

**Ce qu'il faut faire** : toujours `npm test`. Ne pas conclure à une régression sur la base d'un `npx jest`.

## 25. Une page « couldn't load » sans trace serveur

**Symptôme** : une page de LeHub refuse de se charger, avec un message générique et rien d'utile côté serveur.

**Cause** : un composant marqué `'use client'` importe `lib/prisma`, directement ou via un module qui en dépend.

**Ce qu'il faut faire** : garder les modules partagés avec le client « purs ». `lib/eligibility.ts`, `lib/organisation-options.ts`, `lib/vat.ts` et `lib/price-tiers.ts` le sont volontairement, et leurs en-têtes le disent : ne jamais y ajouter d'import Prisma. Incident du 11 octobre 2026, couvert depuis par un test de garde.

## 26. `git stash --include-untracked` détruit les uploads de production

**Symptôme** : les images d'articles et les avatars disparaissent du site après une manipulation git sur le serveur.

**Cause** : les fichiers déposés par les utilisateurs vivent dans `public/uploads/` de LeHub, dossier **non suivi par git**. Un `git stash --include-untracked` les emporte, et un `stash drop` les rend très difficiles à récupérer — il faut aller chercher le troisième parent du commit de stash (`<sha>^3`).

**Ce qu'il faut faire** : ne jamais stasher avec `--include-untracked` dans un dépôt qui porte des données de production. Les uploads sont sauvegardés chaque nuit, mais une journée de dépôts peut manquer.

## 27. Purger des données de test en filtrant sur l'e-mail seul

**Symptôme** : une purge SQL supprime plus de lignes que prévu. Neuf pour six visées, en septembre 2026.

**Cause** : la même adresse e-mail sert sur plusieurs ateliers. Filtrer sur l'adresse seule attrape des inscriptions réelles.

**Ce qu'il faut faire** : croiser l'identifiant (`workshopId`, ou les `id` des lignes) **et** l'adresse, compter les lignes avant de supprimer, et préférer un `SELECT` de contrôle à un `DELETE` optimiste.

## 28. Un `curl` tronqué fait croire à une page cassée

**Symptôme** : une vérification en production semble montrer une page vide ou incomplète, alors que le navigateur l'affiche correctement.

**Cause** : sur ce VPS, `curl > fichier` et `curl | grep` tronquent la réponse à 201 octets.

**Ce qu'il faut faire** : utiliser `curl -o fichier`, puis lire le fichier. Constaté le 1er septembre 2026, après un faux négatif de vérification de production.

## 29. « Une erreur est survenue » juste après une mise en ligne

**Symptôme** : un visiteur signale une page d'erreur immédiatement après un déploiement, et le bouton « Réessayer » ne change rien.

**Cause** : son onglet était ouvert avant la mise en ligne. Il fait tourner l'ancienne version, et le premier fichier qu'il réclame à la volée n'existe plus sur le serveur. Seul un rechargement complet récupère la nouvelle version.

**Ce qu'il faut faire** : rien, sur LeSite — il se recharge désormais tout seul une fois (`lib/stale-build.ts`, branché sur les écrans d'erreur, avec un horodatage pour ne pas boucler). Sur les autres applications, demander un rechargement complet.

## 30. Écrire que l'association est certifiée Qualiopi

**Symptôme** : une mention « La Fresque Systémique est certifiée Qualiopi » sur un support public.

**Cause** : le certificat couvre **KAIROS Accompagnement & Recherches**, l'organisme de formation d'une co-fondatrice, pas l'association.

**Ce qu'il faut faire** : ne jamais attribuer la certification à l'association, et ne pas sortir le logo du composant prévu pour cela. Les valeurs exactes du certificat sont dans `lib/qualiopi.ts` de LeSite, recopiées sur le document officiel, et ne doivent pas être paraphrasées.

## 31. Recalculer la TVA au lieu d'afficher la mention servie

**Symptôme** : un montant affiché ne correspond pas à ce qui est encaissé, ou une mention de TVA contradictoire apparaît sur un document.

**Cause** : l'association est assujettie à la TVA mais bénéficie de la **franchise en base** (art. 293 B du CGI) : elle ne la collecte pas et ne la récupère pas. Le réglage `Settings.tvaApplicable` porte cette décision, et `Settings.vatRate` ne décrit que le taux qui s'appliquerait si la franchise sautait.

**Ce qu'il faut faire** : tout calcul ou affichage de prix passe par `lib/vat.ts` côté Hub, seul endroit qui tranche. LeSite affiche la `vatMention` reçue telle quelle, sans rejouer la règle. Et les montants stockés sont **HT** : le TTC se calcule au centime, un arrondi à l'euro a déjà fait payer 1,20 € un billet annoncé à 1 € TTC.

## 32. Ajouter une page publique sans l'inscrire au registre

**Symptôme** : une nouvelle page de LeSite affiche un libellé bricolé dans le fil d'Ariane (« Cgu »), n'apparaît pas au sitemap, et n'est pas proposée dans l'éditeur SEO du Hub.

**Cause** : `lib/public-routes.ts` est l'inventaire **tenu à la main** des pages publiques, et la source unique de tous les noms d'une page. L'introspection du système de fichiers n'est pas fiable dans un build `standalone`, d'où cet inventaire explicite.

**Ce qu'il faut faire** : ajouter une ligne au registre en même temps que la page, avec son indexabilité et son mode de fil d'Ariane. Un test (`tests/routes-completeness.test.ts`) échoue si une page de `app/` n'y figure pas — à condition de lancer les tests, puisque le workflow de LeSite ne le fait pas.

## 33. Trois pièges du VPS lors d'un déploiement

**Symptôme** : un déploiement échoue au milieu, ou une page part en erreur de script après un correctif de sécurité.

**Causes**, identifiées lors des audits cyber de septembre 2026 :

1. **Le build se fait dans le dossier de travail du dépôt** sur le serveur : un disque presque plein ou un dossier laissé dans un état intermédiaire fait échouer le build.
2. **Lancer `apt` pendant un déploiement** : les deux se disputent les mêmes verrous.
3. **Le nonce de la politique de sécurité** : une politique à nonce force le rendu dynamique, ce qui coûterait l'ISR à LeSite. C'est pourquoi `'unsafe-inline'` y est un choix assumé pour les scripts d'amorçage de Next, et non un oubli.

**Ce qu'il faut faire** : vérifier l'espace disque avant un déploiement, ne jamais paralléliser avec une mise à jour système, et ne pas « durcir » la politique de LeSite sans mesurer ce que le nonce coûte au cache.

## 34. Les diapositives disparaissent parce qu'un compte Google a changé

**Symptôme** : l'éditeur de version de cartes n'affiche plus la liste des présentations, ou les diapositives cessent d'apparaître en atelier. Rien ne change dans le code, aucun déploiement récent.

**Cause** : LeHub lit Google Slides avec un **jeton de rafraîchissement OAuth** obtenu une fois pour toutes, rattaché à un compte Google qui a accès aux présentations. Un compte supprimé, un accès au Drive retiré, un mot de passe changé avec révocation des applications, et le jeton meurt. Le symptôme côté interface est un bandeau d'échec de chargement, pas un message explicite.

**Ce qu'il faut faire** : rejouer le script d'autorisation (`scripts/google-slides-oauth.ts`) pour obtenir un nouveau jeton, et le poser dans la configuration. Redéployer ne sert à rien. À plus long terme, ne pas faire reposer ce jeton sur le compte personnel d'une seule personne.

Voir aussi [Les outils de l'association](/si/outils) et [LeHub — Intégrations](/lehub/integrations).

## 35. Un enregistrement DNS « inutile » retiré casse les e-mails ou un certificat

**Symptôme** : les confirmations d'inscription cessent d'arriver, ou partent en indésirable, alors que le Hub considère chaque envoi comme réussi. Variante déjà vécue : un certificat qui ne se renouvelle plus.

**Cause** : le domaine porte des enregistrements dont aucun humain ne se sert directement, et qui sont pourtant indispensables.

- La clé **DKIM** de Resend signe les e-mails des applications au nom de l'apex. C'est elle qui aligne ces messages avec la politique DMARC du domaine (`p=quarantine`), car le SPF de l'apex n'autorise que Google.
- Le sous-domaine **`send.`** porte le chemin de retour des e-mails transactionnels. Aucune boîte n'y est hébergée, ce qui le fait passer pour un résidu.
- À l'inverse, un nom **résiduel** peut nuire : le certificat de l'instance Plausible nommait encore un sous-domaine dont le DNS avait été supprimé, et son renouvellement échouait en silence (corrigé le 28 août 2026).

**Ce qu'il faut faire** : avant de retirer un enregistrement, chercher qui s'en sert — l'envoi d'e-mails, un certificat, une vérification de propriété de domaine. Et quand on supprime un sous-domaine, le retirer **aussi** des certificats qui le nomment.

Voir aussi [Les outils de l'association](/si/outils#la-chaîne-e-mail--deux-chemins-pour-un-seul-domaine).
