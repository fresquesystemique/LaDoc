---
title: Architecture des échanges
weight: 2
---

# Architecture des échanges

Cette page détaille tout ce qui circule entre LeSite, LeHub, LeBoard et les services externes. Règle de fond : LeHub est la source de vérité, les deux autres applications s'appuient sur lui.

## LeHub → LeSite : le contenu

LeSite n'a pas de base de données. Les articles, ressources documentaires et ateliers affichés sur le site public proviennent de l'API publique de LeHub :

```
GET /api/public/articles           # liste des actualités publiées
GET /api/public/articles/[slug]    # un article
GET /api/public/resources          # la médiathèque
GET /api/public/workshops/[slug]   # une fiche atelier
```

L'API enrichit les articles avec des informations sur l'auteur (avatar, tagline ou rôle associatif), pour que LeSite n'ait rien à connaître des membres.

### Cache et revalidation

Les pages de contenu de LeSite utilisent l'ISR de Next.js (Incremental Static Regeneration) avec une revalidation toutes les 5 minutes. Pour éviter d'attendre ce délai, l'admin de LeHub appelle l'endpoint `/api/revalidate` de LeSite à chaque publication d'article, avec un secret partagé. Résultat : publier dans LeHub met LeSite à jour immédiatement, sans redéploiement.

{{< mermaid >}}
sequenceDiagram
    participant A as Admin (LeHub)
    participant H as LeHub
    participant S as LeSite
    participant V as Visiteur
    A->>H: publie un article
    H->>S: POST /api/revalidate (secret partagé)
    S->>S: régénère les pages concernées
    V->>S: consulte /actualites
    S->>H: GET /api/public/articles (si cache expiré)
    S-->>V: page à jour
{{< /mermaid >}}

## LeHub ↔ LeSite : le pont d'authentification

Les deux applications vivent sur le même domaine parent (`fresquesystemique.org` et `hub.fresquesystemique.org`). Le cookie de session NextAuth de LeHub est posé sur le domaine parent entier, ce qui permet à LeSite de le lire.

- LeSite déchiffre le cookie avec le même secret que LeHub et reconnaît ainsi un membre ou un admin connecté (menu compte, affichage conditionnel).
- Contrainte de mise en œuvre : le nom du cookie et le secret de session doivent rester strictement identiques des deux côtés, sinon le pont se rompt silencieusement.

### Le mode chantier

LeHub porte un drapeau « mode chantier ». Quand il est actif, le middleware de LeSite réécrit toutes les requêtes des visiteurs vers une page « site en construction ». Les admins reconnus par le pont d'auth voient le vrai site, avec une barre leur permettant de basculer entre les deux vues. C'est ce mécanisme qui a permis de préparer LeSite en production sans l'exposer au public.

## LeHub ↔ HelloAsso : les paiements

Les inscriptions payantes (ateliers, cotisations) passent par HelloAsso :

1. LeHub crée un « checkout intent » via l'API HelloAsso (OAuth2) et redirige la personne vers la page de paiement HelloAsso.
2. Après paiement, HelloAsso renvoie la personne vers la page de confirmation de LeSite.
3. En parallèle, HelloAsso notifie LeHub par webhook. C'est ce webhook qui fait foi : il crée les inscriptions, met à jour le CRM participants, génère la facture PDF et déclenche l'e-mail de confirmation.
4. Pour les cotisations, le webhook met aussi à jour le statut d'adhésion du membre.

## LeHub ↔ LeBoard : les ateliers en ligne

LeHub et LeBoard partagent la même base PostgreSQL. Ce couplage assumé simplifie tout le reste :

- Quand un atelier « en ligne » est créé dans LeHub, le plateau LeBoard correspondant est créé automatiquement. Le lien d'accès s'affiche dans la fiche atelier, côté animateur.
- Les participants rejoignent le plateau par simple lien, sans compte.
- Les animateurs disposent d'un SSO : un bouton dans la fiche atelier de LeHub les connecte à LeBoard avec leurs droits d'animation (jeton signé à durée courte, échangé selon un flux PKCE, secret partagé entre les deux applications).
- Les modèles de plateau (lots de cartes, titres personnalisés, distribution) sont définis dans l'admin de LeHub et consommés par LeBoard.
- Les migrations des tables propres au plateau (board, placements de cartes, connexions) sont gérées depuis le dépôt LeBoard ; les autres depuis LeHub.

## Services externes

| Service | Utilisé par | Rôle |
|---|---|---|
| **HelloAsso** | LeHub | Paiements (ateliers, cotisations), webhook de confirmation |
| **Resend** | LeHub, LeSite | E-mails transactionnels (confirmations, rappels, contact) |
| **LinkedIn** | LeHub | Connexion OAuth optionnelle des membres |
| **API recherche-entreprises** | LeHub | Autocomplétion SIRET des fiches organisation |
| **Plausible** (auto-hébergé) | LeSite | Mesure d'audience sans cookies (voir [Infrastructure]({{< relref "infrastructure" >}})) |

## Ce qui ne circule jamais

Par construction, certaines données restent confinées dans LeHub : mots de passe (hachés), données personnelles des membres et participants, notes internes du CRM, configuration des intégrations. LeSite ne reçoit que du contenu éditorial public, LeBoard ne connaît que les plateaux et leur contenu.
