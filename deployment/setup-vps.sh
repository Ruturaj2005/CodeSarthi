#!/bin/bash
# ─────────────────────────────────────────────────────────────
# CodeSarthi — VPS Initial Setup Script
# Run ONCE on a fresh Hostinger VPS (Ubuntu 22.04)
#
# Usage:
#   chmod +x deployment/setup-vps.sh
#   sudo bash deployment/setup-vps.sh
# ─────────────────────────────────────────────────────────────

set -e

DOMAIN="codesarthi.vipulphatangare.site"
APP_DIR="/var/www/codesarthi"
REPO_URL="https://github.com/Ruturaj2005/CodeSarthi.git"
DEPLOY_BRANCH="deploy"
NODE_VERSION="20"

echo "==> [1/8] Updating system packages..."
apt-get update -y && apt-get upgrade -y

echo "==> [2/8] Installing Node.js ${NODE_VERSION}..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt-get install -y nodejs git nginx certbot python3-certbot-nginx ufw

echo "==> [3/8] Installing PM2 globally..."
npm install -g pm2

echo "==> [4/8] Setting up firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "==> [5/8] Cloning repository..."
mkdir -p "$APP_DIR"
git clone --branch "$DEPLOY_BRANCH" "$REPO_URL" "$APP_DIR"

echo "==> [6/8] Installing app dependencies (including devDeps needed for build)..."
cd "$APP_DIR"
npm ci

echo ""
echo "========================================================"
echo "  IMPORTANT: Create your .env.local before building!"
echo "  Run:  nano ${APP_DIR}/.env.local"
echo "  (copy from .env.example and fill in real values)"
echo "========================================================"
echo ""
read -p "Press ENTER once .env.local is ready..."

echo "==> [7/8] Building Next.js app..."
cd "$APP_DIR"
npm run build

echo "==> [8/8] Starting app with PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash -

echo ""
echo "==> App is running on port 3000."
echo "==> Now configure Nginx and SSL:"
echo "    bash deployment/setup-nginx.sh"
