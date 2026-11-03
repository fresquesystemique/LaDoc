---
id: environnements
title: Environnements
sidebar_position: 3
---

# Environnements

Le SI a **deux environnements** : le poste de développement et la production. Il n'y a pas d'étage intermédiaire.

:::info L'environnement de développement partagé a été supprimé
`dev.hub`, `dev.board` et `dev.sautronautrement`, ainsi que la base PostgreSQL qu'ils partageaient, ont été **supprimés le 20 août 2026**. Les branches de développement sont conservées dans les dépôts principaux et une archive de l'ancien environnement a été mise de côté sur le serveur.

Une documentation ou un commentaire de code qui parle encore de `dev.hub` décrit donc un état révolu. Conséquence directe : **une évolution se teste en local, puis part en production**, ce qui rend deux habitudes indispensables — vérifier un build de production en local avant de pousser, et déployer dans l'ordre quand un chantier touche plusieurs applications.
:::

## Production

### Domaines

| Domaine | Ce qu'il sert |
|---|---|
| `fresquesystemique.org` (apex, et `www`) | LeSite |
| `hub.fresquesystemique.org` | LeHub |
| `board.fresquesystemique.org` | LeBoard |
| `badge.fresquesystemique.org` | La page publique d'un badge, servie par **LeHub** |
| `docs.fresquesystemique.org` | Cette documentation |

Tout nom d'hôte non reconnu tombe sur un vhost par défaut qui ferme la connexion (voir [Infrastructure](./infrastructure.md)).

### Base de données

- Une instance PostgreSQL 18 en conteneur, **partagée par LeHub et LeBoard**.
- Les deux applications ont leur propre schéma Prisma : celui du Hub est complet, celui de LeBoard est un miroir partiel des tables qu'il utilise.
- Les deux sont sur **Prisma 7** et doivent le rester ensemble.
- Sauvegarde quotidienne vers un stockage objet externe (voir [Sauvegardes](./sauvegardes.md)).
- Migrations appliquées au déploiement de chaque application.

:::warning Une seule base pour deux dépôts
Ce qui était un piège de l'environnement de dev partagé est devenu la règle en production : une migration poussée d'un côté s'applique à la base que l'autre lit. Avant de toucher une table partagée (`Board`, `Lot`, `WorkshopModel`, `ModelCardTitle`, les tables de la Régénération), vérifier l'état du schéma dans les **deux** dépôts, et ne pas déployer les deux dans la même fenêtre.
:::

### Déploiement

| Application | Branche | Barrière de qualité | Particularité |
|---|---|---|---|
| LeHub | `main` | typecheck + lint + tests (Node 24) | `npm ci` et `prisma generate` aussi sur l'hôte, pour les crons |
| LeSite | `main` | aucune dans le workflow | build `--no-cache`, reload Nginx |
| LeBoard | `master` | types + tests (Node 24) | build `--no-cache`, délai de l'action SSH porté à 30 min |

Les trois workflows commencent par `set -e`. Chaque application détaille son pipeline dans sa page Déploiement ([LeHub](../lehub/deploiement.md), [LeSite](../lesite/deploiement.md), [LeBoard](../leboard/deploiement.md)).

LaDoc, elle, se déploie **à la main** (`./deploy.sh` sur le serveur) : il n'y a pas de CI/CD pour la documentation.

### Variables d'environnement

Dans un fichier `.env` sur le serveur, en mode 600, plus les secrets GitHub pour l'accès SSH. Les valeurs sont dans LeRunbook.

Deux pièges constants :

- **Les `NEXT_PUBLIC_*` sont inlinées au build.** Les changer demande un rebuild, pas un redémarrage. Elles sont passées en build args par `docker-compose.yml`.
- **Le conteneur de LeHub lit `.env.production`**, pas `.env`. Un script lancé sur l'hôte, lui, lit `.env` — avec un mot de passe à encoder pour une URL.

## Développement local

```bash
git clone https://github.com/fresquesystemique/LeHub.git
cd LeHub
cp .env.example .env.local
npm install
docker compose up -d postgres
npx prisma migrate dev     # génère aussi le client dans generated/prisma
npm run dev
```

Chaque développeur a sa propre base PostgreSQL en conteneur. LeSite n'a pas de base du tout.

### Les ports, et le piège qui va avec

| Application | Port local par défaut | Port du conteneur sur l'hôte en production |
|---|---|---|
| LeHub | 3000 | **3000** |
| LeBoard | 3000 (serveur maison) | **3001** |
| LeSite | 3000 | **3002** |

Les trois applications utilisent le même port par défaut en local : il faut donc en déplacer deux (`npm run dev -- -p 3002`). Et en production, **3000 est LeHub, pas LeSite** — c'est une confusion classique quand on sonde un port pour vérifier un déploiement. Pour tester un build local, forcer `PORT=`.

## Cohérence entre environnements et entre dépôts

Certaines valeurs doivent être identiques dans plusieurs dépôts. Aucune ne provoque d'erreur au démarrage quand elle dérive : elles cassent des fonctions entières en silence.

| Valeur | Où | Ce qui casse si elle dérive |
|---|---|---|
| Nom du cookie de session (`AUTH_SESSION_COOKIE_NAME`) | LeHub `lib/auth.ts`, LeSite `lib/hub-session.ts` | Le contournement administrateur du mode chantier, le menu compte |
| `BOARD_ADMIN_JWT_SECRET` | LeHub, LeBoard | Le lien « Animer » : l'animateur arrive en participant |
| `REVALIDATE_SECRET` | LeHub, LeSite | La revalidation immédiate (le contenu apparaît quand même, 5 minutes plus tard) |
| `CONTACT_NOTIFY_SECRET` | LeHub, LeSite | Le formulaire de contact |
| `SEO_CRAWLER_SECRET` | LeHub, LeSite | Le tableau `/admin/seo`, qui affiche un bandeau d'indisponibilité |
| URLs croisées (`NEXT_PUBLIC_HUB_URL`, `NEXT_PUBLIC_BOARD_URL`, `NEXT_PUBLIC_SITE_URL`, `LESITE_URL`, `HUB_INTERNAL_URL`) | Les trois dépôts | Le pont d'auth, le SSO plateau, le relais des diapositives, les canonical et le sitemap |
| Catalogue des plateaux | LeHub `lib/plateaux.ts`, LeBoard `src/lib/plateaux.ts` | Les cartes mal placées, les erreurs à la distribution d'un lot |

:::danger Ordre de déploiement
Quand un chantier touche plusieurs applications, **le Hub part en premier**. LeSite consomme son API publique, LeBoard lit ses versions de cartes et relaie ses images de diapositives. L'inverse met en ligne un consommateur qui réclame des champs que la source ne sert pas encore.

Et ne pas lancer deux déploiements en même temps : deux builds Docker concurrents sur le VPS ont déjà verrouillé containerd.
:::

## Mode chantier

LeSite peut basculer en « mode chantier » (page « en construction ») par un réglage de LeHub (`/admin/settings` → Mode chantier), lu sur `/api/public/site-mode`. Les administrateurs voient le vrai site grâce au pont d'authentification, et deux autres laissez-passer existent pour les robots d'aperçu de lien et pour le récupérateur de pages SEO. Voir [LeSite — Mode chantier](../lesite/fonctionnalites.md#mode-chantier).

Tant que le mode chantier est actif, le réglage d'indexation du Hub (`seoIndexingEnabled`) reste à `false` : le sitemap n'expose que la page chantier, et aucune page publique n'est proposée à l'indexation.
