**Flow 1: Auction raises enough IST to cover debt**

The following steps occur in this order

1. IST raised by the auction is burned to reduce debt in 1:1 ratio.

- Definitionally, this should result in zero debt. Since the auction should stop when it raises enough IST, it should result in zero IST remaining as well. However, if some excess IST exists, it should be transferred to the reserve

2. From any remaining collateral, the liquidation penalty is taken and transferred to the reserve

- Liquidation penalty is calculated as debt / current oracle price at auction start \* liquidation penalty

3. Excess collateral - if any - is returned to vault holders

- Vault holders receive collateral back sequenced by highest collateralization ratio at liquidation time first.
- The max amount of collateral a vault should be able to receive back is:
  original collateral - collateral covering their share of debt (using average liquidation price) - collateral covering their share of the penalty (their debt / total debt \* total penalty)

**Flow 2: Auction does not raise enough to cover IST debt**

This flow further bifurcates based on whether the auction has sold all its collateral asset and still has not covered the debt or has collateral remaining (which simply did not receive bidders)

**Flow 2a: all collateral sold and debt is not covered**

1. IST raised by the auction is burned to reduce debt in 1:1 ratio.

- Definitionally, this should result in zero IST remaining and some debt remaining

2. Remaining debt is recorded in the reserve as a shortfall
   ::sequence ends; no penalty is taken and vaults receive nothing back::

**Flow 2b: collateral remains but debt is still not covered by IST raised by auction end**

1. IST raised by the auction is burned to reduce debt in 1:1 ratio.

- Definitionally, this should result in zero IST remaining and some debt remaining

2. From any remaining collateral, the liquidation penalty is taken and transferred to the reserve

- Liquidation penalty is calculated as debt / current oracle price at auction start \* liquidation penalty
  _Note: there now should be debt remaining and possibly collateral remaining_

3. The vault manager now iterates through the vaults that were liquidated and attempts to reconstitute them (minus collateral from the liquidation penalty) starting from the best CR to worst

- Reconstitution means full prior debt AND full prior collateral minus collateral used from penalty
- Collateral used for penalty = vault debt / total debt \* total liquidation penalty
- Debt that is given back to a vault should be subtracted from the vault manager's view of remaining liquidation debt (i.e., it shouldn't be double counted)
- Reconstituted vaults are set to OPEN status (i.e., they are live again and able to be interacted with)

4. When the vault manager reaches a vault it cannot fully reconstitute (both full debt and collateral as described above), it marks that vault as liquidated. It then marks all other lower CR vaults as liquidated.
5. Any remaining collateral is transferred to the reserve
6. Any remaining debt (subtracting debt that was given back to reconstituted vaults, as described above) is transferred to the reserve as shortfall
