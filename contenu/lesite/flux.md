---
id: flux
title: Flux métier
sidebar_position: 5
---

# Flux métier

Les workflows critiques pour LeSite : inscription + paiement, mode chantier et revalidation du contenu.

## Inscription et paiement HelloAsso

```
Visiteur (LeSite)
       │
       ├─ Clique "S'inscrire" sur atelier
       │
       └─→ Formulaire inscription (prénom, nom, email, phone opt, tier)
              │
              ├─ Rewrite: POST /api/checkout
              │            → LeHub: POST /api/checkout
              │
              └─→ LeHub (API) :
                 1. Valide email unique / capacité / tarif
                 2. Crée Registration (paymentStatus='pending')
                 3. Crée CheckoutIntent HelloAsso
                 4. Retour redirectUrl (valide 15 min)
              │
              └─ LeSite redirige vers HelloAsso
                      │
                      ├─ Paiement HelloAsso
                      │
                      └─ HelloAsso webhook → LeHub
                         1. Valide token sécurité
                         2. Upsert Participant
                         3. UPDATE Registration (paymentStatus='paid')
                         4. Envoie l'email de confirmation
                      │
                      └─ HelloAsso redirige vers
                         `https://fresquesystemique.org/confirmation?orderId=...`
                      │
                      └─ Visiteur voit confirmation LeSite
```

**Détails clés** :

- LeSite n'a aucun rôle dans la validation ou la création de données : tout passe par le rewrite vers l'API LeHub.
- Le visiteur ne voit jamais la vraie URL du hub (rewrite transparent).
- L'e-mail de confirmation est émis par LeHub ; le **reçu de paiement est émis par HelloAsso**, aucune facture PDF n'est générée par le SI.
- LeSite ne reçoit pas de webhook de paiement : la page `/confirmation` lit l'état réel en interrogeant `GET /api/public/registration-status?checkoutIntentId=…` du Hub, plutôt que de faire confiance aux paramètres d'URL.

**Si HelloAsso n'est pas accessible** :

- Endpoint `/api/checkout` retourne erreur 503. Visiteur voit un message.
- LeHub gère la réconciliation quotidienne en cas de webhook perdu (voir documentation LeHub).

## Mode chantier et pont d'authentification

```
Middleware LeSite (middleware.ts)
       │
       ├─ À chaque requête (sauf assets)
       │
       ├─ 1. Fetch GET /api/public/site-mode (cache 15 sec)
       │      → LeHub retour {chantier: true/false}
       │
       ├─ 2. SI chantier=false → laisse passer (PageNext)
       │
       └─ 3. SI chantier=true
              │
              ├─ SI robot d'aperçu de lien → laisse passer (vraies balises OG)
              │
              ├─ SI en-tête x-seo-crawler valide → laisse passer
              │      (récupérateur de pages SEO du Hub)
              │
              ├─ Transmet le cookie à GET /api/public/session du Hub
              │      → SI isAdmin=true → laisse passer (admin voit le vrai site)
              │
              └─ SINON → rewrite vers /chantier
```

**Détails clés** :

- Flag `chantier` piloté depuis LeHub (`/admin/settings` → Mode chantier), lu sur `/api/public/site-mode`.
- Cookie de session partagé sur `.fresquesystemique.org` en production.
- **LeSite ne déchiffre pas le cookie** : il le transmet au Hub, qui tranche. LeSite ne détient aucun secret d'authentification (voir [Architecture](./architecture.md#pont-dauthentification)).
- Le nom du cookie doit rester identique côté Hub (`lib/auth.ts`) et côté LeSite (`lib/hub-session.ts`).
- Robots d'aperçu de lien (LinkedIn, Facebook, Slack, WhatsApp, Telegram…) : laissés passer pour que le partage affiche les vraies balises OG.

**Pièges** :

- Un `AUTH_SESSION_COOKIE_NAME` désynchronisé → le Hub ne voit aucun cookie → tout le monde atterrit sur `/chantier`, administrateurs compris.
- Le flag est mis en cache 15 secondes : un changement dans le Hub prend jusqu'à 15 secondes à se propager, par nœud de rendu.
- Si l'appel au Hub échoue, le middleware **laisse passer** (`chantier = false`) plutôt que de bloquer le site.
- `robots.txt` et `sitemap.xml` doivent rester hors du matcher du middleware, sinon Google reçoit la page chantier en HTML.

## Revalidation ISR et webhook

```
Admin LeHub enregistre un contenu (article, réglage SEO…)
       │
       └─→ Le Hub appelle
           POST https://fresquesystemique.org/api/revalidate
               Header : x-revalidate-secret: <valeur>
               Corps  : { paths: [...], tags: [...] }
           │
           ├─ Compare le secret à TEMPS CONSTANT
           │      (SHA-256 des deux valeurs + timingSafeEqual)
           │      → 401 si différent
           │
           ├─ Pour chaque chemin : revalidatePath()
           │      un gabarit dynamique ('/ressources/blog/[slug]')
           │      est revalidé avec le type 'page'
           │
           ├─ Pour chaque tag : revalidateTag(tag, 'max')
           │
           └─ Retour { revalidated: true, paths, tags }
