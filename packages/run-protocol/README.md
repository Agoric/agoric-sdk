# RUN protocol

## Overview

RUN is a stable token that enables the core of the Agoric economy.

By convention there is one well-known **VaultFactory**. By governance it creates a **VaultManager** for each type of asset that can serve as collateral to mint RUN.

Anyone can open make a **Vault** by putting up collateral the appropriate VaultManager. Then they can request RUN that is backed by that collateral.

When any vat the ratio of the debt to the collateral exceeds a governed threshold, the collateral is sold until the ratio reaches the set point. This is called liquidation and managed by the VaultManager.

## Persistence

The above states are robust to system restarts and upgrades. This is accomplished using the Agoric (Endo?) Collections API.

