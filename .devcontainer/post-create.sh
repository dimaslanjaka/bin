#!/usr/bin/env bash
set -euo pipefail

echo ""
echo "=== Runtime Versions ==="

printf "Node   : "
node -v

printf "npm    : "
npm -v

printf "PHP    : "
php -v | head -n 1

printf "Python : "
python --version

echo ""
echo "=== Enable Corepack ==="

corepack enable

echo ""
echo "=== Activate Yarn Berry ==="

# Use latest stable Yarn Berry
corepack prepare yarn@stable --activate

printf "Yarn   : "
yarn -v

echo ""
echo "=== Install Global Node Tools ==="

npm install -g pnpm

echo ""
echo "=== Project Setup ==="

if [ -f package.json ]; then
  yarn install
fi

if [ -f composer.json ]; then
  composer install
fi

if [ -f requirements.txt ]; then
  pip install -r requirements.txt
fi

echo ""
echo "=== Done ==="