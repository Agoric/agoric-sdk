# YMax Deployment CI Design: Release-Centric Variant

## Overview

This design uses a GitHub release as durable workflow state for a deployment lineage.

The chain remains the canonical record of what is actually installed and upgraded. Release assets exist to make CI resumable, auditable, and easier to promote across environments.

The core idea:

- one parameterized workflow handles `ymax0-devnet`, `ymax0-main`, and `ymax1-main`
- the workflow reads and writes release assets
- partial progress is preserved by checking the release first and skipping completed steps
- common logic is factored into JS/TS CLIs, not YAML

This is an alternative to the artifact-only design in [deploy-design.md](/home/connolly/projects/agoric-sdk/multichain-testing/ymax-ops/deploy-design.md).

## Goals

- use release assets to persist workflow state and deployment evidence across reruns
- preserve progress across reruns
- support safe promotion from `ymax0-devnet` to `ymax0-main`
- support gated promotion from `ymax0-main` to `ymax1-main`
- avoid rebuilding or reinstalling when the release already proves a step is complete
- keep jobs DRY

## Non-Goals

- planner stop/start
- chunked `install-bundle`

## Design Principle

Minimize programming in YAML.

The workflows should be thin:

- collect `workflow_dispatch` inputs
- select environments
- hand control to typed JS/TS entrypoints
- enforce approval boundaries

The CLIs should be thick:

- resolve or create releases
- decide whether a step is already complete
- download or upload release assets
- validate release state against expected workflow invariants and on-chain evidence
- run build, install, and upgrade primitives
- write machine-readable JSON records

Where one CLI needs to invoke another command:

- use `execa`
- avoid shell pipelines in YAML
- keep parsing and error handling in JS/TS

That keeps the deployment logic testable and reviewable outside GitHub Actions syntax.

## Release Model

Each deployment lineage gets a tag and a GitHub release.

Release contents:

- bundle asset:
  - `bundle-ymax0.json`
- metadata assets:
  - `ymax0-devnet-install.json`
  - `ymax0-devnet-upgrade.json`
  - `ymax0-main-install.json`
  - `ymax0-main-upgrade.json`
  - `ymax1-main-upgrade.json`

## CLI Structure

This design should introduce a small set of deployment CLIs under `packages/portfolio-deploy/src` or `multichain-testing/scripts`.

Suggested commands:

- `install-bundle.ts`
  - submit `MsgInstallBundle`
  - confirm appearance in `:bundles`
  - resolve block height and block time for the install record
- `ymax-upgrade.ts`
  - run upgrade via `ymax-admin`
  - collect future block proof after upgrade
- `ymax-deploy-target.ts`
  - orchestrate one target end to end
  - skip completed steps based on release assets
  - create or fetch the release
  - upload and download release assets
  - validate required asset sets
  - reuse the existing build flow

The top-level workflows should prefer one CLI invocation per major phase, or even one CLI invocation for the whole target rollout.

This design chooses one orchestrator CLI per target:

- `ymax-deploy-target.ts`

That CLI coordinates release handling, skip/resume logic, build reuse, install, upgrade, and release-asset updates.

## Tag and Release Naming

The tag name is a workflow input.

Each workflow receives:

- `releaseTag`

The workflow creates the tag and release if they do not already exist.

The `ymax0-main` and `ymax1-main` workflows do not create fresh releases. They consume the existing release and add new records to it.

That makes one release the promotion unit.

Naming guidance:

- use the existing pattern:
  - `v0.3.2603-beta1`
  - `v0.3.2603-beta2`
  - `v0.3.2604-beta1`
- interpretation:
  - `v0.1`, `v0.2`, `v0.3` identify distinct `startContract` instances
  - releases after `v0.3` are upgrades of the same instance lineage, not new instances
  - `2603` and `2604` are `YYMM`
  - `beta` reflects early-access product status
  - `beta2` means the second release in the same month

Default tag name rule:

- the workflow input should default to:
  - `v0.3.YYMM-betaN`
- the operator edits `YYMM` and `N` before starting the workflow

## Workflow Inputs

`.github/workflows/deploy-ymax-release.yml` has one `workflow_dispatch` input schema:

- `target`
  Allowed values:
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
  No default.
  Required only when `target == "ymax1-main"`

## Workflow A: `ymax0-devnet`

Workflow file:

- `.github/workflows/deploy-ymax-release.yml`

Trigger:

- `workflow_dispatch`

Input constraints:

- `target == "ymax0-devnet"`
- `branch` is required

### Step A1: Resolve Release

