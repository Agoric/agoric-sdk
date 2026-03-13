---
name: depot-ci
description: >
  Configures and manages Depot CI, a drop-in replacement for GitHub Actions that runs workflows
  entirely within Depot. Use when migrating GitHub Actions workflows to Depot CI, running
  `depot ci migrate`, managing Depot CI secrets and variables, running workflows with
  `depot ci run`, debugging Depot CI runs, checking workflow compatibility, or understanding
  Depot CI's current beta limitations. Also use when the user mentions .depot/ directory,
  depot ci commands, or asks about running GitHub Actions workflows on Depot's infrastructure
  without GitHub-hosted runners. NOTE: Depot CI is currently in beta with limited availability.
---

# Depot CI (Beta)

Depot CI is a drop-in replacement for GitHub Actions that runs your existing Actions-format YAML workflows entirely within Depot's infrastructure. It parses GitHub Actions workflow files and executes them on Depot's compute.

**Status:** Beta — keep GitHub Actions running in parallel. Things may break.

## Architecture

Three subsystems: **compute** (provisions and executes work), **orchestrator** (schedules multi-step workflows, handles dependencies), **GitHub Actions parser** (translates Actions YAML into orchestrator workflows). The system is fully programmable — direct API access to workflows, orchestration, and compute sandboxes is planned.

## Getting Started

### 1. Install the Depot Code Access GitHub App

Depot dashboard → Settings → GitHub Code Access → Connect to GitHub

