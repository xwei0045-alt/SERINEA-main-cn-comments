#!/usr/bin/env bash
# Run on the SERINEA EC2 host as root (or with sudo).
# Prerequisites:
#   1. DNS A records: serinea.dev + www.serinea.dev -> this instance Elastic IP
#   2. Security group allows inbound TCP 80 and TCP 443 from 0.0.0.0/0
#   3. Nginx already proxies HTTP :80 -> Next.js :5173
set -euo pipefail

DOMAINS=(serinea.dev www.serinea.dev)
EMAIL="${CERTBOT_EMAIL:-serinea-ops@example.com}"
NGINX_CONF=/etc/nginx/conf.d/serinea.conf

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash $0"
  exit 1
fi

echo "Installing certbot..."
if command -v dnf >/dev/null 2>&1; then
  dnf install -y certbot python3-certbot-nginx
elif command -v apt-get >/dev/null 2>&1; then
  apt-get update
  apt-get install -y certbot python3-certbot-nginx
else
  echo "Unsupported package manager. Install certbot + nginx plugin manually."
  exit 1
fi

cat > "${NGINX_CONF}" <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name serinea.dev www.serinea.dev;

    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

nginx -t
systemctl reload nginx

echo "Requesting Let's Encrypt certificate for ${DOMAINS[*]}..."
certbot --nginx \
  --non-interactive \
  --agree-tos \
  --email "${EMAIL}" \
  --redirect \
  -d serinea.dev \
  -d www.serinea.dev

nginx -t
systemctl reload nginx

echo "Checking listeners:"
ss -lntp | grep -E ':80|:443' || true

echo "Local HTTPS health check:"
curl --fail --silent https://127.0.0.1/api/health -H 'Host: serinea.dev' -k || \
  curl --fail --silent https://serinea.dev/api/health

echo
echo "HTTPS enabled. Public checks:"
echo "  curl -I https://serinea.dev/api/health"
echo "  curl -I https://www.serinea.dev/map"
