# AWS deployment

## Selected development architecture

The first data-backed deployment uses one Amazon Linux 2023 EC2 instance in `ap-southeast-2`:

```text
Internet -> Security group (HTTP 80) -> Nginx -> Next.js :5173
                                                   |
                                                   -> local PostgreSQL 15
```

PostgreSQL listens locally and is not exposed by the security group. The application connects through a Unix socket with peer authentication, so no database password is stored in Git, EC2 user data, or application environment settings.

This is the lowest-complexity development deployment for the current 32,569-row dataset. A production launch should separate the database into RDS, add HTTPS and a domain, configure backups and monitoring, and use a multi-instance application tier.

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

Every import has a version in `dataset_versions`. Data is inserted and reconciled inside one transaction. The `active` pointer changes only after both database row counts match the validated CSV totals, so an interrupted import leaves the previous version active.

After inspecting a future handover, copy it into `data/`, update the loader if its schema changed, then run:

```bash
npm run data:validate
DATABASE_URL="postgresql:///serinea?host=/var/run/postgresql" npm run db:migrate
DATABASE_URL="postgresql:///serinea?host=/var/run/postgresql" npm run db:import -- --version=iteration2
```

Whether the future dataset replaces or merges with `iteration1` must be decided after its scope and keys are known. The versioned tables preserve `iteration1` for comparison and rollback.

## Current limitations

- HTTP only until a domain and TLS certificate are available.
- One development server; no automatic failover.
- PostgreSQL data is on the EC2 EBS volume; snapshots/backups are not yet configured.
- Public-transport journeys still require GTFS and a routing implementation.
