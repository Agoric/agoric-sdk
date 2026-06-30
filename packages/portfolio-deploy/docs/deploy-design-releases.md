# YMax Deployment CI Design

YMax holds customer funds, so upgrades need a controlled process that reduces
risk while still allowing the product to evolve.

This design uses one GitHub release as durable state for one deployment
lineage. The chain remains the canonical record of what is actually installed
and upgraded.

Core ideas:

- one parameterized workflow handles a staged path from lower-risk
  `ymax0-devnet`, to higher-risk `ymax0-main`, to highest-risk `ymax1-main`
- workflow state is stored as release assets, not in YAML job state
- expensive steps are skipped when the release already proves completion
- deployment logic lives in JS/TS CLIs for fast iteration and normal tooling

## Goals

- reduce upgrade risk to customer funds
- preserve progress across reruns so partial failures are recoverable without
  operator improvisation
- require evidence and gating before promotion into higher-risk
  environments

## Non-Goals

- planner stop/start
- chunked `install-bundle`
- preserving the old Makefile-style `privateArgsOverrides` generation path

## Design Principle

Minimize programming in YAML.

The workflows should be thin:

- collect `workflow_dispatch` inputs
- run a cheap planner before expensive work
- bind environments and approvals
- invoke typed JS/TS entrypoints

The CLIs should be thick:

- resolve or create releases
- read and write release assets
- validate release state and target-specific invariants
- run build, install, and upgrade primitives
- write machine-readable records

### Code Organization

- `deploy-ymax-release.yml` is the manual entrypoint
  - GitHub Actions `concurrency` is keyed by `releaseTag`
- `build-bundles.yml` remains the coarse build primitive
- `plan-ymax-release.mjs` performs pre-build checks without depending on a repo
  build
- `ymax-deploy-target.ts` owns release handling, skip/resume logic, and asset
  validation; it calls
  - `gh` to read / write assets, etc.
  - `packages/portfolio-deploy/scripts/install-bundle.ts`
  - `packages/portfolio-deploy/src/ymax-upgrade.ts`

## Workflow Inputs and Dispatch UI

When an operator manually starts
`.github/workflows/deploy-ymax-release.yml`, GitHub presents this
`workflow_dispatch` form:

- `target`
  Allowed values, in increasing risk order:
  - `ymax0-devnet`
  - `ymax0-main`
  - `ymax1-main`
- `releaseTag`
- optional `privateArgsOverrides` JSON string
- `branch`
  Required only when `target == "ymax0-devnet"`
- `ymax1Planner`
  Allowed values:
  - `up`
  - `down`
  Required only when `target == "ymax1-main"`

### Tag Naming

The tag name is a workflow input. Existing naming guidance remains:

- `v0.3.2603-beta1`
- `v0.3.2603-beta2`
- `v0.3.2604-beta1`

Interpretation:

- `v0.1`, `v0.2`, `v0.3` identify distinct `startContract` instances
- later tags in the same lineage are upgrades of the same instance
- `YYMM` identifies the month
- `betaN` identifies the release count within that month

Suggested default rule:

- `v0.3.YYMM-betaN`

## Release Model

Each deployment lineage gets one tag and one prerelease GitHub release.

That release is the promotion unit. `ymax0-main` and `ymax1-main` extend the
same release created for the lineage; they do not create fresh releases. This
keeps the evidence for lower-risk rehearsal and higher-risk promotion in one
place.

Primary assets:

- `bundle-ymax0.json`
- `ymax0-devnet-install.json`
- `ymax0-devnet-upgrade.json`
- `ymax0-main-install.json`
- `ymax0-main-upgrade.json`
- `ymax1-main-upgrade.json`
- `TARGET-upgrade-logs.ndjson`
- `TARGET-upgrade-logs.norm.txt`
- `TARGET-privateArgsOverrides-<sha>.json`

## Common Asset Rules

### Install Record

The install record (`TARGET-install.json`) ties the release lineage (`releaseTag`, `commit`)
and deployment target (`target`, `contract`, `network`, `chainId`) to the
installed bundle and chain transaction (`bundleId`, `installTxHash`), plus the
chain confirmation details (`installBlockHeight`, `installBlockTime`) and
whether the installBundle transaction succeeded (`confirmedInBundles`).

### Upgrade Record

The upgrade record (`TARGET-upgrade.json`) ties the deployment target
(`target`, `contract`, `network`, `chainId`) to the upgraded bundle
(`bundleId`) and applied private-args overrides (`privateArgsOverridesPath`),
the chain transaction that performed the upgrade (`upgradeTxHash`, `upgradeBlockHeight`, `upgradeBlockTime`),
the resulting contract incarnation
(`incarnationNumber`), and evidence of post-upgrade chain health
(`healthBlocks[].height`, `healthBlocks[].hash`, `healthBlocks[].time`).

