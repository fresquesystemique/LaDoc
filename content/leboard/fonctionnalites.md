---
title: Fonctionnalités
weight: 1
---

# Fonctionnalités

## Le plateau

- **Canvas infini** : zoom à la molette ou au pincement, déplacement au glisser. Chacun navigue librement sur le plateau.
- **283 cartes recto/verso** : glisser-déposer, clic pour retourner, visualiseur plein écran avec zoom pour lire confortablement une carte.
- **Post-its** : notes libres, redimensionnables, avec choix de couleur et de taille de police.
- **Flèches** : outil dédié pour tracer les liens entre cartes et post-its, avec plusieurs couleurs et styles, dans les deux sens. C'est le cœur de l'exercice systémique.
- **Minimap** : vue d'ensemble du plateau, avec les zones de matrices affichées en pointillés pour se repérer sans perdre le fil.
- **Annuler / refaire** : Ctrl+Z / Ctrl+Y. L'animateur·ice dispose d'un historique global (partagé), chaque participant d'un historique personnel sur ses propres actions.

## Étapes et matrices

Un atelier avance par étapes (Introduction, Les grands systèmes, Le système A, etc.). Certaines étapes portent une matrice : une grille de cellules, en colonnes et lignes, dans laquelle les cartes d'un lot s'aimantent automatiquement au slot libre le plus proche dès qu'on les approche. D'autres étapes restent de simples conteneurs sans matrice, pour les moments plus libres de l'atelier.

Deux formes de matrices existent selon la pédagogie de l'étape : une grille classique (colonnes × lignes) et une matrice en lignes, où chaque groupe de lignes est ancré à une carte de référence plutôt qu'à une position fixe.

Le catalogue des étapes et de leurs matrices est un modèle codé dans l'application (pas encore éditable depuis une interface), là où le choix des cartes et leur placement dans les cellules se configure côté LeHub.

## Les lots de cartes

Un lot est un paquet de cartes que l'animateur·ice lance au moment voulu. Deux modes de lancement sont disponibles :

- **Distribuer** : les cartes du lot sont mélangées puis réparties une à une dans la main privée de chaque participant, à charge pour chacun de les poser.
- **Pop-corn** : tout le lot part dans la main de l'animateur·ice, qui révèle les cartes une par une au rythme de la discussion. Si le lot est cartographié à une matrice, chaque carte révélée s'auto-place dans la bonne cellule et y reste verrouillée (déplaçable seulement à l'intérieur de sa cellule).

Un lot peut aussi être un diaporama plutôt qu'un jeu de cartes : dans ce cas, l'animateur·ice le présente en plein écran, synchronisé pour tous les participants (navigation et pointeur partagés), avec un indicateur de progression (par exemple 3/12).

Certaines cartes sont des émergences indésirables : elles s'ancrent à une carte de base déjà posée, pas à une cellule, et la suivent si elle est déplacée sur le plateau.

## La collaboration temps réel

Tous les participants voient les modifications des autres en direct, curseurs compris : chacun sait qui regarde quoi. La synchronisation passe par WebSocket (Socket.io), sans rechargement de page.

Chaque participant peut aussi réagir en direct avec un picker d'emojis, dont l'animation et le message sont diffusés instantanément à tout le monde.

## Le mode animateur

L'animateur·ice dispose d'outils que les participants n'ont pas :

- **Lancement des étapes et des lots** : activer une étape, distribuer ou réinitialiser un lot.
- **Verrouillage du plateau** : bloquer les modifications pendant une explication.
- **Suivi de vue** : forcer la vue de tous les participants sur la sienne.
- **Visite guidée** : un tour d'accueil contextuel se déclenche automatiquement à la première connexion, différent pour l'animateur·ice et pour les participants, et reste rejouable ensuite.

## Multi-langue et accès

- Interface et jeux de cartes en trois langues : français, anglais, espagnol.
- **Accès par lien**, sans compte : le lien du plateau est généré par LeHub et partagé par l'animateur·ice.
- **Ateliers test** : les plateaux créés depuis l'espace formation de LeHub affichent un badge « Atelier test » et expirent automatiquement après 24 heures.
