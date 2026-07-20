---
id: fonctionnalites
title: Présentation & fonctionnalités
sidebar_position: 2
---

# Présentation & fonctionnalités

## Les rôles et ce qu'ils peuvent faire

| Rôle | Accès | Périmètre |
|------|---|---|
| **Participant** | Lien public sans authentification | Visualisation et interaction avec le plateau en temps réel : déplacement de cartes, post-its, curseurs collaboratifs, réactions emoji. Mains privées invisibles aux autres. Aucun contrôle des étapes ou lots. |
| **Animateur** | SSO depuis LeHub (token JWT signé) | Contrôle total du plateau : lancement/masquage des étapes, distribution et réinitialisation des lots, lock/unlock du plateau, forçage du suivi de vue de tous les participants, révélation progressive des cartes en mode pop-corn. |

## Parcours : un animateur lance et anime un atelier

1. Création d'un atelier dans le Hub (`/membres/events/new/`) avec `format='en_ligne'` (En ligne).
2. Sélection d'un modèle de plateau lors de la création (ex: « Fresque Systémique v1 »).
3. Le Hub crée automatiquement une `Board` (BD) et une `BoardLotDistribution` par lot du modèle.
4. Accès au plateau via le bouton « Animer » dans la fiche atelier Hub (`/membres/events/[id]/`) — lien SSO vers `board.fresquesystemique.org/b/[token]` avec token JWT (valide 24h).
5. Arrivée sur le plateau affichant toutes les étapes masquées (mode introductif).
6. Navigation par étapes (Introduction, Les grands systèmes, etc.) via les boutons du panel de gauche.
7. Pour chaque étape portant un lot de cartes (par ex. « Lot Actions ») :
   - Clic « Distribuer » : mélange aléatoire + répartition round-robin dans les mains privées de chaque participant. Chacun reçoit ~4-5 cartes.
   - Ou clic « Pop-corn » : le lot complet va dans la main de l'animateur. Les cartes s'auto-placent dans les cellules de la matrice de l'étape (si elle existe), puis restent verrouillées. L'animateur les révèle une à une au clic.
8. Les participants posent les cartes sur le plateau en drag-drop, manipulent les post-its, tracent des flèches de causalité, utilisent Ctrl+Z/Ctrl+Y pour leur historique personnel.
9. L'animateur voit tout en temps réel, peut lock le plateau pour une phase d'explication, puis unlock pour reprendre les manipulations.

## Parcours : un participant collabore

1. Reçoit un lien public (sans authentification) : `board.fresquesystemique.org/b/[token]`.
2. Navigation vers le lien, affichage du plateau avec son pseudo initial (généré aléatoirement, peut être changé via modal `PseudoModal`).
3. Voir le canvas infini du plateau avec les cartes déjà posées par d'autres et les étapes masquées.
4. Recevoir une visite guidée contextuelle (driver.js) au premier accès (rejouable via menu).
5. Attendre la distribution d'un lot par l'animateur → les cartes arrivent en bas dans sa « main privée » (pioche visible que par lui).
6. Drag-drop une carte du bas vers le plateau → elle apparaît à la position posée, visible de tous.
7. Clic sur une carte pour voir le recto/verso en plein écran (CardViewer) avec zoom molette/pinch.
8. Tracer des flèches entre les cartes (outil Flèche activé par l'animateur ou via toolbar) en cliquant sur un anchor point, puis sur un autre.
9. Créer des post-its libres (outil Post-it, redimensionnables, 5 couleurs, taille police variable).
10. Voir les curseurs des autres participants en temps réel (position souris) et les réactions emoji animées.
11. Suivre automatiquement la vue de l'animateur (forçage : au début et après un unlock) ou suivre un participant spécifique au clic sur son pseudo.
12. Undo/Redo personnel (Ctrl+Z/Ctrl+Y) sans impacter les autres.

## Fonctionnalités du plateau

### Canvas & cartes

- **Canvas infini** — zoom molette/pinch (0,2 × à 4 ×), pan au drag souris ou espace+molette.
- **283 cartes** recto/verso — chacune est une image PNG/WebP, les métadonnées (titre, texte) sont en JSON (`data/cards.json`).
- **Visualiseur plein écran** — clic sur une carte → CardViewer avec zoom indépendant, boutons recto/verso, réinitialiser zoom.
- **Flèches** — tracer des liens entre cartes et post-its avec plusieurs couleurs (gris, rouge, bleu, vert, orange, noir) et direction (unidirectionnelle ou bidirectionnelle).
- **Post-its** — notes libres, redimensionnables (min 180 × 150), 5 couleurs (jaune, rose, bleu, vert, blanc), taille de police 12-16 px.

### Étapes, matrices & lots

Un atelier est composé d'**étapes** (Introduction, Les grands systèmes, Le système A, etc.). Chaque étape peut porter une **matrice** — une grille de cellules (ex: 4 colonnes × 3 lignes) dans laquelle les cartes d'un lot s'aimantent au slot libre le plus proche.

- **Deux modes de lancement lots** :
  - *Distribuer* — mélange aléatoire + répartition round-robin dans la main privée de chaque participant.
  - *Pop-corn* — le lot complet va dans la main de l'animateur. Si l'étape a une matrice, chaque carte s'auto-place dans sa cellule dédiée (mapping configuré au Hub) et y reste verrouillée. L'animateur révèle progressivement.
- **Lots de diapositives** — un lot peut aussi être un diaporama (images + notes), présenté en plein écran avec navigation et pointeur partagé (SlideOverlay).
- **Mains privées** — chaque participant a sa pioche en bas d'écran : max 5 cartes visibles + badge "+N" pour le débordement. Invisible des autres.
- **Émergences indésirables** — un lot peut être marqué `kind='emergence'` : ses cartes s'ancrent à une carte de base déjà posée et la suivent en cas de déplacement.

### Présentation & collaboration

- **Collaboration temps réel** — tous les participants voient les modifications en direct via Socket.io (latence < 100ms typique).
- **Curseurs collaboratifs** — position de chaque participant visible sur le canvas, pseudo au survol.
- **Réactions emoji** — picker animé (emoji picker), réactions diffusées immédiatement à tous.
- **Visite guidée** — tour d'accueil contextuel (driver.js), différent pour l'animateur et les participants. Auto-démarré à la première visite, rejouable via menu.
- **Multi-langue** — FR / EN / ES (sélectionnable via menu, persisté en localStorage).

### Mode animateur exclusif

- **Lock/unlock du plateau** — verrouille les interactions des participants (lecture seule), utile pour les phases d'explication.
- **Forcer le suivi de vue** — tous les participants suivent automatiquement la vue de l'animateur (zoom, pan).
- **Badge atelier test** — « Atelier test · Version X » affiché dans le header pour les boards de formation (créés via `/api/board-training` du Hub).
- **Undo/redo global** (animateur) — historique séparé du reste ; les participants n'ont que leur undo personnel.

### Minimap & navigation

- Minimap en bas-droite affichant la vue d'ensemble du plateau.
- Zones de matrices visualisées en pointillés.
- Clic sur la minimap pour pan rapide.
