---
title: Fonctionnalités
weight: 1
---

# Fonctionnalités

LeHub couvre toute la vie de l'association : gestion des membres et de leurs parcours, organisation des ateliers, paiements, contenus éditoriaux, e-mails transactionnels et badges numériques. Ce catalogue suit le découpage de l'application en deux espaces, membres et admin.

## Espace membres

### Tableau de bord

Chaque membre arrive sur un tableau de bord personnalisé qui s'adapte à son rôle (adhérent, animateur·ice, formateur·ice) :

- statut de cotisation en pastille cliquable (À jour, Expirée, Interne, Exempt), synchronisé automatiquement avec HelloAsso ;
- progression dans les parcours (deux axes indépendants : animateur·ice / formateur·ice, chacun décliné citoyen·ne / pro) ;
- badges Open Badges obtenus.

### Profil

Photo personnalisée ou Gravatar, bio, tagline « En une ligne », genre, localisation, téléphone, liaison LinkedIn (OAuth), changement de mot de passe et suppression de compte.

### Annuaire des membres

Annuaire interne en opt-in explicite (consentement RGPD daté). Recherche par nom, filtre par étiquette, fiche détaillée avec tagline, genre et lien LinkedIn.

### Ateliers et événements

- **Création d'ateliers** par les animateur·ices habilité·es : type (atelier ou formation), contexte (grand public ou inter-organisations), organisation rattachée, adresse complète avec autocomplétion, prix personnalisés par tiers, et choix du modèle de plateau pour les ateliers en ligne.
- **Multi-animateurs** : co-animateur·ices choisi·es à la création ou ajouté·es ensuite par l'animateur·ice responsable (lead). Chacun·e voit ses ateliers dans « Mes événements » avec un badge de rôle et peut pointer les présences.
- **Pastille nouveaux inscrits** : chaque animateur·ice voit en un coup d'œil, sur « Mes événements », si de nouvelles personnes se sont inscrites à l'un de ses ateliers depuis sa dernière visite.
- **Liste d'attente** pour les ateliers complets, avec notification automatique quand une place se libère.
- **Ateliers annulés** : quand un atelier est annulé, la liste des inscrit·es reste visible mais figée (grisée), pour garder une trace sans laisser croire que l'atelier a toujours lieu.
- **Enquête de satisfaction** : après l'atelier, les participant·es reçoivent un lien pour évaluer leur expérience sur plusieurs critères (accueil, contenu, animation, organisation, objectifs). L'animateur·ice retrouve les résultats agrégés (dont un score de recommandation) et les commentaires libres directement sur la fiche de son atelier.
- **Atelier test** : un·e animateur·ice peut créer un atelier de formation éphémère (expiration automatique après 24 h) pour s'exercer sur LeBoard.

### Ressources

- **Médiathèque** : articles, livres, rapports, podcasts et vidéos, avec filtres multi-critères (type, thématique, langue) et compteurs en direct. Le contenu est géré par l'admin.
- **Supports pédagogiques** : ressources versionnées, dont l'accès dépend du rôle (rubrique Animer pour les animateur·ices, Former pour les formateur·ices).
- **Mes organisations** : les organisations auxquelles le membre est rattaché et leurs événements.

### Droits d'utilisation professionnelle

Les membres disposant d'une habilitation professionnelle déclarent leurs utilisations payantes de la fresque (rapport d'usage, paiement des droits via HelloAsso).

## Espace admin

L'accès admin est un droit séparé du rôle pédagogique : un·e formateur·ice peut être admin sans changer de rôle (voir [Stack technique]({{< relref "stack" >}})).

### Événements

Publication, modération, tarification personnalisée, affectation de plusieurs animateur·ices avec rôles lead/co, duplication, suppression.

Une personne inscrite peut annuler elle-même son inscription depuis un lien reçu par e-mail. Le remboursement associé passe par défaut par une notification à l'admin (e-mail ou Telegram), qui le traite manuellement dans HelloAsso ; il peut devenir automatique une fois le privilège de remboursement accordé à l'association sur HelloAsso.

### Membres et participants

