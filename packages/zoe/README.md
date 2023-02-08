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
agoric follow :published.priceFeed.ATOM-USD_price_feed
```

 TODO document more of https://github.com/Agoric/documentation/issues/672

## Upgrade

A contract instance can be upgraded to use a new source code bundle in a process that is very similar to
[upgrading a vat](https://github.com/Agoric/agoric-sdk/blob/master/packages/SwingSet/docs/vat-upgrade.md).
Most state is discarded, however "durable" collections are retained for use by the replacement version.

The upgrade process is triggered through the "adminFacet" of the instance, and requires specifying the new source code. (Note that a "null upgrade" that re-uses the original bundle is valid, and a legitimate approach to deleting accumulated state).

```js
const results = E(instanceAdminFacet).upgradeContract(newBundleID);
```

The new bundle itself must export a `prepare` function in place of `start`, and is obligated to redefine every durable Kind that was created by its predecessor.

For example, suppose v1 code of a simple single-increment-counter contract anticipated extension of exported functionality  and decided to track it by means of "codeVersion" data in baggage. v2 code could add multi-increment behavior like so:

```js
const prepare = async (zcf, _privateArgs, instanceBaggage) => {
  const CODE_VERSION = 2;
  const isFirstIncarnation = !instanceBaggage.has('codeVersion');
  if (isFirstIncarnation) {
    // It is valid to instantiate from v2 code directly.
    instanceBaggage.init('codeVersion', CODE_VERSION);
  } else {
    const previousVersion = instanceBaggage.get('codeVersion');
    previousVersion <= CODE_VERSION ||
      assert.Fail`Cannot downgrade to codeVersion ${q(CODE_VERSION)} from ${q(previousVersion)}`;
    instanceBaggage.set('codeVersion', CODE_VERSION);
  }

  const CounterI = M.interface('Counter', {
    // v1 code used `M.call().returns(M.bigint())`,
    // which v2 extends to include an optional `incrementBy` bigint argument.
    increment: M.call().optional(M.bigint()).returns(M.bigint()),
    read: M.call().returns(M.bigint()),
  });
  const initCounterState = () => ({ value: 0n });
  const makeCounter = prepareExoClass(
    instanceBaggage,
    'Counter',
    CounterI,
    initCounterState,
    {
      // v1 code used `increment() { return this.state.value += 1n; }`.
      increment(incrementBy = 1n) {
        incrementBy > 0n || assert.Fail`increment must be positive`;
        return this.state.value += incrementBy;
      },
      read() { return this.state.value; },
    },
  );

  const creatorI = M.interface('CounterExample', {
    makeCounter: M.call().returns(M.remotable('Counter')),
  });
  const creatorFacet = prepareExo(
    instanceBaggage,
    'creatorFacet',
    creatorI,
    { makeCounter },
  );
  return harden({ creatorFacet });
};
harden(prepare);
export { prepare };
```

For an example contract upgrade, see the test at https://github.com/Agoric/agoric-sdk/blob/master/packages/zoe/test/swingsetTests/upgradeCoveredCall/test-coveredCall-service-upgrade.js .
