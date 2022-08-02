# Zoe

## What is Zoe?

Zoe is a framework for building smart contracts like auctions, swaps,
decentralized exchanges, and more. Zoe itself is a smart contract
written in JavaScript and running on the Agoric platform. 

_For users_: Zoe guarantees that as a user of a smart contract, you will
either get what you wanted or get a full refund, even if the smart
contract is buggy or malicious. (In fact, the smart contract never has
access to your digital assets.)

_For developers_: Zoe provides a safety net so you can focus on what
your smart contract does best, without worrying about your users
losing their assets due to a bug in the code that you wrote. Writing a
smart contract on Zoe is easy: all of the Zoe smart contracts are
written in the familiar language of JavaScript.

To learn more, please see the [Zoe guide](https://agoric.com/documentation/zoe/guide/). 

## Reading data off-chain

Some Zoe contracts publish data using StoredPublishKit which tees writes to off-chain storage. These can then be followed off-chain like so,
```js
  const key = `published.priceAggregator`; // or whatever the stream of interest is
  const leader = makeDefaultLeader();
  const follower = makeFollower(storeKey, leader);
  for await (const { value } of iterateLatest(follower)) {
    console.log(`here's a value`, value);
  }
```

The canonical keys (under `published`) are as follows. Non-terminal nodes could have data but don't yet. A `0` indicates the index of that child in added order. To get the actual key look it up in parent. High cardinality types get a parent key for enumeration (e.g. `vaults`.)
- `published`
    - `priceAggregator`

### Demo

Start the chain in one terminal:
```sh
cd packages/cosmic-swingset
make scenario2-setup scenario2-run-chain-economy
```
Once you see a string like `block 17 commit` then the chain is available. In another terminal,
```sh
# shows keys of the priceAggregator
agd query vstorage keys 'published.priceFeed'
# follow quotes
agoric follow :published.priceFeed.ATOM_USD_price_feed
```

 TODO document more of https://github.com/Agoric/documentation/issues/672
