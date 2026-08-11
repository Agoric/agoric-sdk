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

At delegated `setTargetAllocation` or `rebalance` acceptance, the contract:

1. resolves the live `agentN` record and verifies the client and operation
   permission;
2. checks the submitted sync state;
3. evaluates the resulting target allocation using that record's current
   per-instrument constraints and current instrument-oracle TVL; and
4. only then changes policy or starts an attributed flow.

Constraint errors use stable prefixes such as `mandate.maxWeight`,
`mandate.minVaultTvl`, and `mandate.maxVaultShare`. Missing oracle data fails
closed. For the pilot, the portfolio USD valuation used by maximum-vault-share
checks is the sum of each position's cumulative USDC transfers in minus
transfers out, rounded up to whole USD. This is intentionally an estimate: it
does not include accrued yield, losses, or undeployed cash; a negative net is
treated as zero.

`ChangePermissions` is owner-signed full replacement. `Revoke` is irreversible
for the named external record. Both advance `policyVersion` exactly once after
all validation and retain the stable agent identity for audit. The planner's
reserved delegation is not reachable through either external operation.
