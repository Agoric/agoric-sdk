# Portfolio management API

API shared between on-chain contract and external clients

## Withdrawals and typed observations

Movements use `withdraw?: WithdrawParams` without parameterizing `MovementDesc`
or `FundsFlowPlan`. The shared `WithdrawParamsShape` checks structural input:
optional `max`, EVM `srcToken` string, and nonnegative bigint `srcAmount`.
Consumers implementing these options must also validate addresses, source/destination routes, and the
selected holding's identity and kind (`shares` or `principal`). A Shape match
alone does not authorize execution.

The movement's `amount` is default-token units (micro-USDC) received at `dest`.
It is a minimum if `max` is true or `srcAmount` is supplied, otherwise exact.
`srcAmount` is raw source-token units: exact unless `max` is true. Omitting
`srcToken` selects the default source holding.

Withdrawal options are additive. A contract that does not implement them can
accept the structure and execute the movement's `amount` exactly, ignoring the
options. This is the current contract's fallback; `amount: 0` may fail
validation. API acceptance does not imply full-exit or source-token support.

`HoldingDetail`, `HoldingKind`, and `PlanObservationsV2` describe flattened raw
holdings. A holding contains `place`, `kind`, `tokenAddress`, `amount`, and
required `valueUsd` (signed int256 micro-USD). `OPT_UINT_UNDEFINED` (`-1n`) means
unknown; known valuations are nonnegative. Deprecated `balanceUsdc` (micro-USDC)
is optional and uses the same `optUint255` representation when included.
`OPT_UINT_UNDEFINED` is exported from the package root, constants,
and observation-messages entrypoints.
The shared `optUint255` wire type is `'int256'`; `optUint255Shape` is
`M.or(OPT_UINT_UNDEFINED, M.nat())`. `maxOptUint255` is the exclusive wire bound
`2n ** 255n`, enforced by `assertOptUint255(value, field)`.
`opt-uint.ts` exports the Shape and re-exports its constants and assertion from
the pure `opt-uint-core.ts` module, keeping observation conversion usable without
Endo initialization. The observation-messages entrypoint exports the pure
helpers; the package root and constants entrypoint also export the Shape.
`HoldingDetailShape` and `PlanObservationsV2Shape` check structural input;
the observation converter checks place/kind compatibility, address validity,
native-token zero addresses, uint256/int256 ranges, and duplicate identities. Place
and instrument references use the existing extensible syntactic validators.
Duplicate `(place, kind, tokenAddress)` identities are rejected using
case-insensitive address comparison; distinct reward tokens can share a place.
Native-token kinds use `$SYMBOL`, such as `$ETH`.

Use the existing `./src/observation-messages.js` subpath for either version:

| Version | Schema and kit | Converters |
| --- | --- | --- |
| 1 | `YmaxObservationMessageSchema`, `ymaxObservationMessageKit` | `portfolioObservationsToEIP712`, `portfolioObservationsFromEIP712` |
| 2 | `YmaxObservationMessageSchemaV2`, `ymaxObservationMessageKitV2` | `portfolioObservationsToEIP712V2`, `portfolioObservationsFromEIP712V2` |

Version 1's schema, existing unversioned exports, and numeric observation conversion remain
unchanged. Version 2 uses the `YmaxObservation` domain with version `2` and the
required typed holding fields. Opt into v2 only after deploying verifier
support. Producers, verifiers, and clients must preserve the selected signed
schema; there is no automatic downgrade, share inference from valuation, or
unsigned enrichment of v1 observations. This API does not sign plans.

The v2 decoder expects normalized data extracted with
`onUnknownSignedField: 'throw'` after signature and domain verification; it does
not verify signatures itself. The existing contract verifier supports v1;
contract integration and execution remain separate work.

An explicit raw `amount: 0n` is observed zero. A missing holding is unobserved;
`valueUsd: OPT_UINT_UNDEFINED` means unvalued, distinct from a known `0n`
valuation. Known and unknown valuations can coexist in one signed message.
Missing `valueUsd` and negative values other than the sentinel are rejected.
No aggregate balances are inferred from holdings. Consumers requiring complete
valuation must reject unknown valuations rather than treating them as zero.
Required `valueUsd` and included deprecated `balanceUsdc` can independently be
observed or use `OPT_UINT_UNDEFINED` for each entry. Optional `balanceUsdc` must
be present in every entry in a signed message or absent from all entries; its
observed/unobserved status need not be uniform because the sentinel is a value.

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
