# Automatic EC2 deployment

Pushing a verified commit to main can deploy SERINEA to EC2 through
.github/workflows/deploy-ec2.yml. The workflow tests, type-checks, and builds
before it uploads a source archive. It deliberately excludes .env.local, so
RDS and Groq credentials remain on the server.

## Required GitHub Actions secrets

Create these repository secrets before expecting the deploy job to run:

| Secret | Value |
| --- | --- |
| EC2_DEPLOY_HOST | The current EC2 Elastic IP or stable DNS name. |
| EC2_DEPLOY_USER | ec2-user. |
| EC2_DEPLOY_SSH_KEY | A dedicated, unencrypted ED25519 private deployment key. |
| EC2_DEPLOY_KNOWN_HOSTS | The pinned ED25519 known-hosts entry for the EC2 host. |

Use a dedicated deploy key instead of a developer's personal SSH key. Add only
its public key to /home/ec2-user/.ssh/authorized_keys on the server. Keep the
private key solely in GitHub Actions secrets; never commit or send it in chat.

## First-run checks

After adding the secrets, run Deploy main to EC2 manually from the Actions tab
once. Confirm that the workflow health check passes, then check:

~~~text
https://serinea.dev/api/health
https://serinea.dev/api/compare?prefs=park&limit=3
~~~

The deploy job is skipped until all required secrets are configured. This avoids
accidental failed deployments while the repository is being set up.
