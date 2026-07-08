# Portfolio Contract Deployment

This package contains deployment facilities for the Portfolio contract:

- Development Usage
- Interchain Configuration
- ymaxControl deployment workflows / jobs
- pre-ymaxControl chain governance deployment

## Development

As usual:

```bash
# Build contract bundles
yarn build

# Run tests
yarn test
```

Typically, the whole blockchain is bootstrapped in every test.

## Interchain Configuration

For contract addresses etc. on different chains in mainnet, devnet, see `src/axelar-configs.js`.

## ymaxControl deployment workflows / jobs

In production, we have no further plans to start a new contract.
Development proceeds by way of upgrade.

Use the [Deploy YMax Release](https://github.com/Agoric/agoric-sdk/actions/workflows/deploy-ymax-release.yml) GitHub Actions workflow, aka
[deploy-ymax-release.yml](../../.github/workflows/deploy-ymax-release.yml)
for the normal end-to-end operator path. It submits the upgrade and then confirms / records it in the same workflow run.

If submission likely already happened but confirmation / record-writing did not finish, use
[confirm-ymax-upgrade.yml](../../.github/workflows/confirm-ymax-upgrade.yml)
to run the confirm-only recovery path without resubmitting the upgrade transaction.

### CLI Usage

To deploy outside of a GitHub workflow, do not upgrade while flows are in progress. In practice this means suspending the planner before a `ymax1-main` upgrade, since we do not design for upgrade during flows. Then use [ymax-deploy-target.ts](./scripts/ymax-deploy-target.ts):

```bash
export AGORIC_NET=main
export GITHUB_TOKEN=...
export MNEMONIC=...
export PRIVATE_ARGS_OVERRIDES='{}'

packages/portfolio-deploy/scripts/ymax-deploy-target.ts \
  phase-upgrade \
  --target ymax1-main \
  --tag v0.3.2606-beta1
```

This verifies prerequisites from `ymax0-main`, submits the upgrade, and then confirms / records it. `export GITHUB_TOKEN=...` is used to attach assets to the release.

If a prior submit likely landed on chain but the final record is missing, run the confirm-only phase instead:

```bash
packages/portfolio-deploy/scripts/ymax-deploy-target.ts \
  phase-upgrade-confirm \
  --target ymax1-main \
  --tag v0.3.2606-beta1
```

Pass private args overrides when needed: `export PRIVATE_ARGS_OVERRIDES='{"offerFilter":["foo"]}'`

### multichain-testing/ymax-ops (obsolete)

Some deployment tooling was developed in `multichain-testing/ymax-ops/`; it should be obsolete now, but it might not yet be deleted.

## pre-ymaxControl chain governance deployment

Ymax was originally deployed in a series of chain governance proposals:

 - [Ymax PoC: A Step Toward Seamless DeFi Control \(\#100, \#101, \#103, \#104\) \- Governance / CoreEval \- Agoric Community Forum](https://community.agoric.com/t/106-ymax-poc-a-step-toward-seamless-defi-control-100-101-103-104/864)

In proposal 104, BLD stakers delegated upgrade of the ymax
contract to an object sent to an executive account. The object is known as `ymaxControl`.

For details, see the [agoric-3-proposals](https://github.com/Agoric/agoric-3-proposals/) repo, especially `proposals/100:ymax-alpha1` thru `proposals/106:ymax-alpha4`.