(If you've used Claude Code on Depot, this may already be installed.)

### 2. Migrate workflows

```bash
depot ci migrate
```

This interactive wizard:

1. Discovers all workflows in `.github/workflows/`
1. Analyzes each for Depot CI compatibility
1. Copies selected workflows to `.depot/workflows/`
1. Copies local actions from `.github/actions/` to `.depot/actions/`
1. Prompts for secrets and variables referenced in workflows

Your `.github/` directory is untouched — workflows run in both GitHub and Depot simultaneously.

**Warning:** Workflows that cause side effects (deploys, artifact updates) will execute twice.

#### Non-interactive migration

```bash
depot ci migrate --yes \
  --secret NPM_TOKEN=$NPM_TOKEN \
  --secret DATABASE_URL=$DATABASE_URL \
  --var SERVICE_NAME=api \
  --org my-org-id
```

#### Migrate flags

|Flag                |Description                                |
|--------------------|-------------------------------------------|
|`--yes`             |Non-interactive, migrate all workflows     |
|`--secret KEY=VALUE`|Pre-supply secret (repeatable)             |
|`--var KEY=VALUE`   |Pre-supply variable (repeatable)           |
|`--overwrite`       |Overwrite existing `.depot/` directory     |
|`--org <id>`        |Organization ID (required if multiple orgs)|
|`--token <token>`   |Depot API token                            |

### 3. Manual setup (without migrate command)

Create `.depot/workflows/` and `.depot/actions/` directories manually. Copy workflow files from `.github/workflows/`. Configure secrets via CLI or API.

## Managing Secrets

```bash
# Add (prompts for value securely if --value omitted)
depot ci secrets add SECRET_NAME
depot ci secrets add SECRET_NAME --value "$NPM_TOKEN" --description "NPM auth token"

# List (names and metadata only, no values)
depot ci secrets list
depot ci secrets list --output json

# Remove
depot ci secrets remove SECRET_NAME
depot ci secrets remove SECRET_NAME --force  # Skip confirmation
```

## Credential Safety Guardrails

Treat credentials as sensitive input and never echo them back in outputs.

- For non-interactive flows, pass secret values via environment variables (for example: `--secret NPM_TOKEN=$NPM_TOKEN`).
- If using `--value`, pass environment variables (for example: `--value "$NPM_TOKEN"`), not literals.
- Prefer interactive secret prompts (`depot ci secrets add SECRET_NAME`) over command-line secret values.
- Do not hardcode secrets or tokens in commands, scripts, workflow YAML, logs, or examples.
- Use CI secret stores for `DEPOT_TOKEN` and other credentials; pass at runtime only.
- Avoid force/non-interactive destructive flags unless explicitly requested by the user.
- Before running credential-affecting commands, confirm scope (org, project, workflow) and intended target.

## Managing Variables

Non-secret config values accessible as `${{ vars.VARIABLE_NAME }}`. Unlike secrets, values can be read back.

```bash
depot ci vars add VAR_NAME --value "some-value"
depot ci vars list
depot ci vars list --output json
depot ci vars remove VAR_NAME
depot ci vars remove VAR_NAME --force
```

## Running Workflows

```bash
# Run a workflow
depot ci run --workflow .depot/workflows/ci.yml

# Run specific jobs only
depot ci run --workflow .depot/workflows/ci.yml --job build --job test

# Debug with SSH (tmate session after step N, requires single --job)
depot ci run --workflow .depot/workflows/ci.yml --job build --ssh-after-step 3
```

The CLI auto-detects uncommitted changes vs. the default branch, uploads a patch to Depot Cache, and injects a step to apply it after checkout — your local working state runs without needing a push.

## Checking Status and Logs

```bash
# Check run status (shows workflows → jobs → attempts hierarchy)
depot ci status <run-id>

# Fetch logs for a specific job attempt
depot ci logs <attempt-id>
```

## Listing Runs and Triage Flow

`depot ci run list` is the primary entrypoint for debugging active/recent CI activity across workflows.

```bash
# List runs (defaults to queued + running)
depot ci run list

# Filter by status (repeatable)
depot ci run list --status failed
depot ci run list --status finished --status failed

# Limit number of results
depot ci run list -n 5

# Machine-readable output for tooling/agents
depot ci run list --output json
```

### `run list` flags

|Flag             |Description                                                                 |
|-----------------|----------------------------------------------------------------------------|
|`-n, --n <int>`  |Number of runs to return (default `50`)                                    |
|`--status <name>`|Filter by status; repeatable: `queued`, `running`, `finished`, `failed`, `cancelled`|
|`-o, --output`   |Output format (`json`)                                                      |
|`--token <token>`|Depot API token                                                             |

### Stitch with status/logs for debugging

Use these commands in sequence:

1. `depot ci run list --status failed -n 10` to identify suspect run IDs.
1. `depot ci status <run-id>` to expand the run into workflow/job/attempt hierarchy.
1. `depot ci logs <attempt-id>` to pull logs for the failing attempt.

For automation, start from JSON and then select IDs:

```bash
# Inspect response shape before writing jq filters
depot ci run list --output json | jq '.'
```

Then map selected run IDs into `depot ci status`, and attempt IDs into `depot ci logs`.

## Compatibility with GitHub Actions

### Supported

**Workflow level:** `name`, `run-name`, `on`, `env`, `defaults`, `jobs`, `on.workflow_call` (with inputs, outputs, secrets)

**Triggers:** `push` (branches, tags, paths), `pull_request` (branches, paths), `pull_request_target`, `schedule`, `workflow_call`, `workflow_dispatch` (with inputs), `workflow_run`

**Job level:** `name`, `needs`, `if`, `outputs`, `env`, `defaults`, `timeout-minutes`, `strategy` (matrix, fail-fast, max-parallel), `continue-on-error`, `container`, `services`, `uses` (reusable workflows), `with`, `secrets`, `secrets.inherit`, `steps`

**Step level:** `id`, `name`, `if`, `uses`, `run`, `shell`, `with`, `env`, `working-directory`, `continue-on-error`, `timeout-minutes`

**Expressions:** `github`, `env`, `vars`, `secrets`, `needs`, `strategy`, `matrix`, `steps`, `job`, `runner`, `inputs` contexts. Functions: `always()`, `success()`, `failure()`, `cancelled()`, `contains()`, `startsWith()`, `endsWith()`, `format()`, `join()`, `toJSON()`, `fromJSON()`

**Action types:** JavaScript (Node 12/16/20/24), Composite, Docker

### In Progress

`concurrency` (workflow and job level), `hashFiles()`, `permissions` (partially supported — `actions`, `checks`, `contents`, `metadata`, `pull_requests`, `statuses`, `workflows` work; `id-token` requires OIDC which is not yet supported)

### Not Supported

- **Reusable workflows from other repositories** — local reusable workflows work; cross-repo `uses` does not
- **Fork-triggered PRs** — `pull_request` and `pull_request_target` from forks not supported yet
- **Non-Ubuntu runner labels** — all non-Depot labels treated as `depot-ubuntu-latest`
- **OIDC** — `id-token` permission not available yet
- **Concurrency groups** — not yet implemented
- **Hierarchical secrets/variables** — scoped to org only, cannot vary per-repository
- **Custom runner snapshots** — Depot's own implementation planned
- **Many GitHub-specific event triggers** — `release`, `issues`, `issue_comment`, `deployment`, `create`, `delete`, `merge_group`, and others

### Runner label handling

Depot CI respects Depot runner labels (e.g., `depot-ubuntu-24.04-8`). Any label it can't parse is treated as `depot-ubuntu-latest`.

## Directory Structure

```
your-repo/
├── .github/
│   ├── workflows/     # Original GHA workflows (keep running)
│   └── actions/       # Local composite actions
├── .depot/
│   ├── workflows/     # Depot CI copies of workflows
│   └── actions/       # Depot CI copies of local actions
```

## Common Mistakes

|Mistake                                      |Fix                                                       |
|---------------------------------------------|----------------------------------------------------------|
|Removing `.github/workflows/` after migration|Keep them — run both in parallel during beta              |
|Using cross-repo reusable workflows          |Not supported yet — inline the workflow or copy it locally|
|Expecting OIDC to work                       |Not supported yet — use `DEPOT_TOKEN` for auth            |
|Setting per-repo secrets                     |Secrets are org-scoped only — same value across all repos |
|Forgetting `--org` flag with multiple orgs   |Migration will fail — always specify `--org <id>`         |
|Workflows with `runs-on: windows-latest`     |Treated as `depot-ubuntu-latest` — may fail               |
