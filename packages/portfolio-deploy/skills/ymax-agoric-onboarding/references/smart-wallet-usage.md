# Smart Wallet Usage

This reference documents CLI steps to provision, fund, and inspect a Smart Wallet for a delegate agent.

## Prepare the delegate wallet

Generate a new BIP-39 mnemonic and export it for CLI use:

```sh
cd packages/portfolio-deploy
./scripts/agoric-keygen.sh > agent-config.sh
. agent-config.sh
```

This sets up `$AGENT_ADDRESS` and `$MNEMONIC`.
Keep `$MNEMONIC` confidential.

## Provision the Smart Wallet

Configure the `agoric` CLI to use mainnet nodes:

```sh
export AGORIC_NET=main
```

Check the provisioning cost for the exact address:

```sh
agoric wallet provision --account "$AGENT_ADDRESS"
```

Have the user or a sponsor send at least 15 BLD to `AGENT_ADDRESS`. After the funds arrive, create the Smart Wallet by spending the provisioning cost:

```sh
agoric wallet provision --account "$AGENT_ADDRESS" --spend
```

## Inspecting and querying the wallet

Show the wallet (example):

```sh
agoric wallet show --from "$AGENT_ADDRESS"
```

Use `agoric follow` to observe published wallet state or history:

```sh
agoric follow --help

agoric follow --first-value-only --lossy --bootstrap https://main.agoric.net/network-config  :published.wallet.$AGENT_ADDRESS.current

agoric follow -B https://main.agoric.net/network-config  :published.wallet.$AGENT_ADDRESS

agoric follow -B https://main.agoric.net/network-config  :published.wallet.$AGENT_ADDRESS.current
```

## Notes

- Save the mnemonic durably and keep it confidential.
- Use a distinct saved wallet-store key for each delegated portfolio when redeeming invitations.
