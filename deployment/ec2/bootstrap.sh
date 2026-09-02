#!/usr/bin/env bash
set -Eeuo pipefail

exec > >(tee -a /var/log/serinea-bootstrap.log) 2>&1

readonly REPOSITORY_URL="https://github.com/neervasa00000000/SERINEA.git"
readonly DEPLOYMENT_BRANCH="backend-integration"
readonly APPLICATION_DIRECTORY="/opt/serinea"
readonly DATABASE_URL="postgresql:///serinea?host=/var/run/postgresql"

echo "Starting SERINEA EC2 bootstrap."

# A small swap file prevents dependency installation from exhausting a micro instance.
if ! swapon --show | grep -q "/swapfile"; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi

dnf install -y \
  git \
  nginx \
  nodejs22 \
  nodejs22-npm \
  postgresql15 \
  postgresql15-server

if ! id serinea >/dev/null 2>&1; then
  useradd --system --create-home --home-dir /var/lib/serinea --shell /bin/bash serinea
fi

if [[ ! -s /var/lib/pgsql/data/PG_VERSION ]]; then
  postgresql-setup --initdb
fi
systemctl enable --now postgresql

# Matching Linux and PostgreSQL role names allow password-free local peer authentication.
if ! runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='serinea'" | grep -q 1; then
  runuser -u postgres -- createuser serinea
fi
if ! runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_database WHERE datname='serinea'" | grep -q 1; then
  runuser -u postgres -- createdb --owner=serinea serinea
fi

if [[ ! -d "${APPLICATION_DIRECTORY}/.git" ]]; then
  install -d -o serinea -g serinea "${APPLICATION_DIRECTORY}"
  runuser -u serinea -- git clone \
    --branch "${DEPLOYMENT_BRANCH}" \
    --single-branch \
    "${REPOSITORY_URL}" \
    "${APPLICATION_DIRECTORY}"
else
  runuser -u serinea -- git -C "${APPLICATION_DIRECTORY}" fetch origin "${DEPLOYMENT_BRANCH}"
  runuser -u serinea -- git -C "${APPLICATION_DIRECTORY}" checkout "${DEPLOYMENT_BRANCH}"
  runuser -u serinea -- git -C "${APPLICATION_DIRECTORY}" pull --ff-only origin "${DEPLOYMENT_BRANCH}"
fi

runuser -u serinea -- bash -lc "
  cd '${APPLICATION_DIRECTORY}'
  npm ci
  DATABASE_URL='${DATABASE_URL}' npm run db:migrate
  DATABASE_URL='${DATABASE_URL}' npm run db:import -- --version=iteration1
  npm run build
"

cat > /etc/systemd/system/serinea.service <<EOF
[Unit]
Description=SERINEA Next.js application
After=network-online.target postgresql.service
Wants=network-online.target
Requires=postgresql.service

[Service]
Type=simple
User=serinea
Group=serinea
WorkingDirectory=${APPLICATION_DIRECTORY}
Environment=NODE_ENV=production
Environment=REACH_DATA_SOURCE=database
Environment=DATABASE_URL=${DATABASE_URL}
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/nginx/conf.d/serinea.conf <<'EOF'
server {
    listen 80 default_server;
    server_name _;

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

rm -f /etc/nginx/conf.d/default.conf
if command -v setsebool >/dev/null 2>&1; then
  setsebool -P httpd_can_network_connect 1 || true
fi

systemctl daemon-reload
systemctl enable --now serinea
systemctl enable --now nginx

for attempt in {1..30}; do
  if curl --fail --silent http://127.0.0.1:5173/api/health >/dev/null; then
    echo "SERINEA deployment is healthy."
    exit 0
  fi
  sleep 2
done

echo "SERINEA did not become healthy before the bootstrap timeout."
systemctl status serinea --no-pager || true
exit 1
