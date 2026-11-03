---
id: monitoring
title: Monitoring
sidebar_position: 4
---

# Monitoring

La santé du SI est surveillée par une sonde qui tourne **toutes les 15 minutes** et par un **rapport quotidien**, tous deux poussés sur un canal de messagerie d'administration. Le script vit sur l'hôte (`scripts/vps-monitor.sh`), sa liste de conteneurs attendus est dans un fichier de configuration éditable à côté.

## Ce qui est réellement surveillé

| Indicateur | Seuil d'alerte |
|---|---|
| Espace disque | plus de **80 %** utilisé |
| Mémoire vive | plus de **90 %** utilisée |
| Swap | plus de **50 %** utilisé |
| Charge système (5 min) | au-dessus de **8** (4 cœurs × 2) |
| Conteneurs attendus | un conteneur de la liste **manque** parmi ceux qui tournent |
| Santé des conteneurs | un conteneur est marqué `unhealthy` par Docker |
| DNS filtrant | la sonde DoH ne résout plus correctement |

La sonde DNS mérite son explication : le résolveur filtrant sert de DNS à un téléphone. S'il répond mal, l'appareil perd tout accès réseau en mobilité, sans diagnostic évident. La sonde teste donc une **vraie résolution**, pas seulement la présence du conteneur.

:::warning Ce que le monitoring ne fait PAS
Contrairement à ce qu'on pourrait attendre, la sonde **ne teste pas** :

- l'accessibilité HTTP de LeHub, LeSite ou LeBoard (aucune requête n'est faite sur les sites) ;
- la connexion à PostgreSQL (seule la présence et la santé du conteneur sont vérifiées) ;
- l'expiration des certificats TLS ;
- la latence ou la performance.

Un conteneur qui tourne et répond « healthy » tout en servant des erreurs 500 ne déclenche donc **aucune** alerte. C'est la limite principale du dispositif actuel, et une piste d'amélioration concrète.
:::

## Comportement des alertes

- **À la détection** : un message part immédiatement sur le canal admin.
- **Si le problème persiste** : rappel toutes les **6 heures**, pas à chaque passage de la sonde.
- **À la résolution** : un message de retour à la normale est envoyé.
- L'état est tenu dans des fichiers témoins sur l'hôte, ce qui veut dire qu'une alerte « résolue » après un redémarrage du serveur peut être renvoyée une fois.

## Rapport quotidien

Un rapport part chaque matin, qu'il y ait un problème ou non. Il contient :

- les pourcentages disque, RAM et swap ;
- la charge à 5 minutes et son seuil ;
- le nombre de conteneurs actifs sur le nombre de conteneurs suivis ;
- l'état du DNS filtrant ;
- la durée de fonctionnement du serveur ;
- la liste des conteneurs absents ou en mauvaise santé, ou « Tout est OK » le cas échéant.

C'est ce rapport qui donne la mesure utile : un SI silencieux pendant une semaine n'est pas la preuve que la sonde fonctionne, le rapport quotidien l'est.

## Les autres surveillances, séparées

| Quoi | Où | Ce qui est signalé |
|---|---|---|
| Cron des rappels du Hub | script de l'hôte qui appelle `/api/cron/reminders` | Une réponse non 2xx déclenche une alerte Telegram. Ce garde-fou existe parce qu'un cron silencieusement cassé est passé inaperçu plusieurs semaines en mai 2026, privant des participants de leurs badges |
| Réconciliations HelloAsso | scripts de l'hôte | Alerte en cas d'échec |
| Sauvegardes | voir [Sauvegardes](./sauvegardes.md) | Échec d'une sauvegarde |
| Analytics | Plausible | Ce n'est pas du monitoring : aucune alerte |

## Signification des alertes

### Un conteneur manque

**Cause probable** : conteneur arrêté après un échec de démarrage (variable d'environnement manquante, migration échouée), ou déploiement interrompu.

**Point de vigilance** : c'est aussi le symptôme d'un déploiement « vert mais sans effet ». Vérifier l'âge du conteneur et de l'image, pas la couleur du run GitHub.

### Un conteneur est `unhealthy`

**Cause probable** : le healthcheck du conteneur échoue (base qui n'accepte pas les connexions, application qui ne répond plus sur son port interne).

### Espace disque au-dessus de 80 %

**Cause probable** : images et couches Docker accumulées, données Plausible, journaux. Un nettoyage Docker quotidien tourne déjà par cron ; une saturation malgré lui mérite d'aller voir ce qui grossit.

:::danger Le disque et les déploiements
Un build Docker se fait **dans le dossier de travail du dépôt** sur le VPS. Un disque presque plein fait échouer un déploiement au milieu, et c'est l'un des trois pièges identifiés lors des audits de septembre 2026 (voir [Pièges connus](./pieges.md)).
:::

### Charge système élevée

**Cause probable** : build Docker en cours (c'est le cas normal pendant un déploiement), ou deux builds concurrents — ce qui a déjà verrouillé containerd. Espacer les déploiements entre projets.

### DNS filtrant hors service

**Cause probable** : conteneur du résolveur arrêté ou configuration cassée. Sans impact sur le SI de l'association, mais l'appareil qui l'utilise comme DNS perd son accès réseau.

## En cas de panne

1. **L'alerte arrive** sur le canal admin.
2. **Diagnostiquer** : les commandes de consultation des journaux et de l'état des conteneurs sont dans LeRunbook. La convention de journalisation du VPS place les journaux des scripts dans un dossier par domaine ou par service, et les journaux Nginx dans un fichier par vhost.
3. **Résoudre** selon la cause.
4. **Vérifier** : la sonde suivante (15 minutes au plus) envoie le message de résolution. L'absence de ce message signifie que le problème persiste.
