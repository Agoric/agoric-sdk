# YMax Fees Status Quo (as observed from production flows)

## Scope

This document summarizes how fees work today in YMax, using one detailed flow (`portfolio80/flow3`) and three additional flows (`104.1`, `104.2`, `105.1`) to show what generalizes.

Primary goals:
- Explain where fee values come from in the current architecture.
- Show what is estimated vs what is actually paid.
- Provide concrete per-step/per-chain fee data from production flow artifacts.

TODO: Replace or remove `.context-fees/*` references so this committed doc does not link to ephemera paths.

Artifacts for this analysis are under `.context-fees/flow-reports/`.

## Sequence Basis (Design + Implementation)

### Design-level flow (from sequence diagrams)

From `DESIGN-BETA.md` and `docs-design/evm-wallet.md`, the recurring pattern is:

1. User initiates an operation (`deposit` or `withdraw`) from UI.
2. Portfolio contract records flow state in vstorage.
3. Planner observes flow state and reads balances/allocations.
4. Planner estimates cross-chain execution costs and emits a plan via `resolvePlan(portfolioId, flowId, plan, ...)`.
5. Contract executes plan steps (pool operations, CCTP/GMP legs, IBC legs).
6. Resolver/watchers observe remote tx completion and acknowledge progress back to portfolio flow state.

This matches diagrams such as:
- Planner observation and plan generation (`DESIGN-BETA.md`, deposit section)
- Withdraw orchestration via GMP/CCTP (`DESIGN-BETA.md`, withdraw section)
- EVM withdraw UX and contract path (`docs-design/evm-wallet.md`, withdraw sequence)

### Implementation-level fee path (current code)

Observed code path aligns with the above:

- Planner submits plan through `settle('resolvePlan', ...)`:
  - `services/ymax-planner/src/engine.ts`
- Planner fee estimation uses Axelar `POST /gmp/estimateGasFee` with operation-specific gas limits:
  - `services/ymax-planner/src/gas-estimation.ts`
- Plan construction applies fee padding/minimum rules:
  - `packages/portfolio-contract/tools/plan-solve.ts`
  - 20% padding (`padFeeEstimate`)
  - minimum GMP fee floor (`MINIMUM_GAS = 5_000_000n`)
- Contract execution consumes `move.fee` into `gmpFee` in EVM context:
  - `packages/portfolio-contract/src/portfolio.flows.ts`

## What “Fee” Means Today

There are two distinct fee domains:

1. Planner quoted fee in `uBLD` (attached per movement step as `fee.value`).
2. Actual execution fee on remote EVM chains (native gas from transaction receipts, e.g. ETH).

| Term | Unit | Meaning in this document |
|---|---|---|
| Planner fee | `uBLD` (shown as `BLD` in tables) | Fee amount attached to a planned movement step (`fee.value`) at planning time. |
| Fee Paid | `BLD` | Portion of planner fee that is actually spent by YMax for the step in observed execution. |
| Observed EVM fee | native gas token (shown as `ETH`) | On-chain execution gas from EVM receipts for the step, regardless of payer. |

Important status-quo consequence:
- We can link these two domains per flow/step analytically, but they are not represented as a single reconciled fee ledger in one canonical production table today.

## 80.3 Case Study: Withdraw on Ethereum Gas-Spike Day

`flow3` of `portfolio80` was on `2026-02-05`, while gas spiked as high as 19 gwei.

