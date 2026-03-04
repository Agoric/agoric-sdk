# Worked Example

## Scenario
- Owner has already opened and funded portfolio `95`.
- Current target allocation is:
  - `{ "Aave_Arbitrum": "50", "Beefy_morphoSmokehouseUsdc_Ethereum": "50" }`
- Portfolio funding amount: `10,000 USDC`.
- Delegate agent will optimize for expected 30-day yield.

## Step 1: Agent Setup for Portfolio 95
Agent runs setup once:

```sh
./packages/portfolio-contract/tools/submit-evm-allocation.ts \
  --setup \
  --yds https://dev0.ymax.app \
  --chain-id 421614 \
  --portfolio 95 \
  --ymax-version ymax0
```

Setup outputs agent address, for example `0xSDFDSF...`.

## Step 2: Agent Requests Delegation
Agent asks owner/operator:
- Delegate allocation control for portfolio `95` to `0xSDFDSF...`.

Owner performs delegation:

```sh
TRADER_KEY='owner mnemonic' \
EMS_KEY='agoric submit mnemonic' \
AGORIC_NET=devnet \
./packages/portfolio-contract/tools/delegate-evm-allocation.ts \
  --portfolio 95 \
  --address 0xSDFDSF... \
  --chain-id 421614 \
  --contract ymax0
```

## Step 3: Agent Queries Inputs and Chooses Candidate
Agent queries current portfolio and APY inputs from concrete endpoints:
- Portfolio state:
  - `https://dev0.ymax.app/portfolios/95`
- Instrument APY snapshots:
  - `https://dev0.ymax.app/instruments/Aave_Arbitrum`
  - `https://dev0.ymax.app/instruments/Beefy_morphoSmokehouseUsdc_Ethereum`
- API surface (for endpoint discovery/confirmation):
  - `https://dev0.ymax.app/openapi.json`

Example APY snapshot at `2026-03-04T21:00:00Z`:
- `Aave_Arbitrum totalApy = 1.68%`
- `Beefy_morphoSmokehouseUsdc_Ethereum totalApy = 4.37%`

Current allocation expected 30-day yield:
- `10,000 * (0.50 * 0.0168 + 0.50 * 0.0437) * (30 / 365) = 24.86 USDC`

Candidate allocation considered:
- `{ "Aave_Arbitrum": "30", "Beefy_morphoSmokehouseUsdc_Ethereum": "70" }`

Candidate expected 30-day yield:
- `10,000 * (0.30 * 0.0168 + 0.70 * 0.0437) * (30 / 365) = 28.17 USDC`

Decision delta:
- `28.17 - 24.86 = +3.31 USDC` expected over 30 days.

This exceeds the example policy threshold, so agent submits the candidate.

## Step 4: Agent Submits SetTargetAllocation

```sh
./packages/portfolio-contract/tools/submit-evm-allocation.ts \
  --allocations '[{"instrument":"Aave_Arbitrum","portion":"30"},{"instrument":"Beefy_morphoSmokehouseUsdc_Ethereum","portion":"70"}]'
```

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
- `T+1m`: operation accepted and target allocation reflects `35/65`.
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
- backend operation-type mismatch occurs
- no convergence after bounded verification window
- data inputs for yield comparison are stale or unavailable
