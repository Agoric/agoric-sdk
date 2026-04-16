# Portfolio Contract Deployment

This package contains deployment facilities for the Portfolio contract.

## Deployment (Review)

**⚠️ WARNING: The old CoreEval deployment method has been removed as it destroys the existing contract instance.**

This package now uses the **smart-wallet upgrade workflow** for safe in-place upgrades:

1. Build contract bundles (`yarn build && yarn build:bundle`)
2. Install bundles via governance (requires BLD for fees)
3. Verify bundle is on-chain
4. Use ymaxControl smart wallet to upgrade the contract in-place

See the runbook in `multichain-testing/ymax-ops/Makefile` for the manual upgrade process, or use the automated CLI (coming soon).

## Access Token

```sh
agoric run ./src/access-token-setup.build.js \
  [--beneficiary=agoric1...]
```

_beneficiary defaults to gov1_

Then submit the resulting bundles and core-eval as usual.

## Chain Info

```sh
agoric run src/chain-info.build.js --net=devnet --peer=...
```

_... IOU; see also branch by Fraz_

## Contract Upgrade - DevNet

**The old `yarn deploy:devnet` script has been removed** as it used the dangerous CoreEval method that destroys the contract.

For safe upgrades, use the workflow in `multichain-testing/ymax-ops/`:

```bash
cd ../../multichain-testing/ymax-ops
export AGORIC_NET=devnet
export CONTRACT=ymax0

# Build bundles and verify ID
make clean && make

# Submit bundle via devnet cosgov install form (manual step)
# Then verify it's on-chain:
make ,ymax-installed

# Generate overrides and upgrade
make ,privateArgsOverrides.json
export MNEMONIC="<ymaxControl mnemonic from 1password>"
make check-control-account
make ,ymax0-upgraded
```

See `multichain-testing/ymax-ops/Makefile` for details.

## Structure

- `src/portfolio-start.core.ts` - Core evaluation script for contract instantiation
- `src/portfolio.build.js` - Build script for generating deployment bundles
- `src/axelar-configs.js` - Environment-specific Axelar chain configurations
- `dist/` - Generated contract bundles and deployment artifacts
- `bundles/` - Contract bundles for deployment

## Usage

```bash
# Build contract bundles
yarn build

# Run tests
yarn test
```
