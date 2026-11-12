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
`tokenId`, and raw asset-unit `amount`; `valueUusd` is optional micro-USD.
`HoldingDetail` is the union of legacy balance entries and typed raw holdings.
`HoldingDetailShape` and `PlanObservationsShape` check structural input;
converters also validate place/kind compatibility, canonical token identifiers,
integer ranges, and duplicate `(place, kind, tokenId)` identities. Identity
comparisons are exact: EVM contract addresses must be lowercase `0x` hex, while
other chain identifiers retain their canonical spelling and case.
`claimable-reward` belongs to an instrument; `claimed-reward` belongs to a chain
account.

`tokenId` identifies the asset locally to the chain implied by `place`; it does
not repeat the chain as a full CAIP-19 identifier. EVM contract holdings use the
lowercase contract address. Every Cosmos bank asset is an ordinary `token`
holding with its raw bank denom, for example
`{ place: '@noble', kind: 'token', tokenId: 'uusdc', amount: 1_000_000n }`.
IBC and token-factory assets use their exact `ibc/…` or `factory/…` denoms.
Different denoms remain distinct even when their display symbols match. Future
chains can use their own identifiers, such as Solana base58 mint addresses.
Resolve decimal scale from chain asset metadata for the identifier, never from
a display symbol. `amount` is in raw base units.

`$SYMBOL` is reserved for a chain's own coin on chains where other tokens are
contracts, such as `$ETH`, `$AVAX`, or later `$SOL`. The nonempty symbol is its
display symbol; `tokenId` is the empty string, not the zero address. Cosmos bank
assets do not use `$` kinds. `$` kinds and Cosmos USDC are never reward-swap
input.

The signed `tokenId: string` field replaces `tokenAddress: address` in
`YmaxObservation` domain version `1`. Nothing deployed or emitted typed
holdings with the old field, so no contract upgrade or live migration is
needed. SDK verifiers and YDS producers must adopt the schema together before
enabling hybrid observations or contract consumers of `holdings`. Legacy
balance-only signatures are unchanged. The converter checks identifier syntax
but does not resolve chain asset metadata or establish execution support.

Use the existing observation schema, kit, and converters from
`./src/observation-messages.js`: `YmaxObservationMessageSchema`,
`ymaxObservationMessageKit`, `portfolioObservationsToEIP712`, and
`portfolioObservationsFromEIP712`. Both legacy balances and typed holdings use
`YmaxObservation` domain version `1`; resolved signed struct definitions identify
which optional fields were included. Legacy balance-only messages retain their
original signed field definitions. There are no separate v2 schema exports.

The micro-USD valuation field is `valueUusd` in both application data and signed
holdings. In application data, an unknown valuation is an absent `valueUusd`,
distinct from a known zero. EIP-712 cannot omit a field from only some instances
of a struct type, so on the wire every typed holding carries `valueUusd` as an
`int256`, with a sentinel `VALUE_UUSD_UNKNOWN` (`-1n`) standing for an unknown
valuation. `portfolioObservationsToEIP712` encodes an absent valuation as the
sentinel and `portfolioObservationsFromEIP712` strips it; the sentinel never
appears in `TypedHoldingDetail`. Known valuations must satisfy `0n <= value <=
MAX_VALUE_UUSD` (`2n ** 255n - 1n`). Integer normalization works without Endo
initialization.

Deprecated `balanceUsdc` remains optional unsigned `uint256` without a
sentinel: include it on every raw holding or omit it from all of them. It is a
transitional bridge for consumers that still read legacy `balances`: decoding
typed holdings sums `balanceUsdc` per place into `balances`. Producers put the
place's legacy balance on one holding per place and `0n` on the others.
`valueUusd` never feeds `balances`. When authoring typed holdings, `balances`
may be empty or must equal that derivation (as decoding returns); anything else
is rejected rather than silently discarded.

Removal timeline: (1) deploy contracts that accept typed holdings; (2) switch
producers to typed holdings carrying `balanceUsdc`; (3) move contract consumers
from `balances` to `holdings`; (4) stop producing `balanceUsdc`, then drop
legacy balance-only holdings and `balanceUsdc` from the schema.

A raw zero is an explicit `amount: 0n`; an absent holding is unobserved. Empty holdings
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
