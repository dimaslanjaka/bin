#!/usr/bin/env bash
set -euo pipefail

echo ""
echo "=== Versions ==="

node -v
yarn -v || true
php -v | head -n 1
python3.11 --version

echo ""
echo "=== Corepack ==="

corepack enable
corepack prepare yarn@stable --activate

echo ""
echo "=== Yarn Berry ==="

if [ -f package.json ]; then
  yarn install
fi

echo ""
echo "=== Composer ==="

if [ -f composer.json ]; then
  composer install
fi

echo ""
echo "=== Python ==="

if [ -f requirements.txt ]; then
  pip install -r requirements.txt
fi