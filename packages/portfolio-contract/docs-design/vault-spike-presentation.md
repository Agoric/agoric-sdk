---
marp: true
paginate: true
title: Ymax Vaults Spike
---

<style>
section {
  font-size: 20pt;
}
</style>

# Ymax Vaults Spike

Audience: Product + Engineering + Peers  
Scope: story clarity, approach decisions, prototype implementation, smoke evidence

---

# What's The Problem?

- We need to estimate cost/risk of adding creator vaults to Ymax.
- Product expectation: market-norm [ERC-4626](https://eips.ethereum.org/EIPS/eip-4626) UX for deposit/redeem.
- Core challenge: Ymax yield engine is cross-chain, but user vault UX is EVM-local.
- We need enough implementation to prove feasibility, not a full production launch.

---

# Tada! Vault Deposit On-Chain Smoke Test

- We got a real **vault deposit flow running end-to-end on a local chain**.
- Evidence: [Vault Smoke Evidence Gist](https://gist.github.com/dckc/94b7ff46a126e81b1786a84971c4a6f6) with signed calls, event tuples, and one-line accounting assertions.
- Implemented EVM vault + factory contracts with tests.
- Designed concrete flows (create, deposit, rebalance, withdraw, prereq deploy).
- Clarified story + assumptions + explicit TODO/risk plan.
- Key: `🧪` tested, `🧭` plan-only, `🚀` stretch, `🏭` product TODO

---

# Story + Scope Decisions

- Single-vault story for spike
  - 🏭 product can support one per creator/strategy.
- LP/share model explicitly [ERC-4626](https://eips.ethereum.org/EIPS/eip-4626).
- 🧭 End-user UI in scope ; creator UI stretch. 🚀
- 🧭 Rebalance is best-effort hourly.
- 🧭 Creator fee modeled as yield cut (performance fee).

---

# Challenge: APY Source + Decentralization 🏭

- APY source has decentralization concerns, but mostly orthogonal to spike feasibility.
- Decision for spike 🧭:
  - planner consumes YDS HTTP APY per instrument
  - contract boundary remains plan-only (no APY payload on-chain)
- Outcome:
  - kept spike focused on vault mechanics
  - left production TODO 🏭 for APY/decentralization trust hardening
  - on-chain oracle-backed APY source ❌ rejected for this spike

---

# Challenge: Cross-Chain Accounting 🏭

- 🧪 Vault token/share accounting is on one EVM chain.
- 🧭 Yield opportunities are cross-chain in Ymax.
- 🧪 Required a bridge between local vault liquidity and deployed cross-chain funds.

Working model 🧪:
- use privileged extension + managed-assets reporting path:
  - `reporter -> factory -> vault`
  - `totalAssets = localVaultBalance + managedAssets`

---

# Challenge: Rebalance Cadence vs Latency 🏭

- Plan execution, while normally 5-20min, can be longer than an hour.
- Hourly tick can overlap in-flight execution.

Spike Decision 🧭:
- single-flight lock
- coalesce pending ticks (at most one rerun)
- stale-plan/runtime guardrails

---

# Challenge: Redemption Semantics 🏭

- Need market-norm UX, but cross-chain liquidity may not be locally available.

Decision 🧪:
- spike default: sync redeem
- enforce liquidity + freshness checks
- `requestRedeem` kept as stretch goal 🚀, not implemented in spike

---

# Flow: EVM Prereq Deployment

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'background': '#f3f4f6', 'primaryColor': '#eef2f7', 'secondaryColor': '#e9eef5', 'tertiaryColor': '#f6f8fb', 'lineColor': '#5f6b7a', 'textColor': '#1f2937'}, 'themeCSS': '.sequenceNumber { font-size: 14px !important; font-weight: 600; }'}}%%
sequenceDiagram
    title EVM Prerequisite Flow - VaultFactory Deployment
    autonumber

    actor ops as Deployer
    participant wallet as EVM Wallet<br/>EOA: 0xOPS1
    participant chain as Avalanche C-Chain
    participant factory as VaultFactory<br/>addr: 0xFAC1
    participant ymax as Ymax config

    Note right of ops: Use deterministic deployment pattern from `agoric-to-axelar-local`<br/>for consistent addresses across chains.
    Note right of wallet: Spike key posture (testnet): do not commit private keys.
    ops->>wallet: deployVaultFactory(0xUSDC, 0xASSET_REPORTER)
    wallet-->>chain: create(VaultFactory bytecode, constructorArgs)
    chain-->>factory: constructor(0xUSDC, 0xASSET_REPORTER)
    chain-->>wallet: receipt(contractAddress=0xFAC1)
    wallet-->>ops: deploymentConfirmed(0xFAC1)
    ops->>ymax: setFactoryAddress(0xFAC1)