- **Membres** : rôles pédagogiques, habilitations animation et formation indépendantes, type de licence (grand public, inter-organisations, interne exempté de cotisation), accès admin, étiquettes d'annuaire, suivi des cotisations.
- **CRM participants** : toute personne inscrite à un atelier, membre ou non. Édition, notes internes, étiquettes libres, historique d'ateliers, anonymisation RGPD à la suppression.
- **Invitations** : les nouveaux membres sont invités par lien à jeton, avec leur parcours pré-positionné.

### Organisations

Fiches organisation (type, SIRET avec autocomplétion via l'API publique recherche-entreprises, adresse), gestionnaires (liaison membre ↔ organisation) et rattachement aux ateliers inter-organisations.

### Contenus

- **Actualités** : articles en Markdown complet, slug généré, catégorie, extrait, image convertie en WebP, PDF transformé en carrousel sur LeSite, choix de l'auteur. La publication déclenche la revalidation immédiate de LeSite.
- **Médiathèque** : ajout manuel ou import CSV, édition, plafond de trois thématiques par ressource.
- **Supports pédagogiques** : versionnement par section et par emplacement, avec contrôle d'accès animateur·ice ou formateur·ice.

### Ateliers en ligne

C'est l'éditeur des **modèles de plateau** utilisés par LeBoard : étapes, lots de cartes, titres personnalisés et placement des cartes dans les cellules d'une matrice, avec un aperçu du plateau grandeur réelle à jour en temps réel (sauvegarde automatique, pas de bouton « Enregistrer »).

Un lot peut aussi être un diaporama : l'admin choisit une présentation dans un compte Google Slides partagé, sélectionne les diapositives à exporter, et LeHub les convertit en images (avec leurs notes) pour LeBoard. Un badge de fraîcheur signale si la présentation source a changé depuis le dernier export, sans resynchronisation automatique.

### E-mails

Éditeur par blocs (WYSIWYG) des dix e-mails transactionnels : invitation, confirmation d'inscription, réinitialisation de mot de passe, rappel J-2, expirations, liste d'attente, contact, test de configuration. Variables de substitution, aperçu à la charte, envoi de test, activation individuelle de chaque e-mail.

### Pilotage et paramètres

- Tableau de bord avec indicateurs (ateliers passés, participants, revenus).
- **Parcours** : gestion des deux axes de progression et émission des badges associés.
- **Paramètres** : identité de l'association (nom, logo, adresse), configuration e-mail, notifications admin (e-mail ou Telegram par type d'événement), intégrations (HelloAsso, bot Telegram).

## Open Badges 3.0

LeHub émet des badges numériques vérifiables au standard Open Badges 3.0 (VerifiableCredential signé) :

- cinq types : Animateur·ice grand public / pro, Formateur·ice grand public / pro, Participant·e ;
- page publique de badge avec logo, niveau, QR code et lien de vérification ;
- vérification en ligne sur `/verify` à partir d'un identifiant de badge.

## Tarification

Deux segments de public (grand public et inter-organisations), chacun avec trois tiers de prix (solidaire, classique, soutien). Les prix recommandés se configurent dans l'admin et restent personnalisables atelier par atelier.

Des **codes de réduction** peuvent compléter cette grille : un pourcentage ou un montant fixe, optionnellement réservé à un e-mail précis ou à un seul atelier, avec un nombre d'utilisations maximum et une date d'expiration. Un code à 100 % permet une inscription gratuite. L'admin suit l'historique d'utilisation de chaque code (qui, pour quel atelier, quelle remise) depuis sa fiche.

## Authentification et sécurité

- Connexion par mot de passe (avec « Se souvenir de moi ») ou LinkedIn OAuth, avec flux de liaison de compte.
- Réinitialisation de mot de passe par e-mail, page de déconnexion dédiée.
- Cookie de session partageable avec LeSite (pont d'auth, voir [Architecture des échanges]({{< relref "/si/architecture" >}})).
- SSO animateur·ice vers LeBoard : la session LeHub est vérifiée puis échangée contre un jeton d'accès à durée courte (12 h) propre au plateau.
- Bascule directe admin ↔ espace membre depuis le menu profil.
- Suppression douce (soft delete) des membres et participants, anonymisation RGPD.
