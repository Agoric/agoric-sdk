# Worked Example

## Scenario
- Owner wants to create and fund a delegated portfolio in one flow.
- Initial target allocation is 60% `Aave_Base`, 40% `Compound_Base`.
- Delegate agent address is `agoric1agentdemoabcdefghijklmnopqrstuvwxyz`.
- Agent display name is `Demo Agent`.
- Delegation policy includes `concentrationCapPercent=45`, `moveSizeLimitUsd=25000`, and `permissions=change-allocations,claim-rewards`.

## Step 1: Build the Deep Link

```text
https://codex-ago-611-agent-grants-d.ymax0-ui.pages.dev/deposit-funds?Aave_Base=60&Compound_Base=40&accountHolder=agoric1agentdemoabcdefghijklmnopqrstuvwxyz&agentName=Demo%20Agent&concentrationCapPercent=45&moveSizeLimitUsd=25000&permissions=change-allocations,claim-rewards
```

The operator opens that URL in the YMax UI and completes the deposit flow.

## Step 2: Capture the Created Portfolio

After deposit completion, record the resulting portfolio id, for example `95`.

The agent now has delegated permissions from the same flow, so no separate delegation transaction is needed for this primary path.

## Step 3: Agent Queries Inputs and Chooses Candidate
Agent queries current portfolio and APY inputs from concrete endpoints:
- Portfolio state:
  - `https://dev0.ymax.app/portfolios/portfolio95`
- Instrument APY snapshots:
  - `https://dev0.ymax.app/instruments/Aave_Arbitrum`
  - `https://dev0.ymax.app/instruments/Beefy_morphoSmokehouseUsdc_Ethereum`
- API surface (for endpoint discovery/confirmation):
  - `https://dev0.ymax.app/openapi.json`

Example APY snapshot at `2026-03-04T21:00:00Z`:
- `Aave_Base totalApy = 3.10%`
- `Compound_Base totalApy = 4.05%`

Current allocation expected 30-day yield:
- `10,000 * ((0.60 * 0.0310) + (0.40 * 0.0405)) * (30 / 365) = 28.56 USDC`

Candidate allocation considered:
- `{ "Aave_Base": "55", "Compound_Base": "45" }`

Candidate expected 30-day yield:
- `10,000 * ((0.55 * 0.0310) + (0.45 * 0.0405)) * (30 / 365) = 29.20 USDC`

Decision delta:
- `29.20 - 28.56 = +0.64 USDC` expected over 30 days.

This candidate also respects the example `concentrationCapPercent=45`, so the agent can consider it valid if it exceeds the current policy threshold.

## Step 4: Agent Submits SetTargetAllocation

```sh
./packages/portfolio-contract/tools/submit-evm-allocation.ts \
  --allocations-file ./allocations-portfolio95.json
```

`allocations-portfolio95.json` contains only currently allowed instruments and stays within any delegated policy limits.

## Step 5: Near-Term Verification of Reallocation Start
Poll about every minute for initial convergence checks:

```sh
curl -sS "https://dev0.ymax.app/portfolios/portfolio95" | jq .
```

Check:
- operation accepted
- target allocation updated
- reallocation/flow state progressing without terminal error

Example checkpoints:
- `T+1m`: operation accepted and target allocation reflects `Aave_Base=55`, `Compound_Base=45`.
- `T+5m`: flow steps show reallocation in progress.
- `T+15m`: no terminal errors in portfolio flow/operation status.

## Step 6: Ongoing Observation Window
For the next 30 days:
- Poll portfolio status a few times per day (for example every 8 hours).
- Record realized performance and any deviations from expected behavior.
- Re-run allocation decision loop only when policy thresholds are met.

Example sampling schedule:
- `00:00 UTC`, `08:00 UTC`, `16:00 UTC` daily.
- Record: current allocation, portfolio value, realized daily yield estimate, active errors.

## Escalation Conditions
Escalate immediately if:
- authorization/delegation failures recur
- granted permissions are insufficient for the attempted operation
- backend operation-type mismatch occurs
- no convergence after bounded verification window
- data inputs for yield comparison are stale or unavailable
