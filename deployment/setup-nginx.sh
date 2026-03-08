#!/bin/bash
# ─────────────────────────────────────────────────────────────
# CodeSarthi — Nginx + SSL Setup
# Run AFTER setup-vps.sh and after DNS A-record is pointing
# to this VPS IP address.
#
# Usage:
#   chmod +x deployment/setup-nginx.sh
#   sudo bash deployment/setup-nginx.sh
# ─────────────────────────────────────────────────────────────

set -e

DOMAIN="codesarthi.vipulphatangare.site"
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"
EMAIL="your-email@example.com"   # <-- change to your real email

echo "==> Writing Nginx config for ${DOMAIN}..."

cat > "$NGINX_CONF" <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    # Redirect HTTP -> HTTPS (certbot will update this block)
    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        client_max_body_size 50M;
    }
}
EOF

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

echo "==> Obtaining SSL certificate via Let's Encrypt..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect

systemctl reload nginx
echo "==> SSL configured. Visit: https://${DOMAIN}"
