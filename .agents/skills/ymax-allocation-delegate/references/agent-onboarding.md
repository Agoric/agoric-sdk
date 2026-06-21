# Agent Onboarding and Authorization

## Purpose
Create or access a delegated portfolio and complete owner authorization before any autonomous allocation updates.

## Inputs
- `YMAX_UI_BASE` such as `https://codex-ago-611-agent-grants-d.ymax0-ui.pages.dev`
- `YDS_BASE` such as `https://dev0.ymax.app`
- delegate Agoric address for `accountHolder`
- agent display name for `agentName`
- desired initial allocation percentages
- delegation policy knobs such as `concentrationCapPercent`, `moveSizeLimitUsd`, and `permissions`

## Primary Path: UI Deep Link
Preferred onboarding is a YMax UI deep link that creates the portfolio and delegates the agent in the same step.

Example:

```text
https://codex-ago-611-agent-grants-d.ymax0-ui.pages.dev/deposit-funds?Aave_Base=60&Compound_Base=40&accountHolder=agoric1agentdemoabcdefghijklmnopqrstuvwxyz&agentName=Demo%20Agent&concentrationCapPercent=45&moveSizeLimitUsd=25000&permissions=change-allocations,claim-rewards
```

Important query params:
- allocation params such as `Aave_Base=60` and `Compound_Base=40`
- `accountHolder`: delegate Agoric address
- `agentName`: display label for the delegated agent
- `concentrationCapPercent`: max concentration policy
- `moveSizeLimitUsd`: per-move cap
- `permissions`: comma-separated granted permissions such as `change-allocations,claim-rewards`

Use your dev base URL for testing and vary the query params as needed.

## Step 1: Complete Deposit + Delegation
Open the generated URL and complete the deposit flow. This should create the portfolio and delegate the agent in the same session.

## Step 2: Capture Portfolio Identity
Record the resulting portfolio id from the UI or from YDS after creation.

## Step 3: Confirm Delegation
Run a minimal `SetTargetAllocation` probe using only currently allowed instruments, or verify in YDS/UI that the delegated agent controls are enabled.
- If authorization fails, do not continue autonomous operation.
- Escalate with portfolio id, delegate address, source URL, and full error payload.

## Legacy Fallback
If the UI deep link is unavailable, the older CLI-based setup and delegation flow may still be usable via `submit-evm-allocation.ts --setup` followed by `delegate-evm-allocation.ts`. Prefer the UI path for current testing because it combines portfolio creation and delegation.

## Notes
- Delegate authority is portfolio-specific.
- The deep link is environment-specific; keep the base URL configurable.
