# Portfolio Contract Deployment

This package contains deployment facilities for the Portfolio contract.

## Structure

- `src/portfolio-start.core.ts` - Core evaluation script for contract instantiation
- `src/portfolio.build.js` - Build script for generating deployment bundles
- `dist/` - Generated contract bundles and deployment artifacts
- `bundles/` - Contract bundles for deployment

## Usage

```bash
# Build contract bundles
yarn build

# Run tests
yarn test
```

## Deployment

This package follows the Agoric deployment pattern:
1. Build contract bundles
2. Install bundles (requires IST for fees)
3. Submit CoreEval proposal to governance
4. Wait for proposal to pass and contract to be instantiated
