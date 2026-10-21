# Delegated Portfolio Mandates

The delegation registry's `PortfolioPermissions` record is the mandate. There
is no parallel mandate object or version: `policyVersion` is the revision used
for stale-work detection and is copied onto accepted delegated flow audit
state.

Each delegation has one optional maximum-weight, minimum-vault-TVL, and
maximum-vault-share limit. The limits are expressed across all: maximum weight
applies to every non-cash position, while the vault limits apply to every
instrument with an underlying-vault observation. Cash remains exempt, and the
existing native-USDC instrument universe and exact target-allocation key-set
rule are unchanged.

For delegated `setTargetAllocation` or `rebalance`, the contract:

1. resolves the live `agentN` record and verifies the client and operation
   permission;
2. checks the submitted sync state;
3. allocates, starts, and publishes an attributed flow;
4. evaluates maximum allocation weight and terminates the started flow on a
   violation; and
5. when the planner calls `resolvePlan`, evaluates all quantitative constraints
   against the proposed target and attached observations before committing the
   target as policy or installing plan steps.

Every quantitative violation therefore produces a terminal failed flow with
the accepted `agentN`, `policyVersion`, stable constraint identifier, and
affected instrument. It does not move assets or change the portfolio policy.

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
