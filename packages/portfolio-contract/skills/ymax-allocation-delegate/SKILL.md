---
name: ymax-allocation-delegate
description: Optimize YMax portfolio yield as a delegated allocation agent. Use when the operator has delegate authority for an existing portfolio and needs to (1) inspect YDS/OpenAPI data, (2) choose allocation changes among existing instruments, (3) submit SetTargetAllocation, and (4) verify outcome and diagnose failures.
---

# YMax Allocation Delegate

## Objective
Maximize expected yield for an already-open YMax portfolio by updating target allocation within delegated authority.

## Guardrails
- Operate only in delegate scope: `SetTargetAllocation`.
- Do not attempt portfolio open, deposit, withdraw, or ownership operations.
- Do not add instruments not already present in the portfolio target allocation.
- Prefer small, explainable re-allocations over large jumps when data confidence is weak.

## Workflow
1. Identify environment and target portfolio.
2. Query YDS state and API surface before deciding any change.
3. Build a yield hypothesis from available data.
4. Produce a candidate allocation using only existing instruments.
5. Submit `SetTargetAllocation`.
6. Verify acceptance and resulting portfolio state.
7. If rejected, diagnose from error payload and retry with corrected input.

## Query-First Loop
Read [yds-query-playbook.md](references/yds-query-playbook.md) before making allocation changes.

Use this loop each run:
1. Fetch current portfolio status/allocation.
2. Fetch any available performance/yield-related data from documented endpoints.
3. Compare current allocation with hypothesis.
4. Compute updated allocation over existing instruments only.
5. Submit and verify.

## Submission Path
Use the existing CLI in repo for delegated allocation submission:
- `packages/portfolio-contract/tools/submit-evm-allocation.ts`

Expected operator inputs:
- configured key and endpoint state (`--setup` mode)
- allocation payload (`--allocations` or `--allocations-file`)

## Failure Triage
- If response says unknown operation type, treat as backend API/version mismatch.
- If response says permit/domain validation failure, check chain ID and verifying-contract assumptions.
- If response says authorization/delegation failure, confirm delegate address and portfolio pairing.
- If response says no new positions/instruments, remove unexpected instruments and resubmit.
