# Agoric Casting

This [Agoric](https://agoric.com) Casting package follows ocap broadcasts in a
flexible, future-proof way.

TL;DR: You can run `yarn demo`, or to follow a mailbox castingSpec do:
```sh
npx agoric follow -Bhttp://devnet.agoric.net/network-config :mailbox.agoric1foobarbaz -otext
```

An example of following an on-chain mailbox in code (using this package) is:

```js
// First, obtain a Hardened JS environment via Endo.
import '@endo/init/pre-remoting.js'; // needed only for the next line
import '@endo/init';

import {
  iterateLatest,
  makeFollower,
  makeLeader,
  makeCastingSpec,
} from '@agoric/casting';

// Iterate over a mailbox follower on the devnet.
const leader = makeLeader('https://devnet.agoric.net/network-config');
const castingSpec = makeCastingSpec(':mailbox.agoric1foobarbaz');
const follower = makeFollower(castingSpec, leader);
for await (const { value } of iterateLatest(follower)) {
  console.log(`here's a mailbox value`, value);
}
```

## Follower options

The `followerOpts` argument in `makeFollower(leader, key, followerOpts)` provides an optional bag of options:
- the `proof` option, which has three possibilities:
  - `'strict'` - release data only after proving it was validated (may incur waits for one block's data to be validated in the next block),
  - `'optimistic'` (default) - release data immediately, but may crash the follower in the future if an already-released value could not be proven,
  - `'none'` - release data immediately without validation
- the `decode` option is a function to translate `buf: Uint8Array` into `data: string`
  - (default) - interpret buf as a utf-8 string, then `JSON.parse` it
- the `unserializer` option can be
  - (default) - release unserialized objects using [@endo/marshal](https://www.npmjs.com/package/@endo/marshal)'s `makeMarshal()`
  - `null` - don't additionally unserialize data before releasing it
  - any unserializer object supporting `E(unserializer).fromCapData(data)`
- the `crasher` option can be
  - `null` (default) follower failures only propagate an exception/rejection
  - any crasher object supporting `E(crasher).crash(reason)`

## Behind the scenes

- the network config contains enough information to obtain Tendermint RPC nodes
  for a given Agoric network.  You can use `makeLeaderFromRpcAddresses` directly
  if you want to avoid fetching a network-config.
- each follower uses periodic CosmJS state polling (every X milliseconds) which
  can be refreshed more expediently via a Tendermint subscription to the
  corresponding `state_change` event
- published (string) values are automatically unmarshalled, but without object references.   a custom `marshaller` for your application.
- the `iterateRecent` adapter transforms a follower into a local async iterator
  that produces only the last queried value (with no history reconstruction)

## Status

This package currently depends on:
- Hardened Javascript
- [@agoric/notifier](../notifier) async iterable adapters to implement `iterateLatest`
- [@endo/marshal](https://www.npmjs.com/package/@endo/marshal) for default object unserialization
- [CosmJS](https://github.com/cosmos/cosmjs) for proof verification, although [it does not yet support light client tracking of the validator set](https://github.com/cosmos/cosmjs/issues/492)
- a bespoke follower of [WebSocket Tendermint events](https://docs.tendermint.com/master/tendermint-core/subscription.html#legacy-streaming-api)

Short-term goals:
- integrate the new [SharedSubscription API](https://github.com/Agoric/agoric-sdk/pull/5418#discussion_r886253328) from the [Agoric/agoric-sdk#5418 `makePublisherKit` PR](https://github.com/Agoric/agoric-sdk/pull/5418)
- support `iterateEach` with the [lossless forward iteration algorithm](https://github.com/Agoric/agoric-sdk/blob/mfig-vstream/golang/cosmos/x/vstream/spec/01_concepts.md#forward-iteration-lossless-history) via the [Agoric/agoric-sdk#5466 `x/vstream` PR](https://github.com/Agoric/agoric-sdk/pull/5466)
- upgrade to the [Tendermint event log API](https://docs.tendermint.com/master/tendermint-core/subscription.html#event-log-api) when Tendermint v0.36 is supported by the Agoric chain
