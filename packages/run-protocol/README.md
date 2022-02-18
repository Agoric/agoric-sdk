# RUN protocol

## Overview

RUN is a stable token that enables the core of the Agoric economy.

By convention there is one well-known **VaultFactory**. By governance it creates a **VaultManager** for each type of asset that can serve as collateral to mint RUN.

Anyone can make a **Vault** by putting up collateral with the appropriate VaultManager. Then
they can request RUN that is backed by that collateral.

In any vault, when the ratio of the debt to the collateral exceeds a governed threshold, it is
deemed undercollateralized. If the result of a price check shows that a vault is
undercollateralized, the VaultManager liquidates it.
## Persistence

The above states are robust to system restarts and upgrades. This is accomplished using the Agoric (Endo?) Collections API.

## Debts

Debts are denominated in µRUN. (1 million µRUN = 1 RUN)

Each interest charging period (say daily) the actual debts in all vaults are affected. Materializing that across all vaults would be O(n) writes. Instead, to make charging interest O(1) we virtualize the debt that a vault owes to be a function of stable vault attributes and values that change in the vault manager when it charges interest. Specifically,
- a compoundedInterest value on the manager that keeps track of interest accrual since its launch
- a debtSnapshot on the vault by which one can calculate the actual debt

To maintain that the keys of vaults to liquidate are stable requires that its keys are also time-independent so they're recorded as a "normalized collateralization ratio", with the actual collateral divided by the normalized debt.
