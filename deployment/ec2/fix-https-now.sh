#!/usr/bin/env bash
# One-shot HTTPS for serinea.dev — run ON the EC2 instance as root.
# Also: AWS security group must allow inbound TCP 443 (and 80) from 0.0.0.0/0.
set -euo pipefail

EMAIL="${CERTBOT_EMAIL:-admin@serinea.dev}"
APP_DIR="${SERINEA_DIR:-}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "sudo bash $0"
  exit 1
fi

echo "==> Installing certbot"
if command -v dnf >/dev/null 2>&1; then
  dnf install -y certbot python3-certbot-nginx
elif command -v yum >/dev/null 2>&1; then
  yum install -y certbot python3-certbot-nginx
elif command -v apt-get >/dev/null 2>&1; then
  apt-get update && apt-get install -y certbot python3-certbot-nginx
fi

# Find app if present (optional redeploy of CSP fix)
if [[ -z "${APP_DIR}" ]]; then
  for candidate in /home/serinea/SERINEA /home/ec2-user/SERINEA /opt/serinea /var/www/serinea; do
    if [[ -f "${candidate}/package.json" ]]; then
      APP_DIR="${candidate}"
      break
    fi
  done
fi

if [[ -n "${APP_DIR}" && -d "${APP_DIR}/.git" ]]; then
  echo "==> Pulling latest app from ${APP_DIR}"
  sudo -u "$(stat -c '%U' "${APP_DIR}" 2>/dev/null || stat -f '%Su' "${APP_DIR}")" \
    bash -lc "cd '${APP_DIR}' && git pull --ff-only && npm ci && npm run build" || \
    bash -lc "cd '${APP_DIR}' && git pull --ff-only && npm ci && npm run build"
  systemctl restart serinea || systemctl restart serinea.service || true
fi

echo "==> Writing Nginx HTTP vhost for ACME + proxy"
cat > /etc/nginx/conf.d/serinea.conf <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name serinea.dev www.serinea.dev _;

    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

nginx -t
systemctl reload nginx

echo "==> Issuing Let's Encrypt cert (needs public :80 reachable)"
certbot --nginx \
  --non-interactive \
  --agree-tos \
  --email "${EMAIL}" \
  --redirect \
  --keep-until-expiring \
  -d serinea.dev \
  -d www.serinea.dev

nginx -t
systemctl reload nginx

echo "==> Listeners"
ss -lntp | grep -E ':80|:443' || netstat -lntp | grep -E ':80|:443' || true

echo "==> Local checks"
curl -fsS -o /dev/null -w "http health %{http_code}\n" http://127.0.0.1/api/health || true
curl -fkSs -o /dev/null -w "https health %{http_code}\n" https://127.0.0.1/api/health -H 'Host: serinea.dev' || \
  curl -fsS -o /dev/null -w "https public %{http_code}\n" https://serinea.dev/api/health

echo "Done. Public: https://serinea.dev  https://www.serinea.dev"
