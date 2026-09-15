# AWS deployment

## Selected development architecture

The first data-backed deployment uses one Amazon Linux 2023 EC2 instance in `ap-southeast-2`:

```text
Internet -> Security group (HTTP 80 + HTTPS 443)
         -> Nginx
         -> Next.js :5173
              |
              -> PostgreSQL / PostGIS (RDS or local)
```

Public entry is Nginx on **80** (HTTP) and **443** (HTTPS). Next.js stays private on **5173**.

`.dev` domains are on the HSTS preload list, so browsers always use HTTPS. Without Nginx listening on 443 with a valid certificate, `https://serinea.dev` fails even when plain HTTP on the Elastic IP works.

Current live target:

| Item | Value |
| --- | --- |
| Domains | `serinea.dev`, `www.serinea.dev` |
| Elastic IP | `16.176.55.133` |
| Public ports | 80 (Nginx), 443 (Nginx + TLS) |
| App port | 5173 (localhost only) |

## Automated bootstrap

`deployment/ec2/bootstrap.sh` performs these visible deployment steps:

1. Creates a 2 GB swap file for a small development instance.
2. Installs Node.js 22, PostgreSQL 15, Nginx, and Git.
3. Creates the local `serinea` Linux user, database role, and database.
4. Pulls the exact `backend-integration` branch from GitHub.
5. Runs the schema migration and imports dataset version `iteration1`.
6. Builds Next.js and installs a restartable systemd service.
7. Configures Nginx on port 80 and verifies `/api/health`.

Bootstrap progress is recorded on the instance at `/var/log/serinea-bootstrap.log`.

## Future dataset process

The application reads its current records from PostgreSQL. Dataset changes should be reviewed and loaded through a separate database process, not through the application deployment.

The deployed application reads the online database directly. A new dataset must be loaded into PostgreSQL through a separately reviewed data process; deployment no longer imports local CSV files. Deployment checks that both POIs and synthetic subsidies are populated. To update the schema and check online data, run:

```bash
DATABASE_URL="postgresql:///serinea?host=/var/run/postgresql" npm run db:migrate
DATABASE_URL="postgresql:///serinea?host=/var/run/postgresql" npm run data:online-check
```

Whether the future dataset replaces or merges with `iteration1` must be decided after its scope and keys are known. The versioned tables preserve `iteration1` for comparison and rollback.

## Enable HTTPS (required for serinea.dev)

1. Open **TCP 443** (and keep **TCP 80**) on the EC2 security group from `0.0.0.0/0`.
2. Confirm DNS A records for `serinea.dev` and `www.serinea.dev` point at the Elastic IP.
3. On the instance as root:

```bash
export CERTBOT_EMAIL='your-team-email@monash.edu'
sudo bash /path/to/repo/deployment/ec2/enable-https.sh
```

The script installs Certbot, updates Nginx for both hostnames, issues a Let's Encrypt certificate, and redirects HTTP → HTTPS.

Verify from your laptop:

```bash
curl -I https://serinea.dev/api/health
curl -I https://www.serinea.dev/map
```

## Current limitations

- HTTPS depends on security-group 443 + Certbot on the instance (`enable-https.sh`).
- One application server; no automatic failover.
- Confirm whether Postgres is still local EBS or Lucian's RDS; backups still need an owner.
- Public-transport journeys still require GTFS and a routing implementation.
