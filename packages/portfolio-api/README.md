# Portfolio management API

API shared between on-chain contract and external clients

## Withdrawals and typed observations

Movements use `withdraw?: WithdrawParams` without parameterizing `MovementDesc`
or `FundsFlowPlan`. The shared `WithdrawParamsShape` checks structural input:
optional `max` and nonnegative bigint `amountOfShares`.
Consumers implementing these options must also validate source/destination
routes and the selected holding's identity. A Shape match alone does not
authorize execution.

The movement's `amount` is default-token units (micro-USDC) received at `dest`.
It is a minimum if `max` is true or `amountOfShares` is supplied, otherwise exact.
`amountOfShares` is raw share-token units: exact unless `max` is true. Without
it, a position interprets the movement's `amount` in principal-token units.

Withdrawal options are additive. A contract that does not implement them can
accept the structure and execute the movement's `amount` exactly, ignoring the
options. This is the current contract's fallback; `amount: 0` may fail
validation. API acceptance does not imply full-exit or share-quantity support.

`MovementDescExt` and `FundsFlowPlanExt` provide forward-compatible structural
input types. They allow future source/destination place strings and additional
movement/plan fields, while preserving the required ERTP `amount`, known
withdrawal options, and other declared field types. The contract's
`makeOfferArgsShapes` exposes matching `movementDescShapeExt` and `planShapeExt`,
with the same flow/dependency size limits as ordinary plans. Ext acceptance
alone does not establish that a place or withdrawal operation is supported;
existing offer boundaries and execution behavior remain unchanged.

`PlanObservations` retains legacy aggregate `balances` and optionally carries
`holdings: TypedHoldingDetail[]`. Each raw holding identifies `place`, `kind`,
`tokenAddress`, and native-unit `amount`; `valueUsd` is optional micro-USD.
`HoldingDetail` is the union of legacy balance entries and typed raw holdings.
`HoldingDetailShape` and `PlanObservationsShape` check structural input;
converters also validate place/kind compatibility, addresses, native-token zero
addresses, integer ranges, and duplicate holding identities (case-insensitive
addresses). `claimable-reward` belongs to an instrument; `claimed-reward`
belongs to a chain account.

Use the existing observation schema, kit, and converters from
`./src/observation-messages.js`: `YmaxObservationMessageSchema`,
`ymaxObservationMessageKit`, `portfolioObservationsToEIP712`, and
`portfolioObservationsFromEIP712`. Both legacy balances and typed holdings use
`YmaxObservation` domain version `1`; resolved signed struct definitions identify
which optional fields were included. Legacy balance-only messages retain their
original signed field definitions. There are no separate v2 schema exports.

In JavaScript, unknown valuation is `undefined`, distinct from known zero.
The `valueUsd` field uses `int256` and `optSentinel: -1n` to encode unknown
valuations. Known valuations must satisfy
`0n <= value <= maxSignedBigInt(256n)`. Authoring encodes explicit `undefined`
values as the sentinel; trusted-schema extraction decodes them without mutating
the signed wire data. Integer normalization works without Endo initialization.

Optional-field presence must be uniform per signed struct type. To mix known,
zero, and unknown valuations, supply a `valueUsd` property on
every raw holding, using explicit `undefined` for unknown values. The converter
validates holdings without adding or rewriting fields. Deprecated
`balanceUsdc` remains
optional unsigned `uint256`: include it on every raw holding or omit it from
all of them. It does not use the valuation sentinel.

A raw zero is an explicit `amount: 0n`; an absent holding is unobserved. Typed
valuations do not imply aggregate balances. Supply either legacy `balances` or
raw `holdings` with `balances: {}`; combining nonempty aggregate balances with
raw holdings is rejected rather than silently discarding data. Empty holdings
and empty balances encode the same empty array and decode to empty balances.
The decoder expects normalized data extracted with
`onUnknownSignedField: 'throw'` after signature/domain verification; it does not
verify signatures itself. Supporting the schema does not implement withdrawal
execution or authorize a source holding. This API does not sign plans.

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
