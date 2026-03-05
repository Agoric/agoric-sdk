# Worked Example

## Scenario
- Owner has already opened and funded portfolio `95`.
- Current target allocation is:
  - `{ "Aave_Arbitrum": "100", "Aave_Avalanche": "0", "Aave_Base": "0", ..., "Beefy_morphoSmokehouseUsdc_Ethereum": "0" }`
  - Omitted instruments are present with `0` portion.
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
  - `https://dev0.ymax.app/portfolios/portfolio95`
- Instrument APY snapshots:
  - `https://dev0.ymax.app/instruments/Aave_Arbitrum`
  - `https://dev0.ymax.app/instruments/Beefy_morphoSmokehouseUsdc_Ethereum`
- API surface (for endpoint discovery/confirmation):
  - `https://dev0.ymax.app/openapi.json`

Example APY snapshot at `2026-03-04T21:00:00Z`:
- `Aave_Arbitrum totalApy = 1.68%`
- `Beefy_morphoSmokehouseUsdc_Ethereum totalApy = 4.37%`

Current allocation expected 30-day yield:
- `10,000 * 0.0168 * (30 / 365) = 13.81 USDC`

Candidate allocation considered:
- `{ "Aave_Arbitrum": "0", "Aave_Avalanche": "0", "Aave_Base": "0", ..., "Beefy_morphoSmokehouseUsdc_Ethereum": "100" }`
- Omitted instruments are present with `0` portion.

Candidate expected 30-day yield:
- `10,000 * 0.0437 * (30 / 365) = 35.92 USDC`

Decision delta:
- `35.92 - 13.81 = +22.11 USDC` expected over 30 days.

This exceeds the example policy threshold, so agent submits the candidate.

## Step 4: Agent Submits SetTargetAllocation

```sh
./packages/portfolio-contract/tools/submit-evm-allocation.ts \
  --allocations-file ./allocations-portfolio95.json
```

`allocations-portfolio95.json` contains the full supported instrument set with one instrument at `100` and all others at `0`.

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
- `T+1m`: operation accepted and target allocation reflects `Beefy_morphoSmokehouseUsdc_Ethereum=100`, others `0`.
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
