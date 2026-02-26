# Vault Accounting Extension (Spike)

## Purpose

Capture the chosen spike approach for cross-chain yield while keeping canonical shares on one EVM vault contract.

This document is a design artifact for the spike. It defines behavior and invariants. Solidity tests are planned next, but are intentionally not included in this change.

## Chosen Model

- Vault is ERC-4626-compatible for user-facing deposit/redeem semantics.
- Vault includes a privileged extension for Ymax orchestration on the vault chain.
- Vault constructor stores `ownerPortfolioAccount` (the smart-wallet address corresponding to `p75` on that chain, e.g. `@Avalanche`).
- Privileged extension can move local USDC out of vault custody to `ownerPortfolioAccount` for cross-chain strategy execution.
- Share accounting includes out-of-vault managed assets.

## Core State

- `asset` = USDC ERC-20 address.
- `ownerPortfolioAccount` = privileged caller for orchestration methods.
- `managedAssets` = amount of USDC-equivalent value deployed outside the vault contract balance, but still owned economically by vault shareholders.
- `localLiquidityFloorAssets` = minimum local USDC buffer.
- `localLiquidityPct` = percent-based local USDC target.
- `rebalanceIfOffByPct` = hysteresis band for local-liquidity adjustments (`5%` for Chris spike).

## Core Invariant

- `totalAssets() = usdc.balanceOf(vault) + managedAssets`

Implication:
- Moving funds from vault balance to `ownerPortfolioAccount` must not reduce shareholder value mechanically.
- The transfer out reduces local balance and increases `managedAssets` by the same amount.

## Methods (Spike Shape)

User-facing (standard):
- `deposit(uint256 assets, address receiver)`
- `redeem(uint256 shares, address receiver, address owner)`

Privileged extension (spike):
- `deployToPortfolio(uint256 assets)`
  - `require(msg.sender == ownerPortfolioAccount)`
  - transfer `assets` USDC from vault to `ownerPortfolioAccount`
  - increment `managedAssets` by `assets`
  - emit `PortfolioDeploy(ownerPortfolioAccount, assets)`

- `reportManagedAssets(uint256 newManagedAssets, uint256 asOf, bytes32 reportId)`
  - restricted to trusted reporting authority (resolver-gated path for spike)
  - sets or updates `managedAssets` from orchestration outcomes
  - emits `ManagedAssetsReported(newManagedAssets, asOf, reportId)`

Notes:
- Exact authority wiring for `reportManagedAssets` is part of spike seam work; trust minimization is product follow-up.
- Naming is provisional; behavior and invariants matter more than exact method names for the spike.

## Local Liquidity Policy (Chosen for Chris Spike)

- Target local liquidity uses a tiered formula:
  - `targetLocalLiquidity = max(localLiquidityFloorAssets, localLiquidityPct * totalAssets())`
- Use hysteresis to avoid churn:
  - only adjust when deviation exceeds `rebalanceIfOffByPct` (`5%` in spike config)
- On `deposit(...)` and periodic rebalance:
  - if local liquidity is above target band, deploy only the excess via `deployToPortfolio(...)`
  - update `managedAssets` consistently with deploy operations

## Redemption/Liquidity Policy

For sync redeem:
- allowed only when local vault USDC liquidity is sufficient for `assetsOut`
- and accounting state freshness requirements are met

Otherwise:
- sync redeem fails in spike path
- async redemption (`requestRedeem`) remains stretch-goal path

## Relationship To Existing Ymax Pieces

- Agoric contract controls policy and orchestration intent.
- Cross-chain execution outcomes are observed via resolver success/failure and reporting seams.
- Planner can assume portfolio liquidity at `@Avalanche` after deploy operations; it does not need direct vault custody to plan subsequent steps.

## Out Of Scope For This Spike

- Full decentralization hardening of managed-assets/NAV source.
- Final production authority model for reporting updates.
- Permit2 integration in vault deposit UX (tracked separately as product TODO).

## Planned Next Step

- Encode this design as Solidity unit tests first:
  - privileged caller checks
  - deploy accounting invariants
  - `totalAssets` consistency
  - redeem gating on local liquidity/freshness
