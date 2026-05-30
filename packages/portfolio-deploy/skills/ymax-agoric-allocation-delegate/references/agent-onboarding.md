# Agent Onboarding and Authorization

## Purpose
Prepare an initial `mainnet` `ymax0` allocation recommendation, hand the user a pre-populated YDS create-portfolio link, then receive and redeem delegation after the user creates the portfolio.

## Inputs
- `YDS_BASE=https://main0.ymax.app`
- `CONTRACT=ymax0`
- the user's risk profile, time horizon, and intended capital deployment

## Step 1: Research and Discuss an Initial Allocation
The agent should:
- use YDS to inspect the currently listed instruments
- do a bit of real-world research on those instruments and protocols
- explore the user's risk profile and how much capital they want to deploy
- propose an initial allocation that fits that discussion

## Step 2: Hand Off a Pre-Populated Create-Portfolio Link
The agent proposes a link of the form:

```text
https://main0.ymax.app/create-portfolio?Aave_Arbitrum=60&Compound_Arbitrum=40
```

That link should pre-populate the YMax create-portfolio page with the discussed allocation.

## Step 3: User Creates the Portfolio
The user follows the link, creates the portfolio on `main0.ymax.app`, and notes the resulting portfolio number.

## Step 4: User Gives the Portfolio Number to the Agent
The agent cannot proceed with delegated updates until the user shares the created portfolio id.

## Step 5: Generate the Delegate Key Pair and Agoric Address
The delegate agent should generate a key pair, derive an Agoric address, and provision a Smart Wallet for that address. That provisioned wallet address is the Grant target.

TODO: specify exactly how the agent generates the key pair and recovers/persists it. This should name the intended tool or command, the mnemonic/private-key handling expectations, and the derivation path / address derivation details for the Agoric wallet. (In the real product, a worker proxy should handle the keys and blockchain integration, exposing MCP / code-mode interfaces to agents.)

Save the mnemonic securely. The same delegate wallet will be needed later for invitation redemption and delegated submissions.

Export the delegate wallet mnemonic in the environment:

```sh
export MNEMONIC='delegate mnemonic'
```

The local CLI path should be based on `packages/agoric-cli` wallet provisioning, for example:

```sh
agoric wallet provision --account "$AGENT_ADDRESS"
agoric wallet provision --account "$AGENT_ADDRESS" --spend
```

The first form reports the provisioning cost; the second actually spends it.

TODO: figure out where the required 10 BLD comes from for delegate-wallet provisioning. One possibility is to use x409 to buy it with USDC or similar, but this needs a real operational answer before the flow is complete.

## Step 6: Hand Off the Delegation Link
The agent gives the user a link of the form:

```text
https://main0.ymax.app/grant?portfolioId=P&accountHolder=agoric1...
```

Replace `P` with the created portfolio id and `agoric1...` with the delegate address from step 5.

The user follows that link to complete the delegation flow in the `main0.ymax.app` UI.

## Step 7: Delegate Redeems the Invitation
Before redeeming, the agent should poll for the delivered invitation by checking the current wallet state and invitation balance. The local CLI path should be based on `packages/agoric-cli`, for example:

```sh
agoric wallet show --from "$AGENT_ADDRESS"
```

Use that about every 30 seconds until the delegated invitation is visible in the wallet's current invitation holdings.

If redemption fails due to wallet configuration, confirm that `MNEMONIC` is still exported for the delegate wallet.

Redeem the delivered invitation and save the delegation facet under a wallet-store key:

```sh
./packages/portfolio-deploy/scripts/wallet-admin.ts \
  ./packages/portfolio-deploy/src/redeem-invitation.ts \
  --contract ymax0 \
  --description portfolioMandate \
  --save-as delegate-portfolio95
```

Choose a saved key that is portfolio-specific, since the same wallet may hold multiple delegations.

## Step 8: Record the Saved Delegation Key
Use the exact value passed to `--save-as` in step 7 as `--delegation-key` for later delegated submissions.

## Notes
- Scope this workflow to `https://main0.ymax.app` and `ymax0`.
- The create-portfolio step is user-driven; the agent advises and prepares the link.
- Grant alone does not make the delegate operational; the invitation must be redeemed.
- Delegation is portfolio-specific.
- The v1 permission is allocation-only.

## Appendix: Initial Integration Testing
For early integration testing, the owner/operator can still submit the EVM-signed Grant directly on mainnet `ymax0`:

```sh
TRADER_KEY='owner mnemonic or private key' \
EMS_KEY='agoric submit mnemonic' \
AGORIC_NET=main \
./packages/portfolio-deploy/scripts/grant-portfolio-delegation.ts \
  --portfolio "$PORTFOLIO_ID" \
  --account-holder "$AGENT_ADDRESS" \
  --chain-id 1 \
  --contract ymax0
```
