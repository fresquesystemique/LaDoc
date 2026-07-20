# LaDoc

Documentation publique du SI de La Fresque Systémique (LeHub, LeSite, LeBoard), publiée sur [docs.fresquesystemique.org](https://docs.fresquesystemique.org).

## Stack

Site statique [Docusaurus 3](https://docusaurus.io) (preset classic, TypeScript), recherche locale et schémas Mermaid.

## Développement local

```bash
git clone https://github.com/raphaeldeux/LaDoc.git
cd LaDoc
npm install
npm start          # http://localhost:3000
```

Prérequis : Node 18+.

## Structure

```
contenu/           # les pages de la documentation (dossier docs de Docusaurus)
  accueil.md       # vue d'ensemble du SI
  lehub/           # doc LeHub (index + 7 pages)
  lesite/          # doc LeSite (index + 7 pages)
  leboard/         # doc LeBoard (index + 7 pages)
  si/              # le SI transverse
docs/superpowers/  # specs et plans de chantier (non publiés)
sidebars.ts        # arborescence du menu latéral
```

Le contenu vit dans `contenu/` et non dans `docs/`, ce dernier étant déjà occupé par les specs de chantier.

## Contenu sensible

Ce site est public. Les accès, IP, ports, chemins serveur et procédures opérationnelles vivent dans le repo privé `LeRunbook`.

## Déploiement

Sur le serveur :

```bash
./deploy.sh        # npm ci && npm run build puis rsync vers le répertoire servi par Nginx
```
