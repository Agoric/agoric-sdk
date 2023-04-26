# An Attacker's guide to the Vault Factory

This is an incomplete list of potential weak points that an attacker might want to focus
on when looking for ways to violate the integrity of the Vault Factory. It's here to help
defenders, as "attacker's mindset" is a good way to focus attention for the defender. The
list should correspond pretty closely to the set of assurances that the Vault Factory aims
to support.

The VaultFactory's purpose is to make it possible for users to deposit valuable tokens and
borrow `Minted` in exchange. They will pay interest on the total outstanding balance, and have
to pay off the debt or deposit additional collateral to ensure that the ratio of debt to
collateral stays above a threshold. When the VaultManager detects that the ratio has
fallen below the limit, their collateral will be sold.

Part of the purpose of the Vault mechanism is to link the price of `Minted` to
dollar-equivalents. We're currently getting prices from a configured PriceAuthority in
RUN, but this should (https://github.com/Agoric/agoric-sdk/issues/4714) be changed to be
priced in US Dollars. Tying the price at which Vaults lend `Minted` to the dollar price of the
collateral is intended to set a ceiling on what one might pay for `Minted`. The fact that
vaults get liquidated to the AMM if the dollar-value of the collateral falls below the
required ratio should restore the value of `Minted` when collateral values fall. In DAI, the
same linkage is enforced by auctioning off the collateral. Does selling into the AMM
achieve the same end?

## VaultManager

Collateral from all borrowers who have deposited the same currency is intermingled. If we
don't keep good records or can be confused about how much belongs to whom, there could be
unintended interactions between the vaults held by a single VaultManager on behalf of
different users.

The VaultManagers calculate interest once daily, and record the change centrally without
updating individual vaults. Vault owners must not be able to adjust balances or close
their vault without being impacted by their up-to-date debt.

## Fees

Fees are charged when Vaults are opened, and as interest is charged. That money is
available to be collected by the creator of the VaultFactory. Is the fee collection
interface guarded carefully enough? Can any unintended party collect the fees?

## `Minted` Mint

The VaultManager has access to the `Minted` mint, and can create new `Minted` freely. This power is
shared with every Vault, so if they can be suborned, arbitrary `Minted` can be created. Is this
power sufficiently constrained?

## Vaults

When the user repays their debt, they can withdraw collateral. Actually, they can withdraw
collateral to the extent that it isn't required by the current loan. Can they ever
withdraw more than that, and leave their loan under-collateralized?

If prices are falling and the trader can see that more clearly than the Vaults do, could
they withdraw liquidity before the Vaults realize that the price has changed? We
understand this is a distributed, asynchronous system, so to some extent, this is
inevitable. Are the Vaults more susceptible to this than is justifiable?

Vaults are stored in an orderedStore so that they can be efficiently liquidated in the
order from least to most collateralized. Are there any edge cases that would cause Vaults
to not be processed in the right order? Could a Vault escape the queue and evade
liquidation?

## Burn

We burn amounts from liquidation and from paying off debts. Do we always get the amounts
right? Do we burn everywhere we should? Reallocate ensures that rights are conserved, so
no `Minted` is created or destroyed in reallocation. If we burn the wrong amounts, someone will
end up with too much or too little.

## Liquidation

The liquidation mechanism is subject to governance. Is the current strategy legible
(i.e. can Vault users tell how the liquidation will be carried out?) Is the liquidation
approach destabilizing?
 
