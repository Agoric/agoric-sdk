# Pendle Questions

Source: [Pendle_Spike.md](../.cache/gdocs/Pendle_Spike.md)

## Router / Contract Interface

- [x] What are the function signatures for buying PT with USDC and redeeming PT at/after maturity?
  - The obvious PT-only router methods are:
    - buy: `swapExactTokenForPt`
    - early exit before maturity: `swapExactPtForToken`
    - redeem at or after maturity: `redeemPyToToken`
  - We have an initial shared ABI in [pendle.ts](../src/interfaces/pendle.ts) for these methods.
- [x] What approvals are needed from the remote account?
  - For the common Ymax paths, entering a position should look like `USDC.approve(router, amount)`, and redeeming a matured position should look like `PT.approve(router, amount)` before calling the router redemption method.
  - In production, the exact approval set should come from the concrete route returned by Pendle's Hosted SDK. The Pendle adapter in planner land should read `requiredApprovals` from that route and include the corresponding approval call(s) in the execution plan passed to `portfolio-contract`.
  - `portfolio-contract` then executes that plan on the remote account.
  - The lab path in [pendle-open-position-lab.ts](../../../multichain-testing/scripts/pendle-open-position-lab.ts) follows this pattern by reading `quote.requiredApprovals`, checking `allowance`, and calling `approve(spender, amount)` before executing the quoted route.
  - Pendle API docs: [API Overview](https://docs.pendle.finance/pendle-v2/Developers/Backend/ApiOverview)
- [x] Is there a separate redemption contract post-maturity, or does the Router handle both entry and exit?
  - For PT-only Ymax integration, the Router is the relevant integration surface for both entry and exit.
  - Before maturity, exit is a market sale through the Router.
  - At or after maturity, exit is redemption through the Router rather than a market sale.
  - Pendle Router overview lists both trading and minting/redeeming functions on the same router surface: [Pendle Router Overview](https://docs.pendle.finance/cn/pendle-v2/Developers/Contracts/PendleRouter/PendleRouterOverview)
  - Pendle's yield-tokenization docs confirm that post-expiry only PT is required for redemption: [Yield Tokenization Smart Contracts](https://docs.pendle.finance/pendle-v2/Developers/Contracts/YieldTokenization)
- [x] What is the slippage model on the Pendle AMM for PT purchases?
  - Pendle's AMM prices PT trades at the current market-implied fixed yield, so buying PT before maturity is a market trade with price impact and slippage.
  - `swapExactTokenForPt` uses `minPtOut` as the on-chain protection against receiving too little PT, and the quote path includes approximation data such as `guessPtOut`.
  - Pendle recommends using the Hosted SDK to produce the route and approximation inputs: [PT Trading Functions](https://docs.pendle.finance/pendle-v2/Developers/Contracts/PendleRouter/ApiReference/PtFunctions), [Pendle Router Overview](https://docs.pendle.finance/cn/pendle-v2/Developers/Contracts/PendleRouter/PendleRouterOverview)
- [x] How do we parameterize acceptable slippage?
  - The off-chain Pendle adapter should pass an explicit `slippage` parameter to the Hosted SDK quote request.
  - The resulting route then carries the corresponding min-out protection:
    - `minPtOut` for buys
    - `minTokenOut` in `TokenOutput` for token exits
  - Our current helper and lab script already follow this pattern:
    - [pendle-api.ts](../test/pendle-api.ts)
    - [pendle-open-position-lab.ts](../../../multichain-testing/scripts/pendle-open-position-lab.ts)
  - PRODUCT-TODO: decide where Ymax's Pendle slippage policy lives and how it is configured. This spike assumes such a policy exists, but does not define it.

## Instrument / Data Model

- [ ] How should the instrument data model change?
- [ ] At minimum we need: `maturityDate`, `impliedFixedYield` at time of purchase, `underlyingAsset`, `ptTokenAddress`, `marketAddress`.
- [ ] How do we track the user's effective fixed yield?
- [ ] Multiple maturities may exist for the same underlying; how do we model them as separate instruments?

## Rebalancing / Maturity Handling

- [ ] Selling PT before maturity is a market trade. How should the rebalancer account for this?
- [ ] What disclosure should we show when a rebalance sells PT before maturity?
- [ ] How do we estimate slippage and size limits from Pendle AMM liquidity?
- [ ] At maturity, should Ymax auto-redeem PT to USDC, what triggering mechanism would do this, what gas cost would it impose, and does this need a new transaction type in our system?

## Data / API

- [ ] What does Pendle's public API surface look like for list of active PT markets, current implied yield, historical implied yield, current PT price, and TVL?
- [ ] Is the API reliable enough for production use, or do we need to read on-chain?
- [ ] How frequently does implied yield data update?
- [ ] Can we poll at the same cadence as existing instrument APY data?
- [ ] Does Pendle have a subgraph or indexer we can leverage?
