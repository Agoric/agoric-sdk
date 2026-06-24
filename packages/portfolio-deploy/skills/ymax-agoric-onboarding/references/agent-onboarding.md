# Agent Onboarding and Authorization

## Purpose

Enable a smooth, secure onboarding flow for a delegated YMax investment portfolio on `main0.ymax.app` by aligning the user's risk profile with a concrete allocation recommendation, minimizing manual setup with a pre-filled portfolio link, and establishing a correctly provisioned delegate wallet so the agent can operate on the user's behalf.

## Inputs

- `YDS_BASE=https://main0.ymax.app`
- `CONTRACT=ymax0`
- the user's risk profile, time horizon, and intended capital deployment
- Documentation: https://ymax.freshdesk.com/support/home
- a sponsor to provide 15 BLD for the delegate wallet

## Step 1: Set up the agent account

The delegate agent should generate a key pair, derive an Agoric address, and provision a Smart Wallet for that address. That provisioned wallet address is the Grant target.

**NOTE WELLL**: Do **not** ask the user to generate a key pair or smart wallet.
This is your job as the agent.

See [Smart wallet usage](smart-wallet-usage.md) for CLI provisioning, funding, and query examples (`agoric wallet`, `agoric follow`).

## Step 2: Research and Discuss Instruments

The agent should:
- use YDS to inspect the currently listed instruments
- do a bit of real-world research on those instruments and protocols
- explore the user's risk profile
- propose a list of instruments that the agent should be allowed to move capital between.
- propose an initial allocation of assets among instruments: for example, 60% Aave on Arbitrum, 40% Compound on Arbitrum.

Note that some instruments may have 0 initial allocation. In order for the agent
to later deposit into that instrument, the instrument has to be in the list.

The allocation should be percentages that add up to 100.

Avoid financial advice phrasing by saying, for example:
The following allocation appears to meet your preferences based on the current APYs.

## Step 3: Hand Off a Pre-Populated Create-Portfolio Link

The agent proposes a link.

During a transitionary period, use the deploy preview:

```text
https://feat-ago-611-prepopulated-li.ymax0-ui.pages.dev/create-portfolio?Aave_Arbitrum=60&Compound_Arbitrum=40&Compound_Ethereum=0
```

in due course, it should be available at:

The agent proposes a link of the form:

```text
https://main0.ymax.app/create-portfolio?Aave_Arbitrum=60&Compound_Arbitrum=40
```

That link should pre-populate the YMax create-portfolio page with the discussed allocation.

TODO: possibly explain the xyz2 spending cap thing?

## Step 4: User Creates the Portfolio
The user follows the link and creates the portfolio on `main0.ymax.app`.

To get the portfolio id, they should go to the Activity tab and look at the details of their first activity: https://feat-ago-611-prepopulated-li.ymax0-ui.pages.dev/activity/flow1

There they should see something like:
Activity ID 123-1

Then `portfolio123` is their portfolio.

Use the [YDS Query Playbook](../ymax-agoric-allocation-delegate/references/yds-query-playbook.md) to explore the portfolio status.

## Step 5: User Gives the Portfolio Number to the Agent
The agent cannot proceed with delegated updates until the user shares the created portfolio id.

## Step 6: Hand Off the Delegation Link

**Note well**: Double-check that your smart wallet (that is: the agent's smart wallet) is provisioned: use `agoric wallet show ...` as in [Smart wallet usage](smart-wallet-usage.md). If your smart wallet is not provisioned, the grant will fail (TODO: the failure should be visible to the user).

The agent gives the user a link.

The branch preview is currently operational:

```text
https://feat-ago-611-prepopulated-li.ymax0-ui.pages.dev/grant?portfolioId=P&accountHolder=agoric1...
```

In due course, you should be able to use:

```text
https://main0.ymax.app/grant?portfolioId=P&accountHolder=agoric1...
```

Replace `P` with the created portfolio id and `agoric1...` with the delegate address from step 2.

The user follows that link to complete the delegation flow in the `main0.ymax.app` UI.

## Step 7: Delegate Redeems the Invitation

Before redeeming, the agent should poll for the delivered invitation by checking the current wallet state and invitation balance. The local CLI path should be based on `packages/agoric-cli`; see [Smart wallet usage](smart-wallet-usage.md) for `agoric wallet show` examples.

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

Confirm that the agent is published to vstorage in the portfolio status:

```sh
agoric follow -lF -B https://main.agoric.net/network-config --output json :published.ymax0.portfolios.portfolio77.agents
```

## Step 8: Record the Saved Delegation Key
Use the exact value passed to `--save-as` in step 7 as `--delegation-key` for later delegated submissions.

## Step 9: Report completion of onboarding

Summarize the results of onboarding, such as:

 - Chosen instruments: Aave_Arbitrum, ...
   - Allocations: Aave_Arbitrum: 35%; ...
 - Portfolio id: portfolio77
 - Delegate address: agoric1s8wkm5ze3ra9ttad55fuq3m5z2vrf583rmagml
   - Mnemonic / config saved: agent-config.sh:1-2
 - Save-result name: delegate-portfolio77 (wallet-store key)
   - Invitation description: portfolioMandate
 - Agent id: agent1
   - Permissions: allocation: true
   - Status: active


## Notes
- Scope this workflow to `https://main0.ymax.app` and `ymax0`.
- The create-portfolio step is user-driven; the agent advises and prepares the link.
- Grant alone does not make the delegate operational; the invitation must be redeemed.
- Delegation is portfolio-specific.
- The v1 permission is allocation-only.
