---
id: monitoring
title: Monitoring
sidebar_position: 4
---

# Monitoring

La santé du SI est supervisée par une sonde périodique et un rapport quotidien poussés sur un canal de messagerie d'administration. L'objectif est de détecter les pannes, les dégradations de performance et les anomalies avant qu'elles n'affectent les utilisateurs.

## Principe

Un script de surveillance s'exécute régulièrement (toutes les 15 minutes) et teste :

- Accessibilité de LeHub, LeSite, LeBoard (requête HTTP GET sur healthcheck).
- Disponibilité de PostgreSQL (test de connexion).
- Espace disque du serveur (quota utilisé vs disponible).
- Processus critiques (Docker, Nginx, PostgreSQL en cours d'exécution).
- Certificats TLS (temps avant expiration).

À chaque run :

- Si **tout est OK** : pas de notification.
- Si **une alerte est détectée** : notification immédiate sur un canal de messagerie admin.
- **Synthèse quotidienne** : un rapport récapitulatif est envoyé tous les jours à une heure fixe.

## Ce qui est surveillé

| Indicateur | Seuil d'alerte |
|---|---|
| LeHub status HTTP | Non-2xx, timeout > 5s |
| LeSite status HTTP | Non-2xx, timeout > 5s |
| LeBoard status HTTP | Non-2xx, timeout > 5s |
| PostgreSQL connexion | Impossible de se connecter |
| Espace disque | Moins de 10% libre |
| Docker daemon | Processus arrêté |
| Nginx | Processus arrêté |
| Certificats TLS | Expiration < 7 jours |

## Signification des alertes

### App inaccessible
**Symptôme** : LeHub, LeSite ou LeBoard retourne une erreur HTTP 5xx ou timeout.

**Cause probable** : conteneur Docker arrêté, erreur applicative non gérée, saturation mémoire du serveur, connexion DB échouée.

**Action** : consulter LeRunbook pour les commandes de diagnostic (vérifier status conteneur, logs applicatifs, utilisation mémoire).

### PostgreSQL inaccessible
**Symptôme** : la sonde ne parvient pas à se connecter à PostgreSQL.

**Cause probable** : instance PostgreSQL arrêtée, port fermé, credentials incorrect, saturation ressources.

**Action** : consulter LeRunbook pour les commandes de diagnostic DB.

### Espace disque faible
**Symptôme** : moins de 10% d'espace libre sur le disque principal.

**Cause probable** : logs Docker accumulés, données Plausible, cache Docker non nettoyé.

**Action** : consulter LeRunbook pour nettoyer les logs et les images Docker non utilisées.

### Certificat TLS bientôt expiré
**Symptôme** : certificat expire dans moins de 7 jours.

**Cause probable** : renouvellement automatique défaillant.

**Action** : renouvellement manuel (voir LeRunbook). Normalement n'arrive pas, le renouvellement est automatique.

## Recevoir les alertes

Les alertes et le rapport quotidien sont envoyés sur un **canal de messagerie d'administration** distinct du canal de développement.

Les accès et la procédure de configuration se trouvent dans **LeRunbook**.

## Limitation de la sonde

La sonde test ne peut pas :

- Détecter les bugs applicatifs qui ne causent pas un crash ou une erreur 5xx.
- Tester les workflows métier complexes (inscription, paiement, email transactionnel). Pour cela, il faudrait une suite de tests synthétiques ou une réelle fréquentation.
- Monitorer la latence ou la performance fine de la base de données.
- Alerter sur une dérive lente de la performance (à moins d'être reconfigurée).

Le monitoring est donc **pas un substitut au testing de fonctionnalité**.

## En cas de panne

1. **Recevoir l'alerte** : une notification arrive sur le canal admin.
2. **Diagnostiquer** : consulter LeRunbook pour les logs et les commandes de diagnostic.
3. **Résoudre** : selon la cause (redémarrer un conteneur, libérer de l'espace disque, etc.).
4. **Vérifier la réparation** : la prochaine sonde (15 min max) confirmera si le problème est résolu.

En cas de panne critique (serveur down), un redémarrage manuel est nécessaire; les procédures sont dans LeRunbook.
