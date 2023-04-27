# Smart Wallet

The `walletFactory` contract provisions and manages smart wallets.

## Usage

There can be zero or one wallets per Cosmos address.

1. Generate an address (off-chain)
2. Provision an account using that address, which causes a Bank to get created
   ??? What happens if you try to provision again using the same address? It's a Cosmos level transaction; maybe that fails.
3. Create a Wallet using the Bank (it includes the implementation of Virtual Purses so when you getAmount it goes down to the Golang layer)
   ??? What happens if you try to create another wallet using that bank?

1 Address : 0/1 Bank
1 Address : 1 `myAddressNamesAdmin`
1 Bank : 0/1 Wallet

By design there's a 1:1 across all four.

`namesByAddress` and `board` are shared by everybody.

`myAddressNamesAdmin` is from the account you provision.

## Design

See the [Attackers Guide](src/AttackersGuide.md) for security requirements.

Product requirements:

- provision a wallet
- execute offers using the wallet
- deposit payments into the wallet's purses
- notification of state changes

Each of the above has to work over two channels:

- ocap for JS in vats holding object references (e.g. factory or wallet)
- Cosmos signed messages

Non-requirements:

- Multiple purses per brand ([#6126](https://github.com/Agoric/agoric-sdk/issues/6126)). When this is a requirement we'll need some way to specify in offer execution which purses to take funds from. For UX we shouldn't require that specificity unless there are multiple purses. When there are, lack of specifier could throw or we could have a "default" purse for each brand.

# Testing

There are no automated tests yet verifying the smart wallet running on chain. Here are procedures you can use instead.

## Notifiers

```sh
# freshen sdk
cd agoric-sdk
yarn install && yarn build

# tab 1 (chain)
cd packages/cosmic-swingset/
make scenario2-setup scenario2-run-chain
# starts bare chain, don’t need AMM

# tab 2 (client server)
cd packages/cosmic-swingset/
make scenario2-run-client
# confirm no errors in logs

# tab 3 (interactive)
agoric open --repl
# confirm in browser that `home.wallet` and `home.smartWallet` exist
agd query vstorage keys 'published.wallet'
# confirm it has a key like `published.wallet.agoric1nqxg4pye30n3trct0hf7dclcwfxz8au84hr3ht`
agoric follow :published.wallet.agoric1nqxg4pye30n3trct0hf7dclcwfxz8au84hr3ht
# confirm it has JSON data
```
