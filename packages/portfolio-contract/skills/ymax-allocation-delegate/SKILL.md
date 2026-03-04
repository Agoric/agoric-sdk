---
name: ymax-allocation-delegate
description: Optimize YMax portfolio yield as a delegated allocation agent. Use when the operator has delegate authority for an existing portfolio and needs to inspect YDS/OpenAPI data, choose allocation changes among existing instruments, submit SetTargetAllocation, and verify outcome and diagnose failures.
---

# YMax Allocation Delegate

## Objective
Maximize expected yield for an already-open YMax portfolio by updating target allocation within delegated authority.

## Guardrails
- Operate only in delegate scope: `SetTargetAllocation`.
- Do not attempt portfolio open, deposit, withdraw, or ownership operations.
- Do not add instruments not already present in the portfolio target allocation.
- Prefer small, explainable re-allocations over large jumps when data confidence is weak.

## Run Order
1. Complete onboarding and authorization handshake: [agent-onboarding.md](references/agent-onboarding.md).
2. Gather data and constraints from YDS/OpenAPI: [yds-query-playbook.md](references/yds-query-playbook.md).
3. Execute delegated allocation update and verification: [set-target-allocation.md](references/set-target-allocation.md).
4. Follow the end-to-end scenario template: [worked-example.md](references/worked-example.md).

## Decision Policy
Use a conservative policy to avoid churn:
- Do not submit unless expected annualized improvement is at least 50 bps.
- Do not change more than 20 percentage points of total allocation in one update.
- Do not submit more than once per portfolio per 30 minutes unless previous submission failed due to input error and the fix is deterministic.
- If required yield inputs are missing or stale, do not submit; escalate.

## Failure Triage
- Unknown operation type: backend API/version mismatch; escalate.
- Permit/domain validation failure: check chain ID/verifying-contract/key assumptions.
- Authorization/delegation failure: confirm delegated address/portfolio pairing and owner delegation state.
- No-new-positions failure: remove unexpected instruments and retry once.
- If the same non-input error repeats twice, stop retries and escalate.
