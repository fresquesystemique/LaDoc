---
id: sauvegardes
title: Sauvegardes
sidebar_position: 5
---

# Sauvegardes

Les données critiques du SI — base PostgreSQL et fichiers d'upload — sont sauvegardées automatiquement et régulièrement vers un stockage objet externe. Les sauvegardes permettent de restaurer le SI après une perte de données (corruption, suppression accidentelle, attaque).

## Quoi et où

### Données sauvegardées

Trois jeux, par deux scripts quotidiens distincts :

| Quoi | Format | Contenu |
|---|---|---|
| Base `fresquesystemique` | dump PostgreSQL compressé | Tout LeHub **et** tout LeBoard : ateliers, inscriptions, participants, badges, contenus, versions de cartes, plateaux, demandes de contact, référencement |
| Uploads de LeHub | archive `.tar.gz` | Images d'articles et d'avatars, pages de PDF converties pour les carrousels, exports de diapositives. Ce dossier n'est **pas** suivi par git : la sauvegarde est le seul filet |
| Plausible | dump PostgreSQL + export ClickHouse | Comptes et configuration d'un côté, historique des événements d'audience de l'autre |

Les factures PDF n'en font pas partie : le SI n'en génère aucune, les reçus de paiement sont émis par HelloAsso.

### Destination

Stockage objet externe (service de stockage en ligne). Les données sont chiffrées en transit et au repos. Consulter LeRunbook pour identifier le fournisseur et accéder aux sauvegardes.

## Fréquence et rétention

Les sauvegardes partent **chaque nuit**, en deux temps : la base et les uploads du SI, puis Plausible.

Deux niveaux de conservation :

- **Quotidien** : les dumps du jour, dans un préfixe `daily/`.
- **Mensuel** : le dump du 1er de chaque mois est **également** copié dans un préfixe `monthly/`, conservé indéfiniment.

C'est ce second niveau qui permet de remonter au-delà de la fenêtre quotidienne, par exemple pour retrouver une donnée supprimée il y a plusieurs mois sans s'en apercevoir.

## Sécurité de la clé d'accès

### Pourquoi la clé d'accès n'a pas le droit de suppression

La clé d'accès qui permet au serveur de créer et de lire les sauvegardes n'a **pas le droit de suppression** (read + write seulement). C'est une décision de conception intentionnelle.

**Raison** : si le serveur est compromis (attaque, malware), l'attaquant ne peut pas supprimer les sauvegardes en utilisant la clé du serveur. Même s'il s'empare de la clé d'accès, il ne peut que lire et créer, pas détruire. Pour supprimer les sauvegardes, il faudrait un accès administrateur séparé au stockage.

**Impact** : en cas de ransomware ou de suppression malveillante, les sauvegardes restent intactes et peuvent restaurer l'ensemble du SI.

## Restauration

### Préparation
Avant une restauration, identifier :

- Quelle sauvegarde restaurer (date/heure).
- Quelle base de données restaurer (source et destination — en dev local, en dev partagé, ou en production).

### Procédure de restauration

Les commandes exactes sont écrites **en tête des scripts de sauvegarde eux-mêmes**, ce qui est volontaire : la procédure vit au même endroit que ce qui produit les archives, et ne peut donc pas devenir obsolète sans qu'on le voie. La forme générale :

1. récupérer l'archive voulue depuis le stockage objet (en précisant sa date) ;
2. pour la base : `pg_restore --clean --if-exists` dans le conteneur Postgres ;
3. pour les uploads : désarchiver dans le dossier `public` de LeHub ;
4. pour Plausible : restaurer le dump Postgres, puis rejouer le schéma et les données ClickHouse table par table.

Les accès au stockage et les chemins serveur sont dans **LeRunbook**.

### Restauration testée
Le processus de restauration a été **testé au moins une fois** lors de sa mise en place. Cela signifie :

- Une sauvegarde a été téléchargée.
- La base a été restaurée avec succès.
- Les données étaient intégrales et accessibles.
- Les fichiers d'upload ont pu être restaurés.

**Implication** : le processus n'est pas théorique, c'est un protocole validé. Le tester régulièrement (tous les 6 mois) reste une bonne pratique pour s'assurer qu'il reste opérationnel.

## En cas de perte de données

1. **Arrêter l'application** (éviter d'autres écritures).
2. **Identifier la sauvegarde** : la plus récente avant le sinistre.
3. **Restaurer** : télécharger la sauvegarde et appliquer la procédure LeRunbook.
4. **Vérifier** : tester que les données critiques sont présentes.

Le temps de restauration dépend de la taille de la base (généralement < 1 heure pour une base < 1GB).

## Limites et considérations

- **RPO (Recovery Point Objective)** : jusqu'à 24 h de perte de données, puisque la sauvegarde est quotidienne.
- **RTO (Recovery Time Objective)** : temps de restauration = plusieurs minutes à une heure (dépend de la taille).
- **Coût** : stockage objet payant proportionnel à la volume de données.
- **Chiffrement** : assuré par le fournisseur de stockage, en transit et au repos. La gestion des clés est de son côté : une sauvegarde locale n'est pas chiffrée par nos scripts.
- **Ce qui n'est pas sauvegardé** : la configuration du serveur (Nginx, certificats, crontabs, fichiers `.env`). Une reconstruction complète du VPS repose donc sur LeRunbook, pas sur les sauvegardes.
- **Aucune alerte de réussite** : seules les erreurs remontent. Un script qui ne tourne plus du tout ne dit rien, ce qui rend la vérification périodique de la présence des dumps du jour utile.

## Restauration en cas de compromission du serveur

Si le serveur est compromis (attaque, malware installé), restaurer depuis une sauvegarde **précédente à la compromise** est critique. Le timing est essentiel :

1. Identifier quand la compromise a eu lieu (via logs ou alertes).
2. Sélectionner une sauvegarde datant d'avant l'incident.
3. Restaurer l'infrastructure à partir de zéro (formater serveur, réinstaller OS, restaurer la base sauvegardée).
4. Vérifier l'intégrité de la sauvegarde avant de remettre en production.
