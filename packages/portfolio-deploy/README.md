# Portfolio Contract Deployment

This package contains deployment facilities for the Portfolio contract.

## Deployment (Review)

This package follows the Agoric deployment pattern:
1. Build contract bundles
2. Install bundles (requires IST for fees)
3. Submit CoreEval proposal to governance
4. Wait for proposal to pass and contract to be instantiated

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

## Contract Deployment - DevNet

```
yarn deploy:devnet
...IOU some detail; see internal chat...
```

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
