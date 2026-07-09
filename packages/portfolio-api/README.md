# Portfolio management API

API shared between on-chain contract and external clients

## YDS Target Balances

The YMax Data Service (YDS) should import the shared target-balance helper and
production network data from this public package. `@agoric/portfolio-api`
participates in the repo's after-merge canary publish flow, so production
network changes can propagate without waiting for `@aglocal/portfolio-contract`
packaging.

```js
import { computeTargetBalances } from '@agoric/portfolio-api/src/target-balances.js';
import { PROD_NETWORK } from '@agoric/portfolio-api/src/network/prod-network.js';

const changedTargets = computeTargetBalances({
  brand: usdcBrand,
  currentBalances,
  balanceDelta,
  targetAllocation,
  network: PROD_NETWORK,
  depositFromChain,
});
```

`changedTargets` contains only balances that need to change. Use signed
minor-unit deltas: positive for deposits, negative for withdrawals, and `0n` for
rebalances.

Relevant explicit `package.json` subpath exports are:

- `./src/target-balances.js`
- `./src/network/prod-network.js`
- `./src/network/network-spec.js`
- `./src/places.js`
- `./src/type-guards.js`
- `./src/evm-wallet/eip712-messages.js`
- `./src/evm-wallet/message-handler-helpers.js`

Keep importing the `.js` subpaths so the same source works after packaging.
