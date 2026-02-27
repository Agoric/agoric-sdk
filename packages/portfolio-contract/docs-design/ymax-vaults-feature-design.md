# Ymax Creator Vaults Design

Current Ymax target users are sophisticated cross-chain portfolio operators.
There's an existing market of vaults of various strategies with common vault UX patterns:

- Morpho: reported growth from `67,000` to `1.4M+` users during 2025 ([Morpho 2026](https://morpho.org/blog/morpho-2026/), January 16, 2026).
- Veda (BoringVault infrastructure): reported deposits from `100,000+` users and `$3.7B+` TVL ([CoinDesk](https://www.coindesk.com/business/2025/06/23/veda-raises-usd18m-to-expand-defi-vault-infrastructure-powering-over-usd3-7b-in-assets), June 23, 2025).
- Beefy: community-reported `131,887` active users and `485,827` unique accounts ([Outposts](https://outposts.io/explore/beefy), accessed February 27, 2026).
- Yearn v3: launch examples reached `$10M+ TVL` per new Base vault in under 24h ([Yearn post via Outposts](https://outposts.io/article/yearn-v3-launches-new-seamless-vaults-on-base-ff98a05c-8d40-478e-a074-fa8f307d2978), February 2025).

ERC-4626 is the EVM tokenized-vault standard that normalizes deposit/redeem/share behavior and makes vault UX/tooling more interoperable.

Opportunity:
- connect Ymax to this larger audience by packaging Ymax portfolio execution as the strategy back-end for ERC-4626 vaults.

## Deposit Flow

Suppose a Ymax-based vault contract, `0xVAU1` on Avalanche, with UI at `/vault-1`, has already been set up, based on `portfolio75` for strategy execution.  (see  [Vault Setup Prerequisite](#vault-setup-prerequisite-how-0xvau1-and-vault-1-exist)).

A trader, Tim (`EOA 0xTIM`), discovers `/vault-1` and wants to participate using familiar ERC-4626 deposit behavior.
Tim deposits USDC and receives vault shares (`CVSH`).

Some deposited USDC remains in `0xVAU1` as local liquidity; excess USDC moves to the `@Avalanche` account of `portfolio75` for strategy execution.

### Deposit Sequence Diagram

Source: [docs-design/vault-deposit-flow.mmd](./vault-deposit-flow.mmd)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'background': '#f3f4f6', 'primaryColor': '#eef2f7', 'secondaryColor': '#e9eef5', 'tertiaryColor': '#f6f8fb', 'lineColor': '#5f6b7a', 'textColor': '#1f2937'}, 'themeCSS': '.sequenceNumber { font-size: 14px !important; font-weight: 600; }'}}%%
sequenceDiagram
    title Ymax Vault - Deposit Flow (USDC -> ERC-4626 Shares)
    autonumber

    actor user as Trader Tim<br/>EOA: 0xTIM
    participant wallet as MetaMask<br/>signer: 0xTIM
    participant ui as vault-ui-1<br/>URL: /vault-1

    box Avalanche C-Chain
    participant vault as vault-contract-1<br/>ERC-4626: 0xVAU1
    participant usdc as USDC Token<br/>ERC-20: 0xUSDC
    participant p75 as portfolio75 @Avalanche<br/>smart wallet
    end

    user->>ui: deposit(250USDC)
    ui-->>ui: approveTx = { to: 0xUSDC,<br/>spender: 0xVAU1, amount: 250USDC,<br/>data, chainId, nonce }
    ui-->>wallet: requestSignatureAndBroadcast(approveTx)
    wallet-->>user: promptApproval(approveTx)
    user->>wallet: approve(approveTx)
    wallet-->>usdc: approve(0xVAU1, 250USDC)
    ui-->>ui: depositTx = { to: 0xVAU1,<br/>assets: 250USDC, receiver: 0xTIM,<br/>data, chainId, nonce }
    ui-->>wallet: requestSignatureAndBroadcast(depositTx)
    wallet-->>user: promptApproval(depositTx)
    user->>wallet: approve(depositTx)
    wallet-->>vault: deposit(250USDC, 0xTIM)
    vault-->>usdc: transferFrom(0xTIM, 0xVAU1, 250USDC)
    vault-->>vault: computeExcess(tieredLiquidityPolicy, 5% hysteresis)
    vault-->>usdc: transfer(portfolio75@Avalanche, excessUSDC)
    Note over usdc,p75: emit Transfer(0xVAU1,<br/>portfolio75@Avalanche, excessUSDC)
    vault-->>vault: managedAssets += excessUSDC
    vault-->>ui: emit Deposit(0xTIM, 0xTIM, 250USDC, 250CVSH)
    loop polling interval
        ui->>ui: pollTick()
        ui-->>vault: balanceOf(0xTIM)
        vault-->>ui: balance=250CVSH
    end
    ui-->>user: balance=250CVSH
```

Diagram notation in this doc:
- `->>` spontaneous trigger action.
- `-->>` consequence/follow-on action.

### Step-by-Step Walkthrough

1. Tim starts at `/vault-1`, enters 250 in an amount field, and hits Deposit (represented as a `deposit(250USDC)` method invocation on the UI).
2. The UI asks MetaMask to sign/broadcast an `approve` transaction so `0xVAU1` can pull USDC. _This approve-per-deposit path is a spike simplification; production should use Permit2 (see [Appendix B](#appendix-b-product-todos))_.
3. The UI asks MetaMask to sign/broadcast `deposit(250USDC, 0xTIM)` on `0xVAU1`.
4. `0xVAU1` pulls 250 USDC from Tim via `transferFrom`.
5. `0xVAU1` computes local-liquidity target and excess _(tiered policy with 5% hysteresis for this spike; production parameter tuning is a product TODO in [Appendix B](#appendix-b-product-todos))_.
6. `0xVAU1` transfers excess USDC to `portfolio75`'s `@Avalanche` account.
7. `0xVAU1` updates `managedAssets` to preserve `totalAssets` accounting.
8. `0xVAU1` emits `Deposit(...)`, and the UI reads `balanceOf(0xTIM)` until it shows the new share balance.

### Key Mechanics In This Flow

- Familiar vault UX: two wallet-signed transactions (`approve`, then `deposit`), no custom custody workflow for trader Tim.
- Cross-chain handoff seam: excess funds move immediately to the `@Avalanche` account of `portfolio75`.
- Accounting invariant: `totalAssets = usdc.balanceOf(0xVAU1) + managedAssets` remains true as excess is deployed.
- Evidence shape: deposit correctness is observable from `Deposit` and `Transfer` events plus post-state balances.

## Withdraw (Sync Redeem Path)

### Withdraw Diagram

### Freshness and Liquidity Gates

## Vault Setup Prerequisite (How `0xVAU1` and `/vault-1` Exist)

### Prereq Deployment Diagram

### Creator Vault Creation Diagram

### Authority and Trust Notes (Woven Into This Setup)

## Rebalance (How Yield Strategy Updates Over Time)

### Rebalance Diagram

### Best-Effort Hourly Semantics

## Spike Status In This Design

## Appendix A: Alternatives Not Taken

### A.1 APY Source: Off-Chain YDS vs On-Chain Oracle

### A.2 Redemption Semantics: Sync Redeem vs `requestRedeem`

### A.3 Rebalance Overlap: Single-Flight vs Overlap

### A.4 Liquidity Policy: Tiered vs Fixed vs Percent-Only

## Appendix B: Product TODOs