Fee Paid total for this flow is `6,865.312767 BLD` ≈ `$30.90` on `2026-02-05`, using `BLD/USD = 0.004500173541` from [CoinGecko historical price data](https://api.coingecko.com/api/v3/coins/agoric/history?date=05-02-2026&localization=false).

### `80.3` per-step fee trace

Planner fee below is converted from `uBLD` to `BLD`.

| Step | `src -> dest` | `how` | Planner fee (`BLD`, eng) | Fee Paid (`BLD`, eng) | Observed chain | Observed fee (`ETH`, eng) | Observed gas price (`gwei`, eng) |
|---|---|---|---:|---:|---|---:|---:|
| `tx1769` | `Aave_Base -> @Base` | `Aave` | `483.61e+0` | `483.61e+0` | `Base` | `185.16e-6` | `826.44e-3` |
| `tx1782` | `@Base -> @agoric` | `CCTP` | `431.07e+0` |  | `Base` | `94.800e-6` | `634.36e-3` |
| `tx1770` | `Compound_Arbitrum -> @Arbitrum` | `Compound` | `18.648e+0` | `18.648e+0` | `Arbitrum` | `8.2938e-6` | `42.634e-3` |
| `tx1776` | `@Arbitrum -> @agoric` | `CCTP` | `19.303e+0` |  | `Arbitrum` | `8.5752e-6` | `41.600e-3` |
| `tx1771` | `Compound_Optimism -> @Optimism` | `Compound` | `12.595e+0` | `12.595e+0` | `Optimism` | `1.1578e-6` | `1.8656e-3` |
| `tx1779` | `@Optimism -> @agoric` | `CCTP` | `12.639e+0` |  | `Optimism` | `1.5096e-6` | `1.8203e-3` |
| `tx1784` | `@agoric -> @noble` | `IBC to Noble` |  |  |  |  |  |
| `tx1785` | `@noble -> @Ethereum` | `CCTP` | `19.196e+3` |  | `Ethereum` | `3.0658e-3` | `19.197e+0` |
| `tx1787` | `@Ethereum -> -Ethereum` | `withdrawToEVM` | `6.3505e+3` | `6.3505e+3` | `Ethereum` | `1.8390e-3` | `19.279e+0` |

Note: for CCTP legs originating from Noble (for example `@noble -> @Ethereum`), the Ethereum L1 gas is paid by Noble relayers.

<details>
<summary><code>80.3</code> per-step fee trace (raw numbers)</summary>

| Step | `src -> dest` | `how` | Planner fee (`uBLD`) | Fee Paid (`uBLD`) | Observed chain | Observed fee (native) | Observed gas price (gwei) |
|---|---|---|---:|---:|---|---:|---:|
| `tx1769` | `Aave_Base -> @Base` | `Aave` | `+483608973` | `+483608973` | Base | `0.000185155489084850 ETH` | `0.826443067` |
| `tx1782` | `@Base -> @agoric` | `CCTP` | `+431074424` |  | Base | `0.000094800428503535 ETH` | `0.634362317` |
| `tx1770` | `Compound_Arbitrum -> @Arbitrum` | `Compound` | `+18647547` | `+18647547` | Arbitrum | `0.000008293847824000 ETH` | `0.042634` |
| `tx1776` | `@Arbitrum -> @agoric` | `CCTP` | `+19303035` |  | Arbitrum | `0.000008575174400000 ETH` | `0.0416` |
| `tx1771` | `Compound_Optimism -> @Optimism` | `Compound` | `+12594639` | `+12594639` | Optimism | `0.000001157831091289 ETH` | `0.00186557` |
| `tx1779` | `@Optimism -> @agoric` | `CCTP` | `+12639236` |  | Optimism | `0.000001509613405130 ETH` | `0.001820321` |
| `tx1784` | `@agoric -> @noble` | `IBC to Noble` |  |  | Agoric/Noble | n/a | n/a |
| `tx1785` | `@noble -> @Ethereum` | `CCTP` | `+19196329784` |  | Ethereum | `0.003065796944910854 ETH` | `19.197466123` |
| `tx1787` | `@Ethereum -> -Ethereum` | `withdrawToEVM` | `+6350461608` | `+6350461608` | Ethereum | `0.001838957998646800 ETH` | `19.2789164` |

</details>

### How fees are computed

This case maps directly to the 6-step sequence above:
1. User initiated a withdraw with `amount=3,000,000` (USDC base units), `type=withdraw`, `toChain=Ethereum`.
2. Portfolio contract recorded flow state under vstorage `portfolio80.flowsRunning.flow3` (status details include `type=withdraw`, `toChain=Ethereum`, `amount=3,000,000`).
3. Planner observed that running flow state and current portfolio balances/allocations.
4. Planner estimated costs and submitted `resolvePlan(...)` in tx `72C1CBB7099BCE96F5B0352B8F697A58B14FF35C9C8077D20E36F8233CD0745F` at `23926041` / `2026-02-05T20:41:45Z`.
5. Contract executed plan movements, including `tx1787` (`@Ethereum -> -Ethereum`, `withdrawToEVM`).
6. Resolver/watchers tracked remote execution and the flow reached terminal state.

Step 4 detail for `tx1787`: for the `@Ethereum -> -Ethereum` step, the planner first classifies it as an EVM withdraw leg and looks up a configured gas-limit value. For this path, it uses `gasLimit = 279473`. It then asks Axelar for a fee quote in `uBLD` using Agoric as source chain and Ethereum as destination chain.

```http
POST https://api.axelarscan.io/gmp/estimateGasFee
Content-Type: application/json

{
  "sourceChain": "agoric",
  "destinationChain": "Ethereum",
  "gasLimit": "279473",
  "sourceTokenSymbol": "ubld",
  "gasMultiplier": "1"
}
```

After Axelar returns the estimate, the planner applies its built-in fee policy: add a 20% buffer (`ceil(estimate * 1.2)`) and enforce a minimum of `5,000,000 uBLD`. For `tx1787`, that produces `6,350,461,608 uBLD` (`6,350.461608 BLD`, shown as `6.3505e+3`), implying a pre-buffer Axelar estimate of `5,292,051,340 uBLD`.

### `104.1` per-step fee trace (makeAccount case)

- Flow: `portfolio104/flow1`
- Type: `deposit`
- Source chain: `Ethereum`
- Planner submit tx: `246FBBC0E357638CB2C695D3C46824B490E2761A9D9B5852539A58A17007C4FF`
- Planner block/time: `24124345` / `2026-02-18T16:15:49Z`
- This flow includes `makeDestAccount` phases for Arbitrum, Optimism, and Base.

Planner fee below is converted from `uBLD` to `BLD`.
Fee Paid total for this flow is `265.951924 BLD` ≈ `$1.31` on `2026-02-18`, using `BLD/USD = 0.004911666143521906` from [CoinGecko historical price data](https://api.coingecko.com/api/v3/coins/agoric/history?date=18-02-2026&localization=false).

| Step | `src -> dest` | `how` | Planner fee (`BLD`, eng) | Fee Paid (`BLD`, eng) | Observed chain | Observed fee (`ETH`, eng) | Observed gas price (`gwei`, eng) |
|---|---|---|---:|---:|---|---:|---:|
| `tx2477` | `+Ethereum -> @Ethereum` | `createAndDeposit` | `97.429e+0` | `97.429e+0` | `Ethereum` | `292.84e-6` | `297.36e-3` |
| `tx2487` | `@Ethereum -> ERC4626_morphoClearstarHighYieldUsdc_Ethereum` | `ERC4626` | `107.67e+0` | `107.67e+0` | `Ethereum` | `135.40e-6` | `185.24e-3` |
| `tx2486` | `@Ethereum -> @agoric` | `CCTP` | `78.594e+0` |  | `Ethereum` | `27.546e-6` | `185.24e-3` |
| `tx2495` | `@agoric -> @noble` | `IBC to Noble` |  |  |  |  |  |
| `tx2478` | `@noble -> @Arbitrum` | `makeDestAccount` |  | `19.860e+0` | `Arbitrum` |  |  |
| `tx2496` | `@noble -> @Arbitrum` | `CCTP` | `19.860e+0` |  | `Arbitrum` | `3.2414e-6` | `20.260e-3` |
| `tx2479` | `@noble -> @Optimism` | `makeDestAccount` |  | `5.0000e+0` | `Optimism` |  |  |
| `tx2497` | `@noble -> @Optimism` | `CCTP` | `5.0000e+0` |  | `Optimism` | `169.07e-9` | `1.0143e-3` |
| `tx2480` | `@noble -> @Base` | `makeDestAccount` |  | `12.381e+0` | `Base` |  |  |
| `tx2498` | `@noble -> @Base` | `CCTP` | `12.381e+0` |  | `Base` | `1.4705e-6` | `9.1875e-3` |
| `tx2506` | `@Base -> Aave_Base` | `Aave` | `7.5711e+0` | `7.5711e+0` | `Base` | `2.3219e-6` | `8.9871e-3` |
| `tx2504` | `@Optimism -> Compound_Optimism` | `Compound` | `5.0000e+0` | `5.0000e+0` | `Optimism` | `24.909e-9` | `114.46e-6` |
| `tx2502` | `@Arbitrum -> ERC4626_morphoGauntletUsdcCore_Arbitrum` | `ERC4626` | `11.037e+0` | `11.037e+0` | `Arbitrum` | `14.425e-6` | `20.044e-3` |

## Comparison Across Investigated Flows (`80.3`, `104.1`, `104.2`, `105.1`)

### Flow-level summary

| Flow | Type | Direction | Planner tx hash | Planner time (UTC) | Steps |
|---|---|---|---|---|---:|
| `80.3` | withdraw | `toChain=Ethereum` | `72C1...745F` | `2026-02-05T20:41:45Z` | 9 |
| `104.1` | deposit | `fromChain=Ethereum` | `246F...C4FF` | `2026-02-18T16:15:49Z` | 10 |
| `104.2` | withdraw | `toChain=Ethereum` | `6268...6EB4` | `2026-02-19T23:31:29Z` | 10 |
| `105.1` | deposit | `fromChain=Ethereum` | `E50B...E92A` | `2026-02-19T15:54:54Z` | 3 |

### Fee comparison (max actually paid step)

| Flow | Date | Step | Max Fee Paid Step (`BLD`, eng) | Step kind | USD paid | BLD/USD | ETH paid (`eng`) |
|---|---|---|---:|---|---:|---:|---:|
| `80.3` | `2026-02-05` | `tx1787` | `6.3505e+3` | `withdrawToEVM` | `$28.58` | `0.004500173541` | `1.8390e-3` |
| `104.1` | `2026-02-18` | `tx2487` | `107.67e+0` | `ERC4626` | `$0.53` | `0.004911666144` | `135.40e-6` |
| `104.2` | `2026-02-19` | `tx2578` | `65.795e+0` | `withdrawToEVM` | `$0.34` | `0.005202275220` | `4.4472e-6` |
| `105.1` | `2026-02-19` | `tx2510` | `109.06e+0` | `ERC4626` | `$0.57` | `0.005202275220` | `178.11e-6` |

### Generalized pattern from all four flows

- Planner always produced step-level fee metadata in `uBLD` for fee-bearing EVM legs.
- The highest-cost share was generally on Ethereum legs.
- Actual observed EVM costs came from tx receipts and were measurable per step.
- `detail.evmGas` appears on selected cross-chain steps (not every step).
- Non-EVM legs (for example Agoric↔Noble IBC) are part of the flow but not represented as EVM receipt fees.

## Status Quo Conclusions

1. The current system has good per-step fee observability, but split across domains:
- Planner quote domain: `uBLD` in plan/spend_action.
- Settlement domain: native-chain gas in receipts.

2. End-user operations trigger a full planner-orchestrator-resolver pipeline where fees are estimated early (planner) and paid later (execution accounts).

3. A practical “status quo baseline” dataset can be produced now by joining:
- planner tx (`resolvePlan` / spend_action capdata)
- YDS flow steps + tx hashes
- EVM receipt/block fee fields

## References

Design docs used as sequence basis:
- `DESIGN-BETA.md`
- `docs-design/evm-wallet.md`

Implementation paths used for fee behavior:
- `services/ymax-planner/src/engine.ts`
- `services/ymax-planner/src/gas-estimation.ts`
- `packages/portfolio-contract/tools/plan-solve.ts`
- `packages/portfolio-contract/src/portfolio.flows.ts`

Data extraction script used for all four flows:
- `.context-fees/scripts/extract-flow-fees.ts`
