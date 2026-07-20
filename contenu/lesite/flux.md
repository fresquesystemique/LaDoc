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
                         4. Envoie confirmation email + facture
                      │
                      └─ HelloAsso redirige vers
                         `https://fresquesystemique.org/confirmation?orderId=...`
                      │
                      └─ Visiteur voit confirmation LeSite
```

**Détails clés** :

- LeSite n'a aucun rôle dans la validation ou la création de données : tout passe par le rewrite vers l'API LeHub.
- Le visiteur ne voit jamais la vraie URL du hub (rewrite transparent).
- La facture et le email de confirmation sont émis par LeHub.
- LeSite reçoit le webhook via GET `?orderId=...` (pas de webhook entrant).

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
              ├─ Lit cookie session (décode JWE)
              │
              ├─ SI isAdmin=true → laisse passer (admin voit vrai site)
              │  │
              │  └─ Affiche ChantierBar pour basculer
              │
              ├─ SI crawler social → laisse passer (OG tags vus)
              │
              └─ SINON → rewrite vers /chantier
                          (visiteur voit page construction)
```

**Détails clés** :

- Flag `chantier` piloté depuis LeHub (`/admin/parametres` → Paramètres).
- Cookie session partagé sur `.fresquesystemique.org` (prod) ou localhost (dev).
- Nom du cookie doit être identique aux trois endroits : LeHub + LeSite middleware + LeSite lib.
- Robots sociaux (LinkedIn, Facebook, etc.) passent pour voir les vraies balises OG.

**Pièges** :

- Si `NEXTAUTH_SECRET` ou `AUTH_SESSION_COOKIE_NAME` n'est pas synchronisé, le cookie ne se déchiffre pas → tout le monde vu `/chantier`.
- Flag `chantier` est cachée 15 sec → un changement dans LeHub prend ~15 sec à propager.

## Revalidation ISR et webhook

```
Admin LeHub publie un article
       │
       └─→ Webhook LeHub appelle
           POST https://fresquesystemique.org/api/revalidate
               Header: x-revalidate-secret: <valeur>
           │
           ├─ Vérifie secret (401 si mauvais)
           │
           ├─ Appel revalidatePath() pour :
           │   - /blog
           │   - /evenements
           │   - /mediatheque
           │
           └─ Retour {revalidated: true}
                      (cache ISR invalidé, prochaine requête régénère)
```

**Système de cache** :

- Pages cachées avec `revalidate: 300` (5 min).
- Après 5 min, prochaine requête interroge LeHub API et régénère.
- Webhook force revalidation **immédiate** → visiteur voit le contenu nouveau sous ~1 sec.

**Si le webhook est perdu** :

- Changement reste invisible jusqu'à la prochaine revalidation (max 5 min).
- LeSite continue de servir le cache ancien : pas d'erreur pour le visiteur.

**Si `REVALIDATE_SECRET` n'est pas configuré** :

- Webhook depuis LeHub échoue en 401.
- LeHub devrait logger l'erreur (voir LeRunbook pour retry logic).

## Contact et notification

```
Visiteur remplit formulaire contact
       │
       ├─ POST /api/contact (LeSite)
       │  │
       │  ├─ Valide (email, message)
       │  │
       │  ├─ Envoie email via Resend
       │  │  (To: CONTACT_EMAIL)
       │  │
       │  └─ Appel POST /api/public/contact-notification (LeHub)
       │     Paramètres : contact CONTACT_NOTIFY_SECRET
       │     (LeHub vérifie secret + config Paramètres)
       │
       └─ LeHub décide :
          - Email admin ? (config LeHub)
          - Notif Telegram ? (config LeHub)
          - Webhook externe ? (futur)
```

**Secrets partagés** :

- `RESEND_API_KEY` : LeSite seulement (envoie email directement).
- `CONTACT_NOTIFY_SECRET` : LeSite + LeHub (authentification webhook).
- `CONTACT_EMAIL` : adresse destinataire Resend (LeSite).

**Si LeHub ne répond pas** :

- Email quand même envoyé via Resend (LeSite).
- LeHub notification optionnelle (no-op si indisponible).

## Flux aucune persistence côté LeSite

Aucune des trois données suivantes n'est jamais stockée localement :

1. **Registrations** : créées en LeHub, jamais en LeSite.
2. **Articles** : éditées en LeHub, fetched at runtime par LeSite.
3. **Preferences** : gérées en LeHub, lues par webhooks.

Le seul état client-side optionnel en LeSite est le panier (composant `CartContext`, non persisté, pour UX d'inscription multi-ateliers).