```

---

# Flow: Creator Vault Creation

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'background': '#f3f4f6', 'primaryColor': '#eef2f7', 'secondaryColor': '#e9eef5', 'tertiaryColor': '#f6f8fb', 'lineColor': '#5f6b7a', 'textColor': '#1f2937'}, 'themeCSS': '.sequenceNumber { font-size: 14px !important; font-weight: 600; }'}}%%
sequenceDiagram
    title Ymax Vault - Creator Vault Creation Flow
    autonumber

    actor creator as Chris<br/>EOA: 0xCHR1
    participant ui as vault-ui-1<br/>URL: /vaults/1

    box Agoric
    participant yc as Ymax contract<br/>instance: 0xYMAX
    participant vstorage as vstorage<br/>node: 0xVST1
    end
    participant planner as Planner service<br/>svc: 0xPLN1

    box EVM Chain
    participant factory as VaultFactory<br/>addr: 0xFAC1
    participant vault as vault-contract-1<br/>ERC-4626: 0xVAU1
    end

    creator->>ui: createVault({ allocations: [Aave_Base: 60%, Morpho_Base: 40%],<br/>fee: 0.5bps, cadence: P1H })
    ui-->>yc: createVault(...)
    yc-->>yc: p75 = openPortfolio()
    yc-->>yc: vaults.add(p75)
    yc-->>yc: 0xVAU1 = computeCreate2Address(factory=0xFAC1, salt=p75)
    yc-->>vstorage: setValue(p75.policy, { vault: 0xVAU1,<br/>allocations: [Aave_Base: 60%, Morpho_Base: 40%],<br/>fee: 0.5bps, cadence: P1H })
    yc-->>ui: vaultSpecAccepted(p75)
    yc-->>factory: createVault(0xUSDC, Chris Vault Share, CVSH, p75)
    Note right of yc: via Axelar GMP
    factory-->>vault: initialize(0xUSDC, Chris Vault Share, CVSH)
    Note left of factory: emit VaultCreated(0xVAU1, 0xCHR1, p75)<br/>resolver reports success
    factory-->>yc: ack

    yc-->>vstorage: setValue(p75.status, ready)
    vstorage-->>planner: observeValue(p75.policy, p75.status)
    yc-->>ui: vaultReady(0xVAU1, p75, /vaults/1)
    ui-->>creator: showVault(0xVAU1, /vaults/1)
```

---

# Flow: Deposit

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'background': '#f3f4f6', 'primaryColor': '#eef2f7', 'secondaryColor': '#e9eef5', 'tertiaryColor': '#f6f8fb', 'lineColor': '#5f6b7a', 'textColor': '#1f2937'}, 'themeCSS': '.sequenceNumber { font-size: 14px !important; font-weight: 600; }'}}%%
sequenceDiagram
    title Ymax Vault - Deposit Flow (USDC -> ERC-4626 Shares)
    autonumber

    actor user as Trader Tim<br/>EOA: 0xTIM
    participant wallet as MetaMask<br/>signer: 0xTIM
    participant ui as vault-ui-1<br/>URL: /vaults/1

    box Avalanche C-Chain
    participant vault as vault-contract-1<br/>ERC-4626: 0xVAU1
    participant usdc as USDC Token<br/>ERC-20: 0xUSDC
    participant p75 as p75 @Avalanche<br/>smart wallet: 0xP751
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
    vault-->>usdc: transfer(0xP751, excessUSDC)
    Note over usdc,p75: emit Transfer(0xVAU1,<br/>0xP751, excessUSDC)
    vault-->>vault: managedAssets += excessUSDC
    vault-->>ui: emit Deposit(0xTIM, 0xTIM, 250USDC, 250CVSH)
    loop polling interval
        ui->>ui: pollTick()
        ui-->>vault: balanceOf(0xTIM)
        vault-->>ui: balance=250CVSH
    end
    ui-->>user: balance=250CVSH
