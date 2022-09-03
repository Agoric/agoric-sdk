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

# Testing
There are no automated tests yet verifying the smart wallet running on chain. Here are procedures you can use instead.

## Notifiers

```
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