- run `ymax-deploy-target.ts` to:
  - use the provided `releaseTag`
  - create the tag if needed
  - create the release if needed

If the tag does not yet exist, create it at the current head of the named branch.

### Step A2: Build Bundle

If the release already has `bundle-ymax0.json`:

- download it
- verify `bundleId == "b1-" + endoZipBase64Sha512`
- skip build

Otherwise:

- have the workflow call the reusable bundle-build job for `portfolio-deploy`
- download the resulting bundle artifact into the checkout
- have `ymax-deploy-target.ts` validate that local bundle and upload it as a release asset

Required checks:

- `bundle-ymax0.json` exists
- `bundleId == "b1-" + endoZipBase64Sha512`

### Step A3: Install Bundle on Devnet

If the release already has `ymax0-devnet-install.json`:

- download it
- verify:
  - `target == "ymax0-devnet"`
  - `contract == "ymax0"`
  - `network == "devnet"`
  - `chainId == "agoricdev-25"`
  - `bundleId` matches `bundle-ymax0.json`
  - `confirmedInBundles == true`
- skip install

Otherwise:

- have `ymax-deploy-target.ts`:
  - download `bundle-ymax0.json` from the release
  - call `install-bundle.ts` with the local bundle path

`install-bundle.ts`:

  - uses the install account secret, not `ymaxControl`
  - waits for bundle confirmation in `:bundles`
  - resolves block height and block time

Then have `ymax-deploy-target.ts`:

- write `ymax0-devnet-install.json`
- upload it as a release asset

`ymax0-devnet-install.json` records:

- `target`
- `contract`
- `network`
- `chainId`
- `bundleId`
- `installTxHash`
- `installBlockHeight`
- `installBlockTime`
- `confirmedInBundles`

Use `@agoric/client-utils` for block polling and block metadata:

- `signAndBroadcast` provides `txHash` and `blockHeight`
- `packages/client-utils/src/rpc.js` provides `makeTendermint34Client(...)`
- use that RPC client’s `block(height)` method to fetch the specific block header for the install or upgrade height
- encode block time with `toISOString()`

### Step A4: Generate `privateArgsOverrides.json`

If the workflow input provides `privateArgsOverrides`:

- write it to `privateArgsOverrides.json`

Otherwise:

- have `ymax-deploy-target.ts` invoke:
  - `multichain-testing/scripts/ymax-admin.ts packages/portfolio-deploy/src/ymax-overrides.ts privateArgsOverrides.json`

Then have `ymax-deploy-target.ts`:

- compute an `xxhash64` content hash of `privateArgsOverrides.json`
- upload it as:
  - `TARGET-privateArgsOverrides-<xxhash64>.json`

The upgrade record should include:

- `privateArgsOverridesPath`

### Step A5: Upgrade on Devnet

If the release already has `ymax0-devnet-upgrade.json`:

- download it
- verify:
  - `target == "ymax0-devnet"`
  - `contract == "ymax0"`
  - `network == "devnet"`
  - `chainId == "agoricdev-25"`
  - `bundleId` matches `bundle-ymax0.json`
  - the post-upgrade proof is present
- skip upgrade

Otherwise:

- have `ymax-deploy-target.ts` call `ymax-upgrade.ts`, which:
  - uses `YMAX_CONTROL_MNEMONIC` for `ymax0-devnet`
  - records the upgrade result
  - collects one or more future blocks as proof

Then have `ymax-deploy-target.ts`:

- write `ymax0-devnet-upgrade.json`
- upload it as a release asset

`ymax0-devnet-upgrade.json` records:

- `target`
- `contract`
- `network`
- `chainId`
- `bundleId`
- `upgradeTxHash`
- `upgradeBlockHeight`
- `upgradeBlockTime`
- `privateArgsOverridesPath`
- `futureBlocks`

Each `futureBlocks` entry records:

- `height`
- `hash`
- `time`

Collect `futureBlocks` from the same Tendermint RPC client:

- fetch each future block by height with `block(height)`
- record `header.height`, `header.time`, and the block ID hash
- collect 3 future blocks

## Workflow B: `ymax0-main`

Workflow file:

- `.github/workflows/deploy-ymax-release.yml`

Trigger:

- `workflow_dispatch`

Input constraints:

- `target == "ymax0-main"`

This workflow consumes an existing release created by `ymax0-devnet`.

### Preconditions

The release must already contain:

- `bundle-ymax0.json`
- `ymax0-devnet-install.json`
- `ymax0-devnet-upgrade.json`

Validation rules:

- `ymax0-devnet-install.json.bundleId == "b1-" + bundle-ymax0.json.endoZipBase64Sha512`
- `ymax0-devnet-upgrade.json.bundleId == "b1-" + bundle-ymax0.json.endoZipBase64Sha512`
- `ymax0-devnet-install.json.confirmedInBundles == true`

If any of those checks fail:

- stop before mainnet install

### Step B1: Resolve Release

- fetch the release by tag
- download the required release assets
- validate the preconditions above

### Step B2: Install Bundle on Mainnet

If the release already has `ymax0-main-install.json`:

- download it
- verify:
  - `target == "ymax0-main"`
  - `contract == "ymax0"`
  - `network == "main"`
  - `chainId == "agoric-3"`
  - `bundleId` matches `bundle-ymax0.json`
  - `confirmedInBundles == true`
- skip install

Otherwise:

- have `ymax-deploy-target.ts` download `bundle-ymax0.json` from the release
- run the same `install-bundle.ts` against mainnet with the local bundle path
- have `ymax-deploy-target.ts` write and upload `ymax0-main-install.json`

`ymax0-main-install.json` records:

- `target`
- `contract`
- `network`
- `chainId`
- `bundleId`
- `installTxHash`
- `installBlockHeight`
- `installBlockTime`
- `confirmedInBundles`

### Step B3: Generate `privateArgsOverrides.json`

Same behavior as Workflow A.

### Step B4: Upgrade on Mainnet

If the release already has `ymax0-main-upgrade.json`:

- download it
- verify:
  - `target == "ymax0-main"`
  - `contract == "ymax0"`
  - `network == "main"`
  - `chainId == "agoric-3"`
  - `bundleId` matches `bundle-ymax0.json`
  - post-upgrade block proof is present
- skip upgrade

Otherwise:

- run the same `ymax-upgrade.ts` against `ymax0-main`
- have `ymax-deploy-target.ts` write and upload `ymax0-main-upgrade.json`

`ymax0-main-upgrade.json` records:

- `target`
- `contract`
- `network`
- `chainId`
- `bundleId`
- `upgradeTxHash`
- `upgradeBlockHeight`
- `upgradeBlockTime`
- `privateArgsOverridesPath`
- `futureBlocks`

The approval gate applies before upgrade.

## Workflow C: `ymax1-main`

Workflow file:

- `.github/workflows/deploy-ymax-release.yml`

Trigger:

- `workflow_dispatch`

Input constraints:

- `target == "ymax1-main"`
- `ymax1Planner` is required

This workflow consumes an existing release created by `ymax0-devnet` and extended by `ymax0-main`.

### Preconditions

The release must already contain:

- `bundle-ymax0.json`
- `ymax0-devnet-install.json`
- `ymax0-devnet-upgrade.json`
- `ymax0-main-install.json`
- `ymax0-main-upgrade.json`

Validation rules:

- `ymax0-main-install.json.bundleId == "b1-" + bundle-ymax0.json.endoZipBase64Sha512`
- `ymax0-main-upgrade.json.bundleId == "b1-" + bundle-ymax0.json.endoZipBase64Sha512`
- `ymax0-main-install.json.confirmedInBundles == true`

If any of those checks fail:

- stop before `ymax1-main` upgrade

### Approval and Authorization

`ymax1-main` must meet the same process requirement as the other design:

- the workflow is started by one operator
- all inputs are supplied up front
- the workflow pauses at a protected GitHub environment
- one approver from a small allowlist resumes it with one approval action

Suggested environment:

- `ymax1-mainnet`

That environment should hold:

- `YMAX_CONTROL_MNEMONIC` for `ymax1-main`

TODO: define the exact allowlist of GitHub users.

The approval gate applies before upgrade.

### Planner Precondition

Before `ymax1-main` upgrade:

- `ymax1-planner` must already be down

This workflow does not stop or restart the planner.
- this is a human attestation, not a machine check
- the workflow requires `ymax1Planner`
- the workflow fails unless `ymax1Planner == "down"`

### Step C1: Resolve Release

- fetch the release by tag
- download the required release assets
- validate the preconditions above

### Step C2: Generate `privateArgsOverrides.json`

For `ymax1-main`, the workflow must provide `privateArgsOverrides` explicitly.

- `ymax-deploy-target.ts` does not use `ymax-overrides.ts` for `ymax1-main`
- if `privateArgsOverrides` is absent, fail before upgrade
- otherwise write the provided JSON, hash it, and upload it as the
  `privateArgsOverridesPath` asset

