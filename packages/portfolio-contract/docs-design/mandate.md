# Delegated Portfolio Mandates

The delegation registry's `PortfolioPermissions` record is the mandate. There
is no parallel mandate object or version: `policyVersion` is the revision used
for stale-work detection and is copied onto accepted delegated flow audit
state.

Each configured quantitative limit is keyed by instrument. This lets an owner
set different weight, underlying-vault TVL, and vault-share limits for Aave and
Compound. Instruments absent from the constraint map remain subject to the
existing native-USDC instrument universe and exact target-allocation key-set
rule, but have no additional quantitative limit.

For delegated `setTargetAllocation` or `rebalance`, the contract:

1. resolves the live `agentN` record and verifies the client and operation
   permission;
2. checks the submitted sync state;
3. checks contract-state-only constraints such as maximum allocation weight;
4. changes policy and starts an attributed flow; and
5. when the planner calls `resolvePlan`, evaluates any minimum-TVL and maximum
   vault-share constraints using the observations attached to that plan before
   installing its steps.

Constraint errors use stable prefixes such as `mandate.maxWeight`,
`mandate.minVaultTvl`, and `mandate.maxVaultShare`. Missing required
observations fail the flow closed. The balance snapshot includes current
positions and cash; transfer history is not treated as portfolio valuation
because it omits yield, losses, and undeployed cash.

`ChangePermissions` is owner-signed full replacement. `Revoke` is irreversible
for the named external record. Both advance `policyVersion` exactly once after
all validation and retain the stable agent identity for audit. The planner's
reserved delegation is not reachable through either external operation.

The observations are used only for externally delegated flows. Owner flows and
automatic rebalancing are unchanged. Because the planner supplies both the
plan and the observations, this is planner-attested checking rather than an
independent control against planner compromise.
