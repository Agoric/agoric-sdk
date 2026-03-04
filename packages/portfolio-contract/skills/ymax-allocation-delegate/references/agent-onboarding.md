# Agent Onboarding and Authorization

## Purpose
Prepare delegate-agent local config, produce the delegate address, and complete owner authorization before any autonomous allocation updates.

## Inputs
- `YDS_BASE` such as `https://dev0.ymax.app`
- `PORTFOLIO_ID` numeric id
- target environment (`AGORIC_NET`, e.g. `devnet`)

## Step 1: Run Setup Once

```sh
./packages/portfolio-contract/tools/submit-evm-allocation.ts \
  --setup \
  --yds "$YDS_BASE" \
  --chain-id 421614 \
  --portfolio "$PORTFOLIO_ID" \
  --ymax-version ymax0
```

Setup initializes local config and key material used for delegated `SetTargetAllocation` submissions.

## Step 2: Capture Delegate Address
Capture the agent address printed by setup output. This exact address is the delegation target.

## Step 3: Request Owner Delegation
The owner/operator (not the delegate agent) must authorize that address for the portfolio:

```sh
TRADER_KEY='owner mnemonic' \
EMS_KEY='agoric submit mnemonic' \
AGORIC_NET=devnet \
./packages/portfolio-contract/tools/delegate-evm-allocation.ts \
  --portfolio "$PORTFOLIO_ID" \
  --address "$AGENT_ADDRESS" \
  --chain-id 421614 \
  --contract ymax0
```

## Step 4: Confirm Delegation
Run a minimal `SetTargetAllocation` probe using only currently allowed instruments.
- If authorization fails, do not continue autonomous operation.
- Escalate with portfolio id, agent address, and full error payload.

## Notes
- Setup alone does not grant on-chain authority.
- Delegate authority is portfolio-specific.
