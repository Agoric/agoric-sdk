# Worked Example

## Scenario
- A user wants to deploy USDC into a `mainnet` `ymax0` portfolio with a moderate risk profile, but does not want to keep re-checking yield conditions manually.
- The agent's role is to act as a standing allocator: it helps choose the initial allocation, then reviews market conditions from time to time and makes updates inside a narrow delegated authority boundary.
- The user still controls portfolio creation and delegation. The agent only operates within the approved instrument set after delegation is granted.

## Step 1: Agree on an Initial Capital Plan
The agent reviews YDS-listed instruments, does some light real-world research on the underlying protocols, and proposes an initial 60/40 allocation between `Aave_Arbitrum` and `Compound_Arbitrum`. That mix is meant to fit the user's moderate risk profile while keeping the instrument set small and understandable.

The agent then hands the user a pre-populated create-portfolio link:

```text
https://main0.ymax.app/create-portfolio?Aave_Arbitrum=60&Compound_Arbitrum=40
```

## Step 2: Deploy the Initial Capital
The user follows the link on `main0.ymax.app`, creates the portfolio, and reports that the new portfolio id is `95`.

## Step 3: Prepare the Agent Wallet
The agent generates a key pair, saves the mnemonic securely, derives an Agoric address, and provisions a Smart Wallet for it.

```sh
export MNEMONIC='delegate mnemonic'
export AGENT_ADDRESS=agoric17v05q6zkms4an52cmqjh66wyua4p3mc5x5x42n
agoric wallet provision --account "$AGENT_ADDRESS"
agoric wallet provision --account "$AGENT_ADDRESS" --spend
```

_TODO: For now, this is part of the grubby blockchain onboarding that the future worker proxy should hide._

## Step 4: Authorize the Agent for Later Adjustments
The agent gives the user a link that includes both the created portfolio id and the delegate address:

```text
https://main0.ymax.app/grant?portfolioId=95&accountHolder=agoric17v05q6zkms4an52cmqjh66wyua4p3mc5x5x42n
```

The user follows that link in the `main0.ymax.app` UI to complete the delegation flow.

## Step 5: Wait for the Delegation to Arrive
The agent checks the current wallet state about every 30 seconds until the delegated invitation appears:

```sh
agoric wallet show --from "$AGENT_ADDRESS"
```

## Step 6: Accept the Delegated Mandate

```sh
./packages/portfolio-deploy/scripts/wallet-admin.ts \
  ./packages/portfolio-deploy/src/redeem-invitation.ts \
  --contract ymax0 \
  --description portfolioMandate \
  --save-as delegate-portfolio95
```

## Step 7: Keep Track of the Delegated Handle
The value passed to `--save-as` above, `delegate-portfolio95`, is the key to use later as `--delegation-key`.

## Step 8: React to Changed Market Conditions

Use YDS to inspect the current portfolio state, for example:

```sh
curl -sS "https://main0.ymax.app/portfolios/portfolio95" | jq .
```

**TODO: this sort of query is currently internal-only, right??? Should we issue API keys?**

Assume the current portfolio allocation reported by YDS is:
- `{ "Aave_Arbitrum": "60", "Compound_Arbitrum": "40" }`

Later, after reviewing fresh YDS data and updated market conditions, the agent concludes that a 50/50 split now offers a better balance of expected outcome and the user's stated risk preference, while still staying inside the exact approved instrument set.

The agent prepares the new allocation file:

`allocations-portfolio95.json`

```json
{
  "Aave_Arbitrum": 50,
  "Compound_Arbitrum": 50
}
```

The key set stays the same; only the portions change. That is the point of the delegated tool: the agent can respond to updated information without being able to introduce new instruments or exercise broader portfolio authority.

## Step 9: Reallocate Within the Approved Instrument Set

```sh
./packages/portfolio-deploy/scripts/wallet-admin.ts \
  ./packages/portfolio-deploy/src/delegated-set-target-allocation.ts \
  --contract ymax0 \
  --portfolio-id 95 \
  --delegation-key delegate-portfolio95 \
  --allocations-file ./allocations-portfolio95.json
```

## Step 10: Confirm the New Allocation
- Confirm the tool prints a successful submission tx hash.
- Confirm YDS publishes the updated `targetAllocation`, for example:

```sh
curl -sS "https://main0.ymax.app/portfolios/portfolio95" | jq .
```

- If the contract reports stale `policyVersion` / `rebalanceCount`, re-read sync state and retry once.
