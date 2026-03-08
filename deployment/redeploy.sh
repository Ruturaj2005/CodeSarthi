#!/bin/bash
# ─────────────────────────────────────────────────────────────
# CodeSarthi — Deploy / Update Script
# Run this on the VPS whenever you want to pull latest code
# from the 'deploy' branch and restart the app.
#
# Usage (on VPS):
#   bash /var/www/codesarthi/deployment/redeploy.sh
# ─────────────────────────────────────────────────────────────

set -e

APP_DIR="/var/www/codesarthi"
DEPLOY_BRANCH="deploy"

echo "==> Pulling latest code from branch '${DEPLOY_BRANCH}'..."
cd "$APP_DIR"
git fetch origin
git reset --hard "origin/${DEPLOY_BRANCH}"

echo "==> Installing / updating dependencies..."
npm ci --omit=dev

echo "==> Building Next.js app..."
npm run build

echo "==> Reloading PM2 (zero-downtime)..."
pm2 reload codesarthi

echo "==> Deployment complete! Running app:"
pm2 list
