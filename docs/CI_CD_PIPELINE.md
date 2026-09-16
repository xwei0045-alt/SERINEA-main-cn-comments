# SERINEA CI/CD Pipeline Documentation

This document outlines the Continuous Integration and Continuous Deployment (CI/CD) pipeline for the SERINEA project. The pipeline is automated using GitHub Actions and ensures that all code pushed to the `main` branch is tested, built, and deployed to our EC2 production server seamlessly.

## Overview

The CI/CD pipeline is defined in `.github/workflows/deploy-ec2.yml`. It is triggered automatically on every push to the `main` branch or manually via the GitHub Actions interface (`workflow_dispatch`).

The pipeline consists of two main jobs:
1. **Verify**: Tests and builds the application to ensure code quality.
2. **Deploy**: Uploads the verified code to the EC2 server and activates the new release with zero-downtime rollback capabilities.

---

## 1. Verify Job

The `verify` job runs on an `ubuntu-latest` environment and ensures the codebase is stable before deployment.

### Steps:
- **Checkout Code**: Retrieves the latest code from the repository.
- **Setup Node.js**: Installs Node.js version 18 and caches `npm` dependencies for faster execution.
- **Install & Test**:
  - Runs `npm ci` for a clean installation of dependencies.
  - Executes tests across the `backend` and `lib` directories using `tsx`.
  - Performs type-checking using TypeScript (`tsc --noEmit`).
  - Builds the Next.js application using a placeholder database URL to ensure the build process succeeds without requiring live production credentials.

---

## 2. Deploy Job

The `deploy` job runs only if the `verify` job completes successfully. It handles packaging the application, transferring it to the EC2 instance, and switching over to the new version.

### Environment Secrets Required:
To run this job, the following secrets must be configured in the GitHub repository:
- `EC2_DEPLOY_HOST`: The IP address or domain name of the EC2 server.
- `EC2_DEPLOY_USER`: The SSH username for the EC2 server.
- `EC2_DEPLOY_KNOWN_HOSTS`: The known hosts signature for secure SSH connection.
- `EC2_DEPLOY_SSH_KEY`: The private SSH key used to authenticate with the EC2 server.

### Steps:
- **Wait**: Pauses for 30 seconds before deployment (to allow any pending connections to drain, if applicable).
- **Create Source Package**: 
  - Compresses the codebase into a `.tar.gz` archive.
  - Excludes unnecessary files such as `.git`, `node_modules`, `.next`, environment variables (`.env`, `.env.local`), and large data/document files to keep the package lightweight and secure.
- **Configure SSH Access**: Sets up the SSH key and known hosts on the GitHub Actions runner to securely connect to the EC2 server.
- **Upload and Activate**:
  - Uploads the archive to the EC2 server via `scp`.
  - Executes a deployment script on the EC2 server via `ssh`:
    1. Extracts the new release into a temporary directory (`/opt/serinea-release-[SHA]`).
    2. Copies the existing production environment variables (`.env.local`) to the new release.
    3. Installs dependencies (`npm ci`) and builds the application (`npm run build`) on the server.
    4. Stops the current `serinea` service.
    5. Swaps the old release (`/opt/serinea`) with the new release.
    6. Starts the `serinea` service and performs a health check (`/api/health`).
    7. **Rollback Mechanism**: If the health check fails, it automatically stops the broken service, restores the previous version, and restarts it, preventing prolonged downtime.

## Security Considerations
- Credentials and environment variables are never committed to the repository. They are securely injected from the server's existing `.env.local` file during deployment.
- SSH access is restricted using dedicated deployment keys.