---
title: Stack technique
weight: 2
---

# Stack technique

## Technologies

| Couche | Technologie |
|---|---|
| Framework | Next.js 16 (App Router, React Server Components) |
| Langage | TypeScript, React 19 |
| Authentification | NextAuth v5 (sessions JWT, LinkedIn OAuth) |
| Base de données | PostgreSQL 18, ORM Prisma 5 |
| Styles | Tailwind CSS 4, composants shadcn/ui |
| Paiements | HelloAsso (checkout intents et webhooks) |
| E-mails | Resend |
| Diaporamas | API Google Slides (export des lots-diaporama pour LeBoard) |
| Tests | Jest (environnement jsdom), Testing Library |
| Infra | Docker, Nginx, GitHub Actions |

## Structure du code

### Trois espaces de routes

L'App Router organise l'application en espaces, chacun avec son `layout.tsx` qui fait le contrôle d'accès :

```
app/
  members/        # espace membres (session requise, sinon redirection /login)
    dashboard/  directory/  events/  library/  licence/
    organisations/  profile/  resources/  usage-rights/
  admin/          # espace admin (droit isAdmin requis)
    dashboard/  events/  members/  participants/  organisations/
    blog/  library/  resources/  cards/  discount-codes/  emails/  pricing/  settings/
  (auth)/         # groupe sans préfixe d'URL : login, logout,
                  # forgot-password, reset-password, invitation
  (inscription)/  # confirmation d'inscription (parcours public)
  verify/         # vérification publique des badges
  api/            # toutes les routes API
```

Les routes API reflètent le même découpage : `api/admin/*`, `api/members/*`, `api/workshops/*`, `api/checkout`, `api/webhooks/*`, `api/public/*` (l'API consommée par LeSite), `api/board-auth` et `api/board-training` (liaison LeBoard), `api/cron/*` (tâches planifiées), `api/badges`, `api/invitations`.

### La bibliothèque `lib/`

La logique métier partagée vit dans `lib/`, un fichier par domaine. Quelques exemples représentatifs : `auth.ts` (configuration NextAuth), `permissions.ts` (hiérarchie des rôles), `helloasso.ts` (client API paiements), `registration-cancellation.ts` (annulation et remboursement), `cotisation.ts` et `cotisation-webhook.ts` (adhésions), `discount-codes.ts` (codes de réduction), `badges.ts` (Open Badges), `board.ts`, `plateaux.ts`, `lots-config.ts` et `lot-cards.ts` (liaison LeBoard), `google-slides.ts` et `lot-slides.ts` (lots-diaporama), `email.ts` et `email-blocks.ts` (e-mails par blocs), `directory.ts` (annuaire et avatars), `prisma.ts` (client base de données unique).

## Conventions à connaître

Ces conventions structurent le code et évitent des pièges connus :

- **Rôle et droit admin sont indépendants.** `role` est le rôle pédagogique (`adherent` < `animateur` < `formateur`), `isAdmin` est le droit d'accès à l'admin. Un contrôle d'accès admin doit toujours tester `isAdmin`, jamais `role`, car la plupart des admins ont un rôle pédagogique (souvent formateur).
- **Le responsable d'un atelier est l'animateur lead.** La relation `WorkshopAnimator` porte un rôle `lead` ou `co` ; c'est elle qui fait foi, pas le créateur de la fiche (les ateliers importés d'anciens systèmes n'ont pas de créateur).
- **Suppression douce partout.** `Member`, `Participant` et `Workshop` portent un `deletedAt` : toute requête doit filtrer `deletedAt: null`.
- **Permissions par hiérarchie.** `lib/permissions.ts` définit les niveaux et les fonctions de garde. Les gardes s'utilisent en plus des redirections de layout, jamais en remplacement.
- **Client Prisma unique.** Toujours importer `prisma` depuis `lib/prisma.ts` (singleton résistant au rechargement à chaud du mode dev).
- **Dates et fuseaux.** `lib/workshop-form.ts` fournit la conversion datetime locale → UTC ; ne pas réimplémenter cette logique.
- **Alias d'import.** `@/*` pointe sur la racine du dépôt.
