#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
npm ci
npm run build
rsync -a --delete build/ /var/www/ladoc/
echo "✅ Déployé → https://docs.fresquesystemique.org"
