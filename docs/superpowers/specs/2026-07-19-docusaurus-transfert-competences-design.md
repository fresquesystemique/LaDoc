# Refonte LaDoc : Docusaurus + documentation de transfert de compétences

Date : 2026-07-19 — validé par Raphaël sur Telegram le soir même.

## Contexte et objectif

docs.fresquesystemique.org tourne sur Hugo + thème Book (22 fichiers markdown, ~10 000 mots). L'architecture actuelle ne convient plus : pas assez claire, pas assez détaillée sur les chemins de fichiers, les données et les flux.

Objectif : une documentation à visée de **transfert de compétences** — un successeur (développeur, travaillant probablement lui aussi avec l'IA) doit pouvoir reprendre le SI de La Fresque Systémique sans Raphaël. Publication des v1 le soir même, itérations ensuite.

Préalable réalisé avant ce chantier : LeHub, LeSite et LeBoard ont été transférés dans l'organisation GitHub `fresquesystemique` avec une release v1.0.0 chacun. LaDoc reste chez `raphaeldeux`.

## Décisions structurantes (validées)

1. **Option A — split public/privé** : le site public reste la vitrine open source (architecture, fonctionnalités, données, pièges anonymisés). Tout le sensible (accès, IP, ports, secrets, procédures serveur) va dans un **repo GitHub privé dédié `LeRunbook`**.
2. **Docusaurus remplace Hugo dans le repo LaDoc** (pas de nouveau repo) : historique git conservé, même principe de déploiement (build → rsync vers `/var/www/ladoc`). Hugo est retiré (« OFF »), son contenu migré et enrichi.
3. **Refonte de l'architecture de l'information**, pas une simple migration : beaucoup plus précis sur les chemins d'accès, les modèles de données, les flux.

## Architecture de l'information — site public (Docusaurus)

**Accueil** : vue d'ensemble du SI, schéma global Mermaid (Hub ↔ Site ↔ Board, HelloAsso, VPS, qui parle à qui).

**Par outil (LeHub, LeSite, LeBoard), 7 pages :**
1. Présentation & fonctionnalités — organisées par parcours utilisateur
2. Architecture technique — stack, structure du repo avec chemins précis (routes, composants, API, libs : où vit quoi)
3. Modèle de données — généré depuis le `schema.prisma` réel : chaque modèle, ses champs, ses relations, son rôle métier
4. Flux critiques — pas à pas : inscription + paiement + webhook HelloAsso, annulation/remboursement, badges, crons, modération…
5. Intégrations externes — HelloAsso, BAN (api-adresse), Telegram, Backblaze B2, Plausible
6. Développement local — environnements dev.hub/dev.board, pièges de dev (CSP prod-only, etc.)
7. Déploiement — CI/CD de chaque app, comment vérifier qu'un deploy est passé

**Section SI transverse** : infrastructure (anonymisée : ni IP ni ports), monitoring, principe des sauvegardes, environnements, page « Pièges connus » (les ~20 gotchas accumulés, version anonymisée).

## LeRunbook (repo privé)

- Tous les accès : VPS, DNS, GitHub (org fresquesystemique), HelloAsso, Backblaze, bots Telegram, emplacement des `.env`
- Procédures opérationnelles : déployer, restaurer un backup, réagir à une alerte monitoring, certificats, nginx
- Détails sensibles : IP, ports, chemins serveur, crontabs
- Checklist « premier jour du successeur »

## Choix techniques

- Docusaurus (preset classic), français uniquement, recherche locale intégrée, schémas Mermaid
- Build → rsync `/var/www/ladoc` (adapter `deploy.sh` ; nginx inchangé)
- Pas de versioning Docusaurus ni d'i18n pour l'instant (YAGNI)
- Contenu Hugo migré ET enrichi depuis le code réel — pas de copier-coller paresseux

## Périmètre du soir (v1)

Structure complète + contenu détaillé pour les 3 outils + section SI + LeRunbook v1, publié sur docs.fresquesystemique.org. Hors périmètre : i18n, versioning, doc ligne à ligne du code, deuxième instance Docusaurus privée (option B rejetée).
