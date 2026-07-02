# LaDoc — Documentation publique du SI Fresque Systémique

**Date** : 2026-07-02
**Statut** : validé par Raphaël (Telegram, 2026-07-02)

## Objectif

Publier sur `docs.fresquesystemique.org` la documentation développeur et fonctionnelle
des trois applications du SI (LeHub, LeSite, LeBoard), en vue de rendre le code
open source. Site statique Hugo, librement accessible.

## Périmètre

Retenu (validé) :
- Vue d'ensemble du SI : architecture globale, articulation des trois applis, infra VPS.
- Une section par appli avec volet **fonctionnalités** (à quoi sert l'appli, pour qui,
  grandes features) et volet **technique** (stack, structure du code, modèle de données,
  lancement en local, déploiement).

Hors périmètre (pour l'instant) :
- Guide de contribution (conventions, workflow git, PR) — écarté au cadrage.
- Traduction anglaise — la structure doit être prête (Hugo multilingue) mais seul
  le français est rédigé.

## Décisions de cadrage

| Sujet | Décision |
|---|---|
| Dépôt | Nouveau dépôt GitHub `raphaeldeux/LaDoc` |
| Générateur | Hugo (extended) |
| Thème | Book (alex-shpak/hugo-book — choix révisé par Raphaël au jalon 1, initialement Hextra) |
| Langue | Français d'abord, arborescence prête pour le multilingue |
| Hébergement | VPS OVH existant, site statique servi par Nginx |
| URL | `docs.fresquesystemique.org` (DNS déjà pointé sur le VPS) |

## Architecture

```
GitHub raphaeldeux/LaDoc
        │  git push / git pull
        ▼
VPS ~/LaDoc  ──deploy.sh──►  hugo build  ──►  /var/www/ladoc
                                                    ▲
                              Nginx (HTTPS certbot) │ docs.fresquesystemique.org
```

- Pas de conteneur : build Hugo sur le VPS, fichiers statiques servis par le Nginx hôte,
  même logique que les autres sites statiques du VPS.
- Hugo et le thème Book installés sur le VPS (submodule git,
  pas de dépendance Go).
- Certificat HTTPS via certbot, comme les autres sous-domaines.

## Structure du contenu

```
content/
  _index.md                 # Accueil : présentation de l'écosystème FS
  si/                       # Le SI en un coup d'œil
    _index.md               #   architecture globale, articulation des applis
    infrastructure.md       #   VPS : nginx, Docker, PostgreSQL, Plausible, monitoring
  lehub/
    _index.md               # présentation
    fonctionnalites.md      # à quoi sert LeHub, pour qui, grandes features
    stack.md                # stack technique + structure du code
    donnees.md              # modèle de données
    developpement.md        # lancer en local
    deploiement.md          # déployer
  lesite/                   # même gabarit
  leboard/                  # même gabarit
```

Le gabarit des cinq pages par appli est identique pour les trois applis ; le contenu
est rédigé en lisant les codebases (`~/LeHub`, `~/LeSite`, `~/LeBoard`).

Attention : la doc est publique. Aucun secret, mot de passe, token, IP sensible ni
détail exploitable (ports internes, chemins de credentials) ne doit y figurer.

## Déploiement

1. Installer Hugo extended sur le VPS.
2. Dépôt `~/LaDoc` : site Hugo + thème Book + contenu.
3. `deploy.sh` à la racine : `hugo --minify` → rsync vers `/var/www/ladoc`.
4. Conf Nginx `docs-fresquesystemique` (sites-available + symlink) servant
   `/var/www/ladoc`, puis certbot pour le HTTPS.
5. Dépôt poussé sur GitHub (`raphaeldeux/LaDoc`).

## Méthode de rédaction et jalons

Livraison par étapes, validation de Raphaël au fil de l'eau :

1. **Squelette en ligne** : site Hugo + Book déployé sur l'URL finale, arborescence
   complète avec pages provisoires.
2. **Vue d'ensemble du SI** : accueil + section « Le SI en un coup d'œil ».
3. **LeHub** (l'appli la plus riche), puis **LeSite**, puis **LeBoard** :
   fonctionnalités + technique pour chacune.

## Tests / vérification

- Build Hugo sans erreur ni lien interne cassé (`hugo --printPathWarnings`).
- Site accessible en HTTPS sur `docs.fresquesystemique.org`, recherche et navigation
  fonctionnelles.
- Relecture de chaque section par Raphaël avant de passer à la suivante.
