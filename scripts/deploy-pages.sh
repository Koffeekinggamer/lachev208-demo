#!/usr/bin/env bash
# Build and publish dist/ to the gh-pages branch (GitHub Pages "Deploy from a branch").
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
touch dist/.nojekyll
tmp=$(mktemp -d)
cp -r dist/. "$tmp"
cd "$tmp"
git init -q -b gh-pages
git add -A
git -c user.name="Koffeekinggamer" -c user.email="Koffeekinggamer@users.noreply.github.com" commit -qm "Deploy $(date -u +%Y-%m-%dT%H:%MZ)"
git push -f "https://github.com/Koffeekinggamer/lachev208-demo.git" gh-pages
rm -rf "$tmp"
