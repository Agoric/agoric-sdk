# Maximum Vault Share Data Sources

## Scope

A maximum-vault-share mandate judges the proposed allocation weight:

```text
portfolioValueMicroUsd * instrumentPortion
  <= instrumentTvlUsd * totalPortions * maxVaultShareBps * 100
```

Net deposits to one position are not the quantity being bounded. The proposed
weight assigns a fraction of total portfolio value to the position, so the
check needs total portfolio value. Position transfer history also omits yield,
losses, and cash.

This note compares two ways to obtain the off-chain facts. Both enforce the
target allocation, not the effects of arbitrary movement steps.

## A. Independent TVL oracle plus net deposits

An invited oracle publishes instrument TVL to the contract. The contract
estimates portfolio value from cumulative deposits minus withdrawals and can
check a delegated request after creating its attributed flow but before changing
policy or allowing asset movement.

Benefits:

- The planner cannot choose either the TVL or the portfolio-value estimate.
- Rejection occurs on the started flow before policy mutation.
- One TVL report serves all portfolios and non-planning readers.
- Plan messages remain small.

Costs and limitations:

- A separate signer, invitation, delivery loop, monitoring, rotation, and
  revocation process must be operated.
- Periodic oracle updates consume chain resources even without a plan.
- TVL reports and the portfolio estimate are not one coherent snapshot.
- Net deposits can under- or overestimate value because they omit performance
  and cash. The control can admit an unsafe allocation or reject a safe one.
- A timestamp orders reports but does not itself enforce freshness.

## B. Observations attached to delegated plans

The planner attaches the balance snapshot it already collected and the TVLs it
obtained from YMax Data Service to `resolvePlan`:

```ts
type PlanObservations = {
  balances: Partial<Record<AssetPlaceRef, bigint>>; // micro-USDC
  instrumentTvls: Partial<
    Record<InstrumentId, { tvlUsd: bigint }>
  >;
};
```

The contract sums balances and applies the inequality before installing plan
steps. Missing observations required by a mandate fail the flow. The planner
transaction succeeds so the contract can durably reject the existing flow.

This path applies only to `resolvePlan` for flows attributed to an external
`agentN`. It does not change owner flows or the planner's automatic rebalance
operation. External delegates cannot deposit or withdraw, so the snapshot is
judging their proposed allocation of the portfolio value that the planner has
just queried.

Benefits:

- Current cross-chain balances include positions, performance, and cash.
- Balance, TVL, and plan observations come from the same planning cycle.
- There is no separate oracle capability or periodic on-chain update service.
- Chain writes occur only for relevant plans.
- Attached observations explain why a delegated flow passed or failed.

Costs and limitations:

- The observations are assertions by the same planner that submits the plan;
  they are not independent attestation.
- Delegated requests can pass initial acceptance and fail later during
  planning.
- Plan messages are larger and the planner API is wider.
- TVL is unavailable on chain outside plan submissions.

## Compromise and blast radius

| Compromise | Independent oracle + net deposits | Plan-attached observations |
| --- | --- | --- |
| Planner key or service | Potentially all portfolios served by it. It cannot forge the independent facts, but current step validation does not fully prove that steps realize the accepted target, so customers remain exposed until plan-effect validation or reconciliation is added. | Potentially all portfolios served by it. It can choose both the plan and the assertions that approve it. `maxVaultShareBps` is not protection from planner compromise. |
| Oracle key or TVL source | All constrained portfolios using the affected instrument can be exposed to excessive concentration after a high report, or denied service after a low/missing report. The oracle cannot itself create a flow or move funds. | No oracle component exists. Compromise of the planner's TVL provider can affect every plan using bad data; the provider has no direct chain capability, but the contract cannot distinguish its output from truth. |
| Balance/accounting source | Contract accounting bugs can affect every constrained portfolio. Approximation error varies with each portfolio's history; no off-chain key can directly forge the totals. | Compromise of balance providers can understate value and admit excess concentration, or overstate it and deny service, across affected portfolios or chains. |
| External delegate | Normally portfolio-local. Independent observations prevent it from choosing facts that relax its mandate. | Normally portfolio-local while the planner is honest. The delegate cannot directly call the planner facet, but collusion or planner compromise removes the observation control. |
| Contract or upgrade authority | Potentially every customer in the contract instance under either design. | Potentially every customer in the contract instance under either design. |

The independent design has more operational and denial-of-service failure
modes. Its observation signer has broad but indirect financial authority: a
false report weakens the control, but another authorized actor must request or
execute the allocation. The plan-attached design has fewer components but
concentrates authority: one planner compromise can weaken the check and submit
the action for all customers it serves.

Shared upstream data can defeat apparent separation. If the oracle and planner
consume the same compromised source, separate keys do not provide independent
truth.

## What neither design guarantees

The contract checks the target allocation and prevents plans from introducing
unapproved positions, but it does not derive final balances from arbitrary
submitted steps. Neither data-source design alone proves that the executed
position remains below the maximum share. Strong containment of a compromised
planner additionally requires contract validation of plan effects or
post-execution reconciliation with a defined breach response.

## Choice

Use the independent oracle design when maximum share must be defense in depth
against planner compromise or TVL must be continuously available on chain. Its
operational cost buys a separate authority, although net deposits remain a weak
valuation proxy.

Use plan-attached observations when the planner is already trusted for market
and balance truth and the priorities are current valuation and operational
simplicity. Describe the result as planner-attested mandate checking, not an
independent risk control.

A hybrid—independent TVL plus planner-supplied balances—improves valuation
without letting the plan submitter choose both sides of the inequality.
