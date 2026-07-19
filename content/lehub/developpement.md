---
title: Lancer en local
weight: 4
---

# Lancer en local

## Prérequis

- Node.js 20 ou plus récent
- Docker (pour PostgreSQL) ou une instance PostgreSQL locale

## Installation

```bash
git clone <dépôt LeHub>
cd LeHub

cp .env.example .env.local
# remplir les variables (voir tableau ci-dessous)

npm install
npx prisma migrate dev     # crée la base et applique les migrations
npm run db:seed            # données de démarrage (optionnel)
npm run dev                # http://localhost:3000
```

## Variables d'environnement

Les valeurs ne sont jamais documentées ici ; seul le nom et le rôle de chaque variable le sont. Les variables e-mail et HelloAsso peuvent aussi se configurer depuis l'admin (la valeur en base prime alors sur la variable d'environnement).

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL |
| `NEXTAUTH_SECRET` | Secret de session NextAuth (partagé avec LeSite pour le pont d'auth) |
| `NEXT_PUBLIC_APP_URL` | URL publique de l'application |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME` | Envoi d'e-mails |
| `HELLOASSO_CLIENT_ID`, `HELLOASSO_CLIENT_SECRET`, `HELLOASSO_ORG_SLUG` | API HelloAsso |
| `HELLOASSO_ENV` | `production` ou `sandbox` |
| `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | OAuth LinkedIn |
| `AUTH_COOKIE_DOMAIN` | Domaine du cookie de session ; non défini en local (le pont d'auth ne sert qu'en production) |
| `AUTH_SESSION_COOKIE_NAME` | Nom du cookie de session ; doit être strictement identique côté LeSite. Optionnel, une valeur par défaut est partagée des deux côtés |
| `LESITE_URL`, `LESITE_REVALIDATE_SECRET` | Revalidation de LeSite à la publication d'un article |
| `PUBLIC_SITE_URL` | URL de retour après paiement HelloAsso |
| `CRON_SECRET` | Protection de l'endpoint de rappels J-2 |
| `CONTACT_NOTIFY_SECRET` | Protection de l'endpoint qui reçoit les notifications du formulaire de contact de LeSite ; doit être identique des deux côtés |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN` | Accès au compte Google Slides partagé, pour l'export des lots-diaporama vers LeBoard |
| `POSTGRES_PASSWORD` | Mot de passe du conteneur PostgreSQL |

Il n'y a plus de secret partagé dédié au SSO animateur vers LeBoard : l'échange passe par la session LeHub elle-même, vérifiée puis convertie en jeton d'accès court côté LeBoard (voir [Fonctionnalités]({{< relref "fonctionnalites" >}})).

Pour tester les paiements sans argent réel, `HELLOASSO_ENV=sandbox` bascule sur l'environnement de test HelloAsso.

## Vérifier son travail

```bash
npm run typecheck           # tsc --noEmit sur le code de prod
npm run lint                # ESLint (configuration flat config)
npm test                    # suite Jest complète
npx jest chemin/du/test     # un fichier de test
npx jest -t "nom du test"   # filtrer par nom
```

Les tests vivent dans `__tests__/`, en miroir de l'arborescence source (`__tests__/api`, `__tests__/components`, `__tests__/lib`). Ces trois vérifications (typecheck, lint, tests) sont aussi celles que le pipeline de déploiement exécute avant de construire l'image : les reproduire en local évite les allers-retours (voir [Déploiement]({{< relref "deploiement" >}})).

## Base de données

```bash
npx prisma migrate dev      # créer et appliquer une migration en local
npx prisma generate         # régénérer le client après un changement de schéma
npx prisma studio           # explorer la base dans le navigateur
```

Si vous modifiez le schéma, assurez-vous que la migration s'applique proprement avec `prisma migrate deploy` : c'est ce que le déploiement exécutera en production, et il échoue si la migration échoue.
