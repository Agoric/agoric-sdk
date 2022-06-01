# Chain Streams

This [Agoric](https://agoric.com) Chain Streams package consumes data server
publication sources in a flexible, future-proof way.

An example of following an on-chain mailbox using this package is:

```js
import { makeSourceFromNetconfig, iterateLatest } from '@agoric/chain-streams';

const src = makeSourceFromNetconfig('https://devnet.agoric.net/network-config');
const stream = E(src).makeStreamFromStoragePath('mailbox.agoric1...', { integrity: 'unsafe' });
for await (const mailbox of iterateLatest(stream)) {
  console.log(`here's a mailbox object`, mailbox);
}
```

## Stream options

The `E(src).makeStream...` call allows specifying a second argument of stream options
- the `integrity` option, which has three possibilities:
  - `safe` (default) - release data only after proving it was validated (may incur waits for one block's data to be validated in the next block),
  - `optimistic` - release data immediately, but may crash the stream in the future if a released value could not be proven,
  - `unsafe` - release data immediately without validation
- the `unserializer` option can be
  - (default) - release unserialized objects using `@agoric/marshal`'s `makeMarshal()`
  - `null` - don't translate data before releasing it
  - any unserializer object supporting `E(unserializer).unserialize(data)`

## Behind the scenes

- the network config contains enough information to obtain Tendermint RPC nodes
  for a given Agoric network.  You can use `makeSourceFromTendermintRPCNodes`
  directly if you want to avoid using a network-config.
- each stream uses periodic CosmJS state polling (every X milliseconds) which
  can be refreshed more expediently via a Tendermint subscription to the
  corresponding `state_change` event
- published (string) values are automatically unmarshalled, but without object references.   a custom `marshaller` for your application.
- the `iterateRecent` adapter transforms a stream into a local async iterator
  that produces only the last queried value (with no history reconstruction)

## Status

This package currently depends on:
- Hardened Javascript
- `@agoric/notify` async iterable adapters to implement `iterateLatest`
- `@endo/marshal` for default object unserialization
- [CosmJS](https://github.com/cosmos/cosmjs) for proof verification, although [it does not yet support light client tracking of the validator set](https://github.com/cosmos/cosmjs/issues/492)
- a bespoke follower of [WebSocket Tendermint events](https://docs.tendermint.com/master/tendermint-core/subscription.html#legacy-streaming-api)

Short-term goals:
- integrate the new [SharedSubscription API](https://github.com/Agoric/agoric-sdk/pull/5418#discussion_r886253328) from the [Agoric/agoric-sdk#5418 `makePublisherKit` PR](https://github.com/Agoric/agoric-sdk/pull/5418)
- support `iterateEach` with the [lossless forward iteration algorithm](https://github.com/Agoric/agoric-sdk/blob/mfig-vstream/golang/cosmos/x/vstream/spec/01_concepts.md#forward-iteration-lossless-history) via the [Agoric/agoric-sdk#5466 `x/vstream` PR](https://github.com/Agoric/agoric-sdk/pull/5466)
- upgrade to the [Tendermint event log API](https://docs.tendermint.com/master/tendermint-core/subscription.html#event-log-api) when Tendermint v0.36 is supported by the Agoric chain