```

**Système de cache** :

- Listings et articles en `revalidate = 300` (5 min) ; pages éditoriales statiques ; agenda rendu côté client.
- Par défaut, sans corps explicite, la route revalide la liste historique : médiathèque, blog et gabarit d'article.
- Le profil de cache `'max'` des tags applique une sémantique *stale-while-revalidate* : après un enregistrement, la **toute première** visite peut encore afficher l'ancienne métadonnée, la suivante aura la nouvelle. C'est le compromis retenu pour un site public.

**Si le webhook est perdu** :

- Changement reste invisible jusqu'à la prochaine revalidation (max 5 min).
- LeSite continue de servir le cache ancien : pas d'erreur pour le visiteur.

**Si `REVALIDATE_SECRET` n'est pas configuré ou diverge** :

- L'appel du Hub repart en 401, sans aucun effet visible sur le site : le contenu finit par apparaître à l'expiration des 5 minutes.
- C'est un symptôme typique de « j'ai publié, rien ne bouge, puis ça apparaît tout seul ».

## Contact et demande entrante

```
Visiteur remplit le formulaire de contact
       │
       ├─ POST /api/contact (LeSite)
       │  │
       │  ├─ Garde anti-robots maison (lib/anti-bot.ts) : deux signaux,
       │  │      aucun script tiers chargé chez le visiteur
       │  │
       │  ├─ Limite de débit : 5 envois / 10 min par IP
       │  │      (IP lue dans X-Real-IP posé par Nginx)
       │  │
       │  ├─ Valide le sujet (liste fermée) et les champs requis
       │  │
       │  └─ POST /api/public/contact-notification (LeHub)
       │        En-tête : CONTACT_NOTIFY_SECRET
       │
       └─ LeHub :
          1. INSERT ContactRequest (status='nouveau', source='site')
             — les champs de qualification vont dans `context`
          2. Accusé de réception au demandeur (Resend)
          3. Notification admin (e-mail et/ou Telegram, selon la config)
```

**Ce qui a changé** : LeSite n'envoie plus l'e-mail lui-même. Il n'a plus de clé Resend, plus d'adresse destinataire en configuration, et une demande n'est plus un simple e-mail qui peut se perdre dans une boîte : c'est une ligne suivie dans `/admin/contact-requests`.

**Secret partagé** : `CONTACT_NOTIFY_SECRET`, identique des deux côtés.

**Si LeHub ne répond pas** : la demande n'est pas enregistrée et le visiteur voit une erreur. C'est volontaire : mieux vaut lui demander de réessayer que de lui confirmer un envoi qui n'a laissé aucune trace.

**Liste des sujets** : recopiée dans les deux dépôts (`app/api/contact/route.ts` côté LeSite, `lib/contact-request.ts` côté Hub). Toute valeur ajoutée d'un côté doit l'être de l'autre, sinon la saisie manuelle d'une demande ne propose pas le même choix que le formulaire public.

## Flux aucune persistence côté LeSite

Aucune des trois données suivantes n'est jamais stockée localement :

1. **Registrations** : créées en LeHub, jamais en LeSite.
2. **Articles** : éditées en LeHub, fetched at runtime par LeSite.
3. **Preferences** : gérées en LeHub, lues par webhooks.

Le seul état propre au navigateur est le panier d'inscription (`lib/cart-context.tsx`, non persisté) et l'horodatage du rechargement de build périmé (`lib/stale-build.ts`, dans le stockage local, pour ne pas boucler sur un rechargement).
