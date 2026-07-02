---
title: Le SI en un coup d'œil
weight: 1
---

# Le SI en un coup d'œil

Le système d'information de La Fresque Systémique repose sur trois applications web, développées sur mesure et hébergées sur un serveur unique. Chacune a un rôle précis et un public distinct.

## Les trois applications

| Application | URL | Public | Rôle |
|---|---|---|---|
| **LeSite** | `fresquesystemique.org` | Tout le monde | Vitrine publique : présentation de l'association, agenda des ateliers, inscription, actualités, médiathèque, formations |
| **LeHub** | `hub.fresquesystemique.org` | Membres de l'association | Intranet et moteur du SI : base de données, administration, paiements, e-mails, API publique qui alimente LeSite |
| **LeBoard** | `board.fresquesystemique.org` | Participants d'ateliers en ligne | Plateau collaboratif temps réel pour animer les ateliers à distance (cartes, post-its, flèches) |

Une répartition simple à retenir : **LeSite montre, LeHub gère, LeBoard anime**.

## Comment elles s'articulent

{{< mermaid >}}
flowchart LR
    V[Visiteur] --> S[LeSite<br/>site public]
    M[Membre] --> H[LeHub<br/>intranet]
    P[Participant<br/>atelier en ligne] --> B[LeBoard<br/>plateau collaboratif]

    S -- "API publique<br/>(articles, ressources, ateliers)" --> H
    S -- "pont d'authentification<br/>(cookie de session partagé)" --> H
    H -- "création automatique de plateau<br/>+ SSO animateur" --> B
    H <-- "base PostgreSQL partagée" --> B
    H -- "paiements" --> HA[HelloAsso]
    H -- "e-mails transactionnels" --> R[Resend]
{{< /mermaid >}}

Trois principes structurent l'ensemble :

1. **LeHub est la source de vérité.** Les membres, ateliers, inscriptions, articles et ressources vivent dans sa base de données. Les autres applications lisent ces données, elles ne les dupliquent pas.
2. **LeSite ne stocke presque rien.** Il interroge l'API publique de LeHub et met les réponses en cache (ISR). Publier un article dans l'admin de LeHub le fait apparaître sur LeSite sans redéploiement.
3. **LeBoard partage la base de LeHub.** Un atelier « en ligne » créé dans LeHub génère automatiquement son plateau LeBoard, accessible par simple lien, sans compte.

Le détail de ces échanges est décrit dans [Architecture des échanges]({{< relref "architecture" >}}), et l'hébergement dans [Infrastructure]({{< relref "infrastructure" >}}).

## Historique en deux dates

- **Avant juin 2026** : LeHub servait à la fois d'intranet et de site public.
- **Depuis juin 2026** : LeSite est le seul site public, servi sur le domaine principal. LeHub s'est recentré sur son rôle d'intranet et de moteur (base de données, API, paiements, administration).
