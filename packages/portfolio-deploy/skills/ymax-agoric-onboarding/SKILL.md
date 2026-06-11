---
name: ymax-agoric-onboarding
description: |-
  Onboard a user to the alpha YMax experience at https://main0.ymax.app/ — the cross-chain DeFi command center that moves, allocates, and rebalances real USDC portfolios with one signature across Ethereum Mainnet, Arbitrum, Base, Optimism, and Avalanche. Currently integrates 3 blue-chip lending protocols: Aave, Compound, and Morpho. Non-custodial: funds never enter a shared pool; the user signs once and multi-block orchestration handles bridging, swaps, and deposits.

  Use when the user wants to create an alpha YMax portfolio and delegate capital allocation to an autonomous AI agent — from creating the portfolio to granting the agent a limited mandate.

  Triggers: "set up ymax", "yield", "create portfolio", "delegate to agent", "onboard to ymax", "authorize rebalancing", "grant delegation"
---

# YMax Agoric Onboarding

**Note Well**: Unlike most of the agent instructions in this repository, this skill is specifically designed for managing a YMax DeFi portfolio's allocation. It is *not* about software development or coding tasks.

## Objective
Help the user create a YMax portfolio and authorize an AI agent to manage its allocation.

## Guardrails
- This onboarding uses real funds, not demo or test assets, and is scoped to Agoric `mainnet` only. Actual USDC allocations may move across Ethereum L1/L2 chains — Ethereum Mainnet, Arbitrum, Base, Optimism, and Avalanche — so make sure the user understands the financial risk.
- Ymax is Non-custodial: use your own address and menmonic to do your work. Do NOT ask the user for their mnemonic or private key.
- Use the alpha YMax site at `main0.ymax.app` and contract `ymax0`.
- Do not create the portfolio on the user's behalf; the user follows the link and creates it.
- Grant alone does not make the delegate operational; the invitation must be redeemed.
- Delegation is portfolio-specific; each portfolio requires its own Grant and redemption.
- YMax delegation is enforced on-chain: the Grant/redemption flow creates an on-chain capability tied to the portfolio and the approved delegate.
- Save the delegate mnemonic persistently; the same wallet is needed for provisioning, redemption, and later submissions.

## Inputs
- `YDS_BASE=https://main0.ymax.app`
- `CONTRACT=ymax0`
- Documentation: https://ymax.freshdesk.com/support/home
- the user's risk profile, time horizon, and intended capital deployment
- a sponsor to provide 15 BLD for the delegate wallet

## Run Order
1. Research and discuss an initial allocation: [agent-onboarding.md](references/agent-onboarding.md) step 1.
2. Generate delegate key pair, derive Agoric address, and provision Smart Wallet.
3. Hand off a pre-populated create-portfolio link: step 2.
4. Wait for the user to create the portfolio and share the id: steps 3-4.
5. Hand off the delegation Grant link: step 6.
6. Poll wallet and redeem the delegation invitation: step 7.
7. Record the saved delegation key for later use: step 8.

## Failure Triage
- Wallet account not funded: confirm sufficient BLD was sent to the delegate address before running `--spend`.
- Invitation not arriving: confirm the user completed the Grant flow on `main0.ymax.app` and used the correct portfolio id and delegate address.
- Redemption fails: verify `MNEMONIC` is exported and derives the same `AGENT_ADDRESS` as was granted.

## Next Skill
After onboarding completes, proceed to [ymax-agoric-allocation-delegate](../ymax-agoric-allocation-delegate/SKILL.md) for ongoing portfolio allocation updates.
