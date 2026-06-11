# Smart Wallet Usage

This reference documents CLI steps to provision, fund, and inspect a Smart Wallet for a delegate agent.

## Prepare the delegate wallet

1. Generate a new BIP-39 mnemonic and export it for CLI use:

```sh
export MNEMONIC='delegate mnemonic'
```

2. Derive the delegate private key and bech32 Agoric address using HD path `m/44'/564'/0'/0/0`. Record the address as `AGENT_ADDRESS`.

## Provision the Smart Wallet

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
