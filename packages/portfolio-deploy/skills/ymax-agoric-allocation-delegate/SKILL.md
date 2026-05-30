---
name: ymax-agoric-allocation-delegate
description: Operate a YMax portfolio as a delegated Agoric allocation agent on mainnet `ymax0`. Use when the operator needs to discuss allocations with a user, hand off a pre-populated YDS create-portfolio link, receive the created portfolio id, redeem the delegation invitation, and submit delegated setTargetAllocation updates.
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

## Run Order
1. Complete onboarding, research, and owner handoff: [agent-onboarding.md](references/agent-onboarding.md).
2. After the user creates the portfolio and shares the id, query YDS and build a candidate that preserves the existing instrument key set: [yds-query-playbook.md](references/yds-query-playbook.md).
3. Submit delegated allocation update: [set-target-allocation.md](references/set-target-allocation.md).
4. Verify the YDS-visible portfolio state and diagnose failures.
5. Use the end-to-end example as a template: [worked-example.md](references/worked-example.md).

## Failure Triage
- Invitation missing: confirm owner Grant succeeded and the delegation invitation was redeemed into the expected wallet-store key.
- Sync-state mismatch: refresh `policyVersion` and `rebalanceCount` from vstorage, then retry once.
- Key-set rejection: remove any added or missing instruments from the allocation file and retry once.
- Repeated non-input failure: stop and escalate with the tx hash, portfolio id, delegation key, and allocation file.