### Overrides

`privateArgsOverrides` is created only as part of upgrade creation:

- if the workflow input provides JSON, use it
- otherwise default to `{}`
- canonicalize the JSON
- hash it
- upload `TARGET-privateArgsOverrides-<sha>.json`
- record its path in the upgrade record

If an operator wants different overrides after an upgrade record already exists:

- do not overwrite the existing upgrade record automatically
- remove or rename `TARGET-upgrade.json` first, then rerun

## Shared Phase Semantics

### Resolve Release

To plan work without building agoric-sdk:

- run `.github/scripts/plan-ymax-release.mjs`
- fail early if prerequisite release state is invalid
- skip expensive jobs when the release already proves they are complete
- create the tag and prerelease if needed
- verify that a higher-risk target is only using evidence produced at a
  lower-risk stage

### Build Bundle

If the release already has `bundle-ymax0.json`:

- download it
- validate `bundleId == "b1-" + endoZipBase64Sha512`
- skip build

Otherwise:

- call the reusable bundle-build workflow
- validate the resulting local bundle
- upload `bundle-ymax0.json`

### Install Phase

If `TARGET-install.json` already exists:

- download it
- validate target, network, chain ID, bundle ID, and `confirmedInBundles`
- skip install

Otherwise:

- run `install-bundle.ts`
- wait for bundle confirmation in `:bundles`
- resolve block height and block time
- write and upload `TARGET-install.json`

### Upgrade Phase

If `TARGET-upgrade.json` already exists:

- download it
- validate target, network, chain ID, bundle ID, and post-upgrade proof
- skip upgrade

Otherwise:

- create the active target’s overrides asset
- run `wallet-admin.ts ... ymax-upgrade.ts`
- collect the machine-readable result file
- fetch upgrade slogs
- upload:
  - `TARGET-upgrade-logs.ndjson`
  - `TARGET-upgrade-logs.norm.txt`
- match the relevant `CCtrl` slog lines
- extract `incarnationNumber`
- collect two post-upgrade health blocks
- write and upload `TARGET-upgrade.json`

## Target Matrix

### `ymax0-devnet`

Lowest-risk rehearsal environment. This is where a release lineage first proves
that its bundle can be installed and upgraded.

Inputs:

- `target == "ymax0-devnet"`
- `branch` is required

Phases:

- resolve release
- build bundle if needed
- install on devnet if needed
- upgrade `ymax0` on devnet if needed

Key checks:

- local bundle may be used as the install source
- upgrade uses the devnet `ymax0` control key

### `ymax0-main`

Higher-risk production environment. Promotion here requires evidence from
`ymax0-devnet`.

Inputs:

- `target == "ymax0-main"`

Prerequisites already in the release:

- `bundle-ymax0.json`
- `ymax0-devnet-install.json`
- `ymax0-devnet-upgrade.json`

Phases:

- resolve release and validate prerequisites
- install on mainnet if needed
- upgrade `ymax0` on mainnet if needed

Key checks:

- `ymax0-devnet-upgrade.json.bundleId` must match the release bundle
- `ymax0-devnet-install.json.confirmedInBundles == true`
- approval gate applies before upgrade

### `ymax1-main`

Highest-risk production environment for customer funds. Promotion here requires
evidence from both earlier stages plus stronger human gating.

Inputs:

- `target == "ymax1-main"`
- `ymax1Planner == "down"`

Prerequisites already in the release:

- `bundle-ymax0.json`
- `ymax0-devnet-install.json`
- `ymax0-devnet-upgrade.json`
- `ymax0-main-install.json`
- `ymax0-main-upgrade.json`

Phases:

- resolve release and validate prerequisites
- upgrade `ymax1` on mainnet if needed

Key checks:

- `ymax0-main-upgrade.json.bundleId` must match the release bundle
- `ymax0-main-install.json.confirmedInBundles == true`
- protected-environment approval is required before upgrade
- planner-down is a human attestation, not a machine check

## Secrets and Environments

Higher-risk environments should hold narrower secrets and stricter approvals.

Install:

- `YMAX_INSTALL_BUNDLE_MNEMONIC`

Upgrade:

- `YMAX_CONTROL_MNEMONIC`

The `ymax1-mainnet` environment should hold the `ymax1` control mnemonic and
be protected by a small allowlist.

## Partial Progress and Failure Rules

Reruns preserve progress, but never by weakening validation.

Rules:

- if a validated asset already proves a step completed, do not redo that step
- if the planner can prove that before build, skip the whole expensive job
- if an asset exists but fails validation, fail hard and do not overwrite it
- manual recovery is by removing or renaming the bad release asset and rerunning

Examples:

- build succeeded, install failed: rerun skips build
- install succeeded, upgrade failed: rerun skips build and install
- earlier valid install or upgrade assets can let the planner skip entire jobs

