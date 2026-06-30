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
- reduce operator work during lower-risk test deployments

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
- `signingKey`
  Allowed values:
  - `ci-secret`
  - `detached-control`
  - `detached-grantee`
- `authzGrantee`
  Required only when `signingKey == "detached-grantee"`
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

## Detached Signing

In order to keep keys out of CI for higher-risk deployments, detached signing
splits upgrade generation from final signing.

Detached signing supports direct control-wallet signing and `authz`-delegated
signing.

In the workflow UI:

- `signingKey == "ci-secret"` keeps signing in CI with the control mnemonic
- `signingKey == "detached-control"` generates or consumes detached artifacts
  for the control address
- `signingKey == "detached-grantee"` generates or consumes detached `authz`
  artifacts for the supplied `authzGrantee`

### Authz Delegation

Direct signing uses the control address to sign the generated
`MsgWalletSpendAction`.

With `authz` delegation, the control address delegates to a grantee, and the
grantee signs a generated `MsgExec` that wraps the wallet-spend action.

## Release Model

Each deployment lineage gets one tag and one prerelease GitHub release.

That release is the promotion unit. `ymax0-main` and `ymax1-main` extend the
same release created for the lineage; they do not create fresh releases. This
keeps the evidence for lower-risk rehearsal and higher-risk promotion in one
place.

Primary assets:

- `bundle-ymax0.json`
- `ymax0-devnet-install.json`
- `ymax0-devnet-upgrade-pending.json`
- `ymax0-devnet-upgrade.json`
- `ymax0-main-install.json`
- `ymax0-main-upgrade-pending.json`
- `ymax0-main-upgrade.json`
- `ymax1-main-upgrade-pending.json`
- `ymax1-main-upgrade.json`
- `TARGET-unsigned-tx.json` or `TARGET-authz-unsigned-tx.json`
- `TARGET-signed-tx.json` or `TARGET-authz-signed-tx.json`
- `TARGET-upgrade-logs.ndjson`
- `TARGET-upgrade-logs.norm.txt`
- `TARGET-privateArgsOverrides-<sha>.json`

## Deployment Records as Release Artifacts

Progress of the deployment is captured in release artifacts.

### Install Record

The install record (`TARGET-install.json`) ties the release lineage (`releaseTag`, `commit`)
and deployment target (`target`, `contract`, `network`, `chainId`) to the
installed bundle and chain transaction (`bundleId`, `installTxHash`), plus the
chain confirmation details (`installBlockHeight`, `installBlockTime`) and
whether the installBundle transaction succeeded (`confirmedInBundles`).

### Pending Upgrade Record

The broadcast RPC may report failure even though the upgrade succeeds, so
pending state must be recorded before trying to prove the result.

The pending upgrade record (`TARGET-upgrade-pending.json`) ties the deployment
target (`target`, `contract`, `network`, `chainId`) and release lineage
(`releaseTag`) to the intended upgraded bundle (`bundleId`), the applied
private-args overrides (`privateArgsOverridesPath`), and the submission attempt
(`submitTime`, `invocationId`) before final confirmation data is available.

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

### Upgrade Generate

If the upgrade path is detached from signing:

- create any detached signing artifacts needed for the chosen submit path
- validate that they match the intended target, bundle, and overrides

For detached direct signing, the generated artifacts bind the target, bundle,
overrides, control-wallet signer data, and exact unsigned transaction bytes
before any operator signing happens.

For detached `authz` signing, the generated artifacts bind the target, bundle,
overrides, grantee signer data, and exact unsigned transaction bytes before any
operator signing happens.

### Upgrade Submit

If `TARGET-upgrade.json` already exists:

- download it
- validate target, network, chain ID, bundle ID, and post-upgrade proof
- skip submit and confirm

Otherwise:

- create the active target’s overrides asset
- write `TARGET-upgrade-pending.json` before waiting on flaky confirmation
- either:
  - run `wallet-admin.ts ... ymax-upgrade.ts` directly when GitHub holds the
    active signing key
  - or broadcast the already-generated operator-signed tx when the signing path
    is detached
- stop after submission if confirmation is split to a later job

The split is deliberate. Direct GitHub signing can collapse generation and
submission into one CI job. Operator signing cannot; signable material must be
generated first, signed out of band, and only then submitted. For detached
workflow runs, the first run may stop after generating unsigned artifacts; a
later rerun continues once the signed tx asset has been uploaded to the
release.

### Upgrade Confirm

If `TARGET-upgrade.json` already exists:

- download it
- validate target, network, chain ID, bundle ID, and post-upgrade proof
- skip confirm

Otherwise:

- read `TARGET-upgrade-pending.json`
- reconcile chain state from the pending record
- fetch upgrade slogs
- upload:
  - `TARGET-upgrade-logs.ndjson`
  - `TARGET-upgrade-logs.norm.txt`
- match the relevant `CCtrl` slog lines
- extract `incarnationNumber`
- collect two post-upgrade health blocks
- write and upload `TARGET-upgrade.json`
- treat "submitted but could not yet confirm" differently from "did not submit"

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
- generate detached signing artifacts if needed
- submit upgrade for `ymax0` on devnet if needed
- confirm upgrade for `ymax0` on devnet if needed

Key checks:

- local bundle may be used as the install source
- upgrade uses the devnet `ymax0` control key
- GitHub signing is acceptable here to reduce operator work
- detached direct or `authz` operator signing can also be exercised here

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
- generate detached signing artifacts if needed
- submit upgrade for `ymax0` on mainnet if needed
- confirm upgrade for `ymax0` on mainnet if needed

Key checks:

- `ymax0-devnet-upgrade.json.bundleId` must match the release bundle
- `ymax0-devnet-install.json.confirmedInBundles == true`
- approval gate applies before upgrade
- detached direct or `authz` operator signing is supported here for rehearsal

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
- generate detached signing artifacts if needed
- submit upgrade for `ymax1` on mainnet if needed
- confirm upgrade for `ymax1` on mainnet if needed

Key checks:

- `ymax0-main-upgrade.json.bundleId` must match the release bundle
- `ymax0-main-install.json.confirmedInBundles == true`
- protected-environment approval is required before upgrade
- planner-down is a human attestation, not a machine check
- operator-held signing is the intended high-safety path here

## Secrets and Environments

Higher-risk environments should hold narrower secrets and stricter approvals.

Install:

- `YMAX_INSTALL_BUNDLE_MNEMONIC`

Upgrade:

- `YMAX_CONTROL_MNEMONIC`
- or, for detached flows, signing happens out of band and CI only needs the
  submission/broadcast capability

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
- install succeeded, submit failed before confirmation: rerun skips build and
  install and should reconcile pending upgrade state before any resubmission
- submit succeeded, confirm failed: rerun should retry confirmation without
  assuming a fresh submission is safe
- earlier valid install or upgrade assets can let the planner skip entire jobs
