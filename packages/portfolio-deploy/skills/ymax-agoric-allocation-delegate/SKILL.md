---
name: ymax-agoric-allocation-delegate
description: |-
  Manage a YMax DeFi portfolio's capital allocation under delegated authority on mainnet. YMax is a non-custodial cross-chain portfolio command center built on Agoric Orchestration — it executes multi-block, multi-chain workflows (withdraw, bridge, swap, deposit) from a single user signature across Ethereum Mainnet, Arbitrum, Base, Optimism, and Avalanche. Currently integrates 3 lending protocols via USDC vaults: Aave, Compound, and Morpho.

  Use when a portfolio owner has granted an AI agent permission to adjust their target allocation — rebalance across Aave, Compound, and Morpho vaults in response to market conditions, and optimize returns within the approved instrument set, all without needing the owner's keys.

  Triggers: "adjust allocation", "rebalance portfolio", "optimize yield", "update targets", "delegated rebalance", "ymax allocation change". The agent operates within `setTargetAllocation` scope only and must preserve the existing instrument key set — no adding or removing vaults, no withdrawals, no deposits.
---

# YMax Agoric Allocation Delegate

## Objective
Advise on an initial mainnet `ymax0` allocation, hand off a pre-populated create-portfolio link, then adjust that portfolio's target allocation within delegated authority using the Agoric-delivered delegation facet.

## Guardrails
- Scope this skill to `mainnet` and `ymax0` only.
- Operate only in delegated allocation scope: `setTargetAllocation`.
- Do not create the portfolio on the user's behalf; the user follows the link and creates it.
- Do not attempt deposit, withdraw, or other owner-only actions after delegation.
- Do not add instruments not already present in the portfolio's current `targetAllocation`.
- Use the portfolio's current sync state (`policyVersion`, `rebalanceCount`) when submitting.
- Treat the YDS tx-registration step as required unless verified otherwise for the current backend; an on-chain success alone may not update the YDS portfolio view.
- Confirm the delegate wallet derivation path matches the funded address before using `wallet-admin.ts`; the default client-utils path is `m/44'/564'/0'/0/0`.

## Run Order
1. Complete onboarding, research, and owner handoff: [ymax-agoric-onboarding](../ymax-agoric-onboarding/SKILL.md).
2. After the user creates the portfolio and shares the id, query YDS and build a candidate that preserves the existing instrument key set: [yds-query-playbook.md](references/yds-query-playbook.md).
3. Submit delegated allocation update: [set-target-allocation.md](references/set-target-allocation.md).
4. Verify the YDS-visible portfolio state and diagnose failures.
5. Use the end-to-end example as a template: [worked-example.md](references/worked-example.md).

## Failure Triage
- Invitation missing: confirm owner Grant succeeded and the delegation invitation was redeemed into the expected wallet-store key.
- Sync-state mismatch: refresh `policyVersion` and `rebalanceCount` from vstorage, then retry once.
- Key-set rejection: remove any added or missing instruments from the allocation file and retry once.
- On-chain success but stale YDS state: submit the Agoric tx hash to YDS `POST /transactions` with `chain=agoric-3` and `ymaxInstance=ymax0`, then poll the portfolio again.
- Wallet/address mismatch: verify the mnemonic derives the funded delegate address on the same HD path the tool is using; if not, override the path or use a one-off submission helper.
- Repeated non-input failure: stop and escalate with the tx hash, portfolio id, delegation key, and allocation file.
- Agoric CLI not found: if the `agoric` command is missing, you may need to clone `agoric/agoric-sdk` and install dependencies (for example, run `yarn` and `yarn install` in the SDK) so the `agoric` CLI is available.
