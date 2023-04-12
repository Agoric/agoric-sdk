# Inter Protocol Liquidation Bidding Test Tool

The `agops` command (from the `agoric` package in `packages/agoric-cli`)
supports the role of liquidation bidder using a unix command-line interface (CLI).

```
$ inter bid by-price --give 85IST --price 8.55 --from test-acct | jq
bid is broadcast:
{
  "timestamp": "2023-03-31T05:46:27Z",
  "height": "54871",
  "offerId": "bid-1680241587424",
  "txhash": "CC8D778F51867B36CB91D0..."
}
{
  "id": "bid-1680241587424",
  "price": "8.50 IST/IbcATOM",
  "give": { "Currency": "85IST" },
  "result": "Your bid has been accepted"
}
```

Then perhaps yours is the winning bid:

```
$ inter bid list --from test-acct --all | jq
{
  "id": "bid-1680241587424",
  "payouts": {"Collateral":"3.105 ATOM"}
}
```

See also [test-inter-cli.js.md](https://github.com/Agoric/agoric-sdk/blob/master/packages/agoric-cli/test/snapshots/test-inter-cli.js.md) for exhaustive command options.

## Installation

You will need to install several components before you’ll be in a position to participate in liquidations bidding. These include:
-The AgoricSDK and prerequisite dev tools 'node', 'go', 'yarn', 'agd' (CLI tool) and 'agops'.

Conveniently you can install all these using:

```sh
git clone https://github.com/Agoric/agoric-sdk
cd agoric-sdk
SKIP_DOWNLOAD=false ./bin/agd build
```


### Locating the `agd` command

`agd` follows `go` conventions, so be sure `~/go/bin` is in your `$PATH`:

```sh
export PATH=~/go/bin:$PATH
```

Then try `agd version` to confirm.

### Locating the `agops inter` command

`agops` follows `npm`/`yarn` conventions, so you can `yarn run agops inter` as long as your current directory is under `agoric-sdk`.

#### Add an alias for `agops inter`

```sh
alias inter="yarn run --silent agops inter"
```

Then you can just run...

```
$ inter
Usage: agops inter [options] [command]

Inter Protocol commands for liquidation bidding etc.
...
```


## Key management with `agd`

If you don't already have a testing address and corresponding private key:

```sh
agd keys add test-acct --keyring-backend=test
```

For example:

```
$ agd keys add test-acct --keyring-backend=test

- name: test-acct
  type: local
  address: agoric18jr9nlvp300feu726y3v4n07ykfjwup3twnlyn
  pubkey: '{"@type":"/cosmos.crypto.secp256k1.PubKey","key":"ApPNaneZjAWy2RarLaIw5O3vkBD6R3uZ9F2eRogei2BO"}'
  mnemonic: ""


**Important** write this mnemonic phrase in a safe place.
It is the only way to recover your account if you ever forget your password.

abandon plate bind ...
```

**CAUTION**: `agd keys add` displays the private mnemonic.


Using the `test` keyring is lower friction, but feel free to use the os keyring:

```sh
agd keys add test-acct
```

## Provisioning your account for use with Zoe smart contracts

Mainnet

You’ll need to provision an Agoric Smart Wallet account (offer handler) in order to interact with Zoe contracts. You’ll need acquire 10BLD in order to do this. See[ ‘How to Provisions a Smart Wallet instructions’](https://docs.inter.trade/user-how-to/wallet-usage/create-your-agoric-account-and-smart-wallet.). Once provisioned, you’ll need to hold an IST balance in order to be able to place a bid.

Testnet

You’ll need to use the relevant faucet to be able to provision your smart wallet (and fund with IST and other tokens such as toy ATOM). You’ll need to grab your Agoric account address from Keplr then head to https://ollinet.agoric.net/, https://devnet.agoric.net/ etc., click ‘Faucet’, paste your address and select ‘send IST and provision…’. After success, toggle ‘Send tokens’ to fund your wallet with some test tokens.

## Troubleshooting - 'Error: key with address XXXXX...not found: key not found...'

If you see something like this when you try sign and send a transaction with a brand new key...

```
$ inter bid by-price --from test-acct --give 10IST --price 3
Error: key with address 3C8659F... not found: key not found
Usage: ...
...
```

It's because the blockchain has no record of your account until some tokens are sent to it.

Use https://devnet.faucet.agoric.net/ or similar to get some BLD and toy IBC asset tokens.

Confirm by querying your balances:

```
$ agd query bank balances agoric18jr9nlvp... --node=https://devnet.rpc.agoric.net:443
balances:
- amount: "25000000"
  denom: ibc/toyatom
- amount: "75000000"
  denom: ubld
```

**Note:** The URLs of the faucet, RPC node, explorer, etc. are available at https://devnet.agoric.net/ .

## Liquidation Status

To see what's available:

```
$ inter liquidation status
{
  "liquidatingCollateral": "116IbcATOM",
  "liquidatingDebt": "577.814285IST",
  "price": "12 IST/IbcATOM"
}
```

## Choosing a network configuration with `AGORIC_NET`

By default, `agops` tries to contact a local node. If you don't have one running, you may see...

```
$ inter liquidation status
(Error#1)
Error#1: cannot read data of published.agoricNames.brand: request to http://0.0.0.0:26657/abci_query?path=%22/custom/vstorage/data/published.agoricNames.brand%22&height=0 failed, reason: connect ECONNREFUSED 0.0.0.0:26657
```

You’ll need to tell agops to use specific network details (https://devnet.agoric.net/network-config) such as chainName and rpcAddrs. To tell agops to use it set it as follows: 

```sh
export AGORIC_NET=devnet
```
i.e. AGORIC_NET=mainnet, AGORIC_NET=ollinet etc.

## Smart Contract Token Metadata: `inter vbank list`

You may notice that `inter liquidation status` used the name `IST` where `agd query bank balances` shows `uist`. And the decimals were different.

Electronic Rights Transfer Protocol (ERTP) is the token abstraction used in the Agoric smart contract platform. Cosmos-SDK denoms are reflected as ERTP issuers and brands via the **vbank**. Use `inter vbank list` To see the correspondence:

```
$ inter vbank list
[
  {
    "issuerName": "BLD",
    "denom": "ubld",
    "brand": { "boardId": "board0223" },
    "displayInfo": { "decimalPlaces": 6 }
  },
  {
    "issuerName": "IST",
    "denom": "uist",
    "brand": { "boardId": "board0566" },
    "displayInfo": { "decimalPlaces": 6 }
  },
  {
    "issuerName": "IbcATOM",
    "denom": "ibc/toyatom",
    "brand": { "boardId": "board03446" },
    "displayInfo": { "decimalPlaces": 6 }
  }
]
```


## Placing a bid: `inter bid ...`

Let's place a 5 IST bid at a price of 9.50:

```
$ inter bid by-price --give 5IST --price 9.50 --from test-acct
2023-03-31T07:07:33.319399551Z tx not in block 55762 retrying...
2023-03-31T07:07:33.319399551Z tx not in block 55762 retrying...
bid is broadcast:
{"timestamp":"2023-03-31T07:07:38Z","height":"55763","offerId":"bid-1680246460034","txhash":"FDB98EEC71E987FEEE4A..."}
{"id":"bid-1680246460034","price":"9.5 IST/IbcATOM","give":{"Currency":"5IST"},"result":"Your bid has been accepted"}
```

This command does several things:

  1. formats the bid as a Zoe offer specification
  2. signs and broadcasts a transaction containing the offer spec
  3. waits for the transaction to be included in a block
  4. waits for the offer to be placed with the auctioneer contract via Zoe

TODO: `inter bid by-discount`.

TODO: fix `want` handling.


## Listing your open bids: `inter bid list`

```
$ inter bid list --from test-acct
{"id":"bid-1680246460034","price":"9.5 IST/IbcATOM","give":{"Currency":"5IST"},"result":"Your bid has been accepted"}
```

### Listing all bids, including payouts, with `--all`

If you win an auction, the winning bid will no longer be open; so use `--all`:

```
$ inter bid list --from test-acct --all
{"id":"bid-123142131231","price":"10.000000000000002 IST/IbcATOM","give":{"Currency":"10IST"},"payouts":{"Currency":"10IST"}}
{"id":"bid-1680232100993","price":"5.000000000000001 IST/IbcATOM","give":{"Currency":"0.7IST"},"want":"2IbcATOM","result":"Your bid has been accepted"}
```


## Canceling a bid: `inter bid cancel`

```
$ inter bid cancel bid-1680246460034 --from test-acct
2023-03-31T07:22:46.249734011Z tx not in block 55929 retrying...
2023-03-31T07:22:46.249734011Z tx not in block 55929 retrying...
cancel action is broadcast:
{"timestamp":"2023-03-31T07:22:51Z","height":"55930","offerId":"bid-1680246460034","txhash":"5E855848A12C..."}
bid bid-1680246460034 is no longer live
{"time":"2023-03-31T07:22:51.77137307Z","height":"55930"}
```

A cancelled bid is refunded; this is shown as `payouts` when using `inter bid list --all`:

```
$ inter bid list --all --from test-acct | grep bid-1680246460034
{"id":"bid-1680246460034","price":"9.5 IST/IbcATOM","give":{"Currency":"5IST"},"payouts":{"Collateral":"0IbcATOM","Currency":"5IST"}}
```

## Bid History and Pruning

Bid history is subject to pruning. To be sure you have the full history of your bids available, run a follower node. _TODO: pointer to details._
