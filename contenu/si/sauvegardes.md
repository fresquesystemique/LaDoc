---
id: sauvegardes
title: Sauvegardes
sidebar_position: 5
---

# Sauvegardes

Les données critiques du SI — base PostgreSQL et fichiers d'upload — sont sauvegardées automatiquement et régulièrement vers un stockage objet externe. Les sauvegardes permettent de restaurer le SI après une perte de données (corruption, suppression accidentelle, attaque).

## Quoi et où

### Données sauvegardées

- **Base PostgreSQL** : tous les ateliers, inscriptions, participants, badges, contenus, modèles de plateau LeBoard.
- **Fichiers d'upload** : images de blog, factures PDF, assets divers stockés par les applications.

### Destination

Stockage objet externe (service de stockage en ligne). Les données sont chiffrées en transit et au repos. Consulter LeRunbook pour identifier le fournisseur et accéder aux sauvegardes.

## Fréquence et rétention

Les sauvegardes sont créées **toutes les 24 heures** (fréquence typique). L'historique des sauvegardes est conservé pendant **30 jours** (peut varier; voir LeRunbook pour la rétention exacte).

Après 30 jours, les plus anciennes sauvegardes sont supprimées automatiquement par le service de stockage.

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
Les étapes de restauration (télécharger la sauvegarde depuis le stockage objet, importer la base, remplir les fichiers d'upload) se trouvent dans **LeRunbook**.

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

- **RPO (Recovery Point Objective)** : jusqu'à 24h de perte de données possible (si une sauvegarde est la dernière valide).
- **RTO (Recovery Time Objective)** : temps de restauration = plusieurs minutes à une heure (dépend de la taille).
- **Coût** : stockage objet payant proportionnel à la volume de données.
- **Crypto** : les sauvegardes sont chiffrées, mais la clé de chiffrement dépend du fournisseur. Consulter LeRunbook pour les détails de la gestion des clés.

## Restauration en cas de compromission du serveur

Si le serveur est compromis (attaque, malware installé), restaurer depuis une sauvegarde **précédente à la compromise** est critique. Le timing est essentiel :

1. Identifier quand la compromise a eu lieu (via logs ou alertes).
2. Sélectionner une sauvegarde datant d'avant l'incident.
3. Restaurer l'infrastructure à partir de zéro (formater serveur, réinstaller OS, restaurer la base sauvegardée).
4. Vérifier l'intégrité de la sauvegarde avant de remettre en production.
