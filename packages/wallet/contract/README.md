# Smart Wallet contracts

## Single contract

The `singleWalet` contract manages a single smart wallet.

# Multi-tenant contract

The `walletFactory` contract provisions and manages smart wallets.

# Common

There can be zero or one wallets per Cosmos address.

lib-wallet has makeWallet but that's really makeWalletKit

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