### Step C3: Upgrade on Mainnet for `ymax1`

If the release already has `ymax1-main-upgrade.json`:

- download it
- verify:
  - `target == "ymax1-main"`
  - `contract == "ymax1"`
  - `network == "main"`
  - `chainId == "agoric-3"`
  - `bundleId` matches `bundle-ymax0.json`
  - post-upgrade block proof is present
- skip upgrade

Otherwise:

- require the protected-environment approval gate
- require that `ymax1-planner` is already down
- run the same `ymax-upgrade.ts` against `ymax1-main`
- have `ymax-deploy-target.ts` write and upload `ymax1-main-upgrade.json`

`ymax1-main-upgrade.json` records:

- `target`
- `contract`
- `network`
- `chainId`
- `bundleId`
- `upgradeTxHash`
- `upgradeBlockHeight`
- `upgradeBlockTime`
- `privateArgsOverridesPath`
- `futureBlocks`

## DRY Structure

The workflows should be composed from reusable CLIs first, reusable jobs second.

Preferred layering:

1. shared library code
2. thin JS/TS CLIs
3. thin GitHub workflow jobs

Suggested shared library responsibilities:

- release CRUD
- release asset validation
- skip/resume logic
- target-specific policy checks
- block proof collection

Suggested CLI responsibilities:

- `install-bundle.ts`
- `ymax-upgrade.ts`
- `ymax-deploy-target.ts`

Suggested workflow responsibilities:

- dispatch inputs
- environment binding
- approvals
- one or a few CLI invocations

If GitHub Actions needs reusable pieces, use `workflow_call` only for coarse-grained phases, not fine-grained business logic.

## Secrets and Environments

Install step:

- use `YMAX_INSTALL_BUNDLE_MNEMONIC`
- environment-scoped by target

Upgrade step:

- use `YMAX_CONTROL_MNEMONIC`
- environment-scoped by target

Suggested environments:

- `ymax0-devnet`
- `ymax0-mainnet`
- `ymax1-mainnet`

## Partial Progress Rules

Reruns must preserve progress.

Rule:

- if the release already contains the asset proving a step completed, do not redo that step

Step-to-asset mapping:

- build:
  - `bundle-ymax0.json`
- devnet install:
  - `ymax0-devnet-install.json`
- devnet upgrade:
  - `ymax0-devnet-upgrade.json`
- mainnet install:
  - `ymax0-main-install.json`
- mainnet upgrade:
  - `ymax0-main-upgrade.json`
  - `ymax1-main-upgrade.json`

If a step asset exists but fails validation:

- fail hard
- do not overwrite it automatically
- recover manually by deleting the bad release asset and rerunning the workflow

## Failure Model

If a workflow fails after some steps completed:

- the chain remains the canonical record of completed on-chain actions
- the release preserves the workflow state and evidence needed to resume safely
- a rerun resumes from the highest validated step

Examples:

- build succeeded, install failed:
  - rerun skips build
- install succeeded, upgrade failed:
  - rerun skips build and install

## Implementation Notes

- `build-bundles.yml` remains the coarse build primitive
- `packages/portfolio-deploy/scripts/install-bundle.ts` remains the install primitive
- `multichain-testing/scripts/ymax-admin.ts` plus `packages/portfolio-deploy/src/ymax-upgrade.ts` remain the upgrade primitive
- `packages/portfolio-deploy/src/ymax-overrides.ts` remains the default overrides generator
- `ymax-deploy-target.ts` should absorb release management, build reuse, skip/resume logic, and release-asset validation
- `ymax-upgrade.ts` should also collect the future-block proof after upgrade
- new release-management and proof-collection behavior should live in JS/TS modules, not shell-heavy workflow steps
- when one CLI invokes another tool or script, prefer `execa`
- use `gh` for release and release-asset operations, invoked from JS/TS via `execa`
- use GitHub Actions `concurrency`, keyed by `releaseTag`, to prevent two runs from mutating the same release at once
- record block time from RPC block lookup by height and encode it with `toISOString()`
- the block-proof schema is 3 future blocks, each with `height`, `hash`, and `time`
- `ymax0-main` and `ymax1-main` append records to the same release created for the lineage
- the bundle is stored as a release asset for lineage state, and `ymax0-devnet`
  currently also uses a workflow artifact as the handoff from the branch-specific
  build job into the deploy job
- the workflow manages release assets, not the release body
- any human-readable release body summary is maintained manually
- `ymax1-main` keeps the same process requirements as the other design: prior `ymax0-main`, protected-environment approval, and planner-down before upgrade