```

---

# Flow: Rebalance

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'background': '#f3f4f6', 'primaryColor': '#eef2f7', 'secondaryColor': '#e9eef5', 'tertiaryColor': '#f6f8fb', 'lineColor': '#5f6b7a', 'textColor': '#1f2937'}, 'themeCSS': '.sequenceNumber { font-size: 14px !important; font-weight: 600; }'}}%%
sequenceDiagram
    title Ymax Vault - Hourly Best-Effort Rebalance Flow
    autonumber

    box Agoric
    participant yc as Ymax contract<br/>instance: 0xYMAX
    participant timer as chainTimerService<br/>clock: 0xTMR1
    end

    participant planner as Planner service<br/>svc: 0xPLN1

    box EVM Chain
    participant aave as Aave_Base<br/>pool: 0xAAV1
    participant morpho as Morpho_Base<br/>market: 0xMOR1
    end

    timer->>yc: repeatAfter tick (1h cadence)
    yc-->>yc: single-flight guard
    alt no rebalance in flight
        yc-->>planner: request latest allocation plan(policyVersion)
        planner-->>planner: queryBalancesAndApyInputs(p75, policyVersion)
        planner-->>yc: plan
        yc-->>yc: executeRebalancePlan(p75, plan)
        rect rgba(226, 232, 240, 0.6)
        Note over yc,aave: orchestration magic happens here<br/>multi-step execution across Aave_Base / Morpho_Base<br/>resolver reports success/failure only
        end
        yc-->>yc: rebalanceComplete(status)
        yc-->>yc: clear in-flight + pending flags
    else rebalance already in flight
        yc-->>yc: coalesce tick (keep at most one pending rerun)
    end
```

---

# Flow: Withdraw

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'background': '#f3f4f6', 'primaryColor': '#eef2f7', 'secondaryColor': '#e9eef5', 'tertiaryColor': '#f6f8fb', 'lineColor': '#5f6b7a', 'textColor': '#1f2937'}, 'themeCSS': '.sequenceNumber { font-size: 14px !important; font-weight: 600; }'}}%%
sequenceDiagram
    title Ymax Vault - Withdraw Flow (ERC-4626 Shares -> USDC)
    autonumber

    actor user as Trader Tim<br/>EOA: 0xTIM
    participant ui as vault-ui-1<br/>URL: /vaults/1

    box EVM Chain
    participant vault as vault-contract-1<br/>ERC-4626: 0xVAU1
    participant usdc as USDC Token<br/>ERC-20: 0xUSDC
    end

    Note over user,ui: Signing wallet (MetaMask) omitted in this diagram.
    user->>ui: redeem(250CVSH)
    ui-->>vault: redeem(250CVSH, 0xTIM, 0xTIM)
    vault-->>vault: realizeUSDCForRedeem(250CVSH, currentAllocation)
    vault-->>usdc: transfer(0xTIM, 250USDC)
    vault-->>ui: emit Withdraw(0xTIM, 0xTIM, 0xTIM, 250USDC, 250CVSH)
    usdc-->>ui: emit Transfer(0xVAU1, 0xTIM, 250USDC)
    ui-->>vault: balanceOf(0xTIM)
    vault-->>ui: balance=0CVSH
    ui-->>user: balances(usdc=+250USDC, cvsh=0CVSH)
```

---

# Implementation Artifacts

- 🧪 `agoric-to-axelar-local` PR:  
  [spike: add Ymax vault/factory contracts and local deposit smoke evidence (PR #71)](https://github.com/agoric-labs/agoric-to-axelar-local/pull/71)
- 🧭 `agoric-sdk` PR:  
  [spike(portfolio-contract): vault flow design + creatorFacet createVault (PR #12513)](https://github.com/Agoric/agoric-sdk/pull/12513)
- 🧭 `ymax0-ui0` PR:  
  [spike(ui): add creatorFacet createVault action in admin UI (PR #27)](https://github.com/agoric-labs/ymax0-ui0/pull/27)

---

# Evidence: User Intent 🧪

- Aliases: `TIM=0x7099…79C8` `VAU1=0xCafa…052c` `P75A=0x90F7…b906`
- Tim signed:
  - `approve(spender=VAU1, amount=1000000)`
  - `deposit(assets=1000000, receiver=TIM)`
- Vault emitted:
  - `Deposit(caller=TIM, owner=TIM, assets=1000000, shares=1000000)`

---

# Evidence: Funds Movement 🧪

- USDC `Transfer` events in same deposit receipt:
  - `Transfer(from=TIM, to=VAU1, value=1000000)` (Tim -> vault1)
  - `Transfer(from=VAU1, to=P75A, value=800000)` (vault1 -> `@Avalanche`)
- Evidence bundle:
  - [Vault Smoke Evidence Gist](https://gist.github.com/dckc/94b7ff46a126e81b1786a84971c4a6f6)

---

# Open Risks / Product TODOs 🏭

- Reporter trust hardening and key custody model.
- Slippage protections (`minSharesOut` / `minAssetsOut`).
- Final permission model for `createVault`.
- Liquidity shortfall / redeem DoS mitigation.
- Production permit2 migration and replenishment logic.

---
