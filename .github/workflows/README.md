# GitHub Workflows

**The `pr-open.yml`, `pr-close.yml`, and `merge.yml` workflows have been customized and worked upon specifically for the Notify project. The remaining workflows are templates added from the [quickstart-openshift](https://github.com/bcgov/quickstart-openshift) project.**

## pr-open.yml — PR Opened

**Triggers:** Pull request events (opened, synchronize, etc.).

Builds, deploys, and tests the backend for each pull request.

**How it works:**

- **Build** — Builds the backend Docker image and pushes it to GHCR tagged with the PR number (`ghcr.io/<repo>:<PR number>`) and `latest`
- **Deploy** — Delegates to the reusable `.deployer.yml` (Helm Deployer) workflow, which:
  - Rolls back any stuck previous deployment (`pending-upgrade` status) for the same PR
  - Packages the Helm chart from `charts/app` with the app version and run number
  - Runs `helm upgrade --install` to deploy the release named `<repo-name>-<PR number>` to OpenShift, passing the image tag, repository, database user, and any extra parameters
  - Cleans up completed pods after deployment
- **Test** — Runs integration tests via the reusable `.tests.yml` workflow (currently disabled until test directories are added)
- **Results** — A final job aggregates all results and fails the workflow if any job failed or was canceled

## pr-close.yml — PR Closed

**Triggers:** Pull request closed.

Runs when a pull request is closed (merged or abandoned). It delegates to the reusable `.pr-close.yml` workflow, which performs Helm-based cleanup of the PR's ephemeral environment.

**How it works:**

- Connects to the OpenShift cluster using [bcgov/action-oc-runner](https://github.com/bcgov/action-oc-runner) (v1.3.0)
- Checks for a Helm release named `<repo-name>-<PR number>` via `helm status`
- If found, uninstalls it with `helm uninstall --no-hooks` to remove all deployed Kubernetes resources (services, deployments, configmaps, etc.) associated with that PR environment
- If not found, logs a message and exits gracefully

This ensures that ephemeral PR environments do not persist after the PR lifecycle ends.

## merge.yml — Merge

**Triggers:** Push to `main` (ignoring markdown and non-workflow `.github` files), manual dispatch (with optional image tag, defaults to `prod`).

**Concurrency:** Does not cancel in-progress runs — previous deployments are allowed to complete.

Deploys sequentially through environments using the reusable `.deployer.yml` (Helm Deployer) workflow.

**How it works:**

- **Deploy DEV** — Deploys to the `dev` environment via `.deployer.yml` using Helm chart from `charts/app`, with `db_user: appproxy`. Disables frontend, CrunchyDB, migrations, and secrets via Helm parameters
- **Tests** — Runs after DEV deployment succeeds, delegates to `.tests.yml` targeting the `dev` environment (currently disabled until test directories are added)
- **Deploy TEST** — Runs after DEV deployment succeeds. Same Helm parameters as DEV but with `atomic: true` (fail-all-or-nothing rollback)
- **Deploy PROD** — Runs after TEST deployment succeeds. Uses `atomic: true` and adds production-specific Helm parameters:
  - `RollingUpdate` deployment strategy
  - Autoscaling enabled
  - Pod Disruption Budget (PDB) enabled
- **Promote Images** — After successful PROD deployment, tags the deployed Docker image as `prod` in GHCR using [shrink/actions-docker-registry-tag](https://github.com/shrink/actions-docker-registry-tag) (v4)

**Dependencies called:**

- `.deployer.yml` — Reusable Helm Deployer workflow (packages and deploys the Helm chart via [bcgov/action-oc-runner](https://github.com/bcgov/action-oc-runner))
- `.tests.yml` — Reusable test workflow (integration, E2E, and load tests — currently all disabled)
- [shrink/actions-docker-registry-tag](https://github.com/shrink/actions-docker-registry-tag) — Retags the Docker image in GHCR without rebuilding

## Database Creation

The Crunchy DB can be set up referring to:

1. [bcgov/action-crunchy](https://github.com/bcgov/action-crunchy) (recently updated) — Creates a Crunchy DB cluster and per-user DB in the cluster for PR to main.

2. [trust-over-ip-configurations/crunchy-cluster](https://github.com/bcgov/trust-over-ip-configurations/tree/main/services/crunchy-cluster/base) (implemented by the Traction team) — A more robust approach. The difference is that this creates small Postgres DBs for PRs instead of the whole Crunchy setup in the OpenShift dev namespace for PR to main.

**Known Issues:**

- The default PVC values for the DB may lead to low space and must be increased accordingly, or it will trigger warnings.

## To Be Done

- **Crunchy DB installation** — Refer to the references above for CrunchyDB setup and integrate into the deployment workflows
- **Include automation tests in pipeline** — Add automated test stages to the CI/CD pipeline
- **Modify pipeline based on branching strategy** — Update workflow triggers and deployment logic to align with the project's branching strategy
- **Introduce HashiCorp Vault for secrets** — Replace current secrets management with HashiCorp Vault integration
