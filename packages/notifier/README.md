# Notifier

This package provides two similar abstractions for producing and consuming
asyncronous sequences of values, the *NotifierKit* and the *SubscriptionKit*.
Both enable a service to notify clients of state changes.

For user documentation on the NotifierKit, see the
[documentation](https://agoric.com/documentation/distributed-programming.html#notifiers).
The following is a more precise description of the semantics of the
NotifierKit, the SubscriptionKit, and their distributed system properties.


# Distributed Asynchronous Iteration

JavaScript defines `AsyncGenerator`s, `AsyncIterable`s, and `AsyncIterator`s.
Each of these manipulate an *async iteration*, an abstract sequence of
values with the following structure:
   * Any number of *non-final values* in a fully ordered sequence to be revealed
     asynchronously over time. These may continue indefinitely or may be
     terminated in one of two ways:
   * The async iteration may *finish* successfully, reporting a final
     *completion value*, or
   * The async iteration may *fail*, reporting an alleged *reason* for its
     failure. The reason is typically an error object, and should be, but may
     in fact be any JavaScript value.

The call `makeNotifierKit()` makes an `{updater, notifier}` pair.
The call `makeSupscriptionKit()` for makes a similar
`{publication, subscription}` pair. The first element of each pair (`updator`,
`publication`) is used to produce the async iteration which can then be
consumed using the second element of each pair (`notifier`,`subscription`).
These have much API in common. The `notifier` and `subscription` both implement
the JavaScript `AsyncIterable` API for consuming the iteration.

There is no JavaScript standard for only producing an iteration, so this
package defines the `IterationObserver` API. Both `updater` and `publication`
implement the `IterationObserver` API. For both pairs, the `IterationObserver`
provides *only* the authority to produce the iteration. The `AsyncIterable`
provides *only* the authority to consume the iteration.

## Example

Although the JavaScript `AsyncIterable` API can be used directly, there are two
more convenient ways to use it: Using the JavaScript `for-await-of` syntax and
using the `observeIteration` adaptor.

```js
const { publication, subscription } = makeSubscriptionKit();
// Paula the publisher says
publication.updateState('a');
publication.updateState('b');
publication.finish('done');
```
The publisher has published an interation with the non-final sequence
`'a'`, `'b'`, terminated with `'done'` as its completion value.

Alice the subscriber consumes using the `for-of-await` loop
```js
async consume(subscription) {
  try {
    for await (const val of subscription) {
      console.log('non-final', val);
    }
    console.log('finished');
  } catch (reason) {
    console.log('failed', reason);
  }
}
consume(subscription);
// eventually prints
// non-final a
// non-final b
// finished
```
Using the `for-await-of` syntax, Alice can see the non-final values and whether
it terminated successfully or with failure. If it fails, then Alice can see the
failure reason. However, using JavaScript's `for-await-of` syntax, Alice cannot
see the completion value `'done'`. This has always been a limitation of
JavaScript's iteration. It applies equally to JavaScript's synchronous
iteration as consumed by the `for-of` loop.

Bob the consumer consumes using the
`observeIteration(asyncIterableP, iterationObserver)` adaptor.
```js
const observer = harden({
  updateState: val => console.log('non-final', val),
  finish: completion => console.log('finished', completion),
  fail: reason => console.log('failed', reason);
});
observeIteration(subscription, observer);
// eventually prints
// non-final a
// non-final b
// finished done
```

The difference between the two pairs is that the NotifierKit is a lossy
conveyor of non-final values whereas the SubscriptionKit is a lossless conveyor
of non-final values. They both losslessly convey termination, so the
SubscriptionKit losslessly conveys the entire async iteration.

Had the example above started with
```js
const { updater, notifier } = makeNotifierKit();
```
propagating the variable renaming through the rest of the code, the code above
remains correct, but Alice and Bob may each have missed either or both of the
non-final values.


## Distributed Operation

Both pairs can be used in a
multicast manner with good distributed systems properties, where there is only
one producing site but any number of consuming sites. The producer is not
vulnerable to the consumers and the consumers are not vulnerable to each other.
For distributed operation, all the iteration values---non-final values,
successful completion value, failure reason---must be `Passable`, i.e., must be
values that can somehow be passed betwen vats. The rest of this page assumes all
these values are Passable.

The maker is used to make the pair on the producer's site. As a result, both
the iterationObserver and the initial asyncIterable are on the producer's site.
If Paula the producer sends Bob the asyncIterable, Bob receives a possibly
remote reference to the async iterable Bob's code above is still correct if he
uses this
reference directly, since `observeIteration` only needs its first argument to
be an `ERef<AsyncIterable<Passable>>`, i.e., a reference of some sort to an
AsyncIterable conveying Passable values. This reference may be a local
AsyncIterable, a remote presence of an AsyncIterable, or a local or remote
promise for an AsyncIterable. `observeIteration` only sends it eventual
messages using `E` (equivalent to the tildot syntax `~.`), and so doesn't care
about these differences.

Although Bob's code is correct, it is sub-optimal. Its distributed systems
properties are not terrible, but Bob can do better using the
`getSharableInternals()` method provided by both NotifierKit and
SubscriptionKit. This enables consumer Bob to make a local AsyncIterable that
coordinates better with producer Paula's IterationObserver. Alice's code is
less forgiving. She's using JavaScript's `for-await-of` loop which requires a
local AsyncIterator. It cannot handle a remote reference to an AsyncIterator at
Paula's site.

# NotifierKit

```js
const {updater, notifier} = makeNotifierKit();

```

The NotifierKit producer produces iteration values with the `unpdater` using
the `IterationObserver` API. The consumer consumes iteration values with the
`notifier` using the `AsyncIterable` API.
The NotifierKit should be used only when the consumer would only be interested
in more recent non-final values. This is often appropriate when the
iteration represents a changing quantity, like a purse balance, and a consumer
updating a UI that doesn't care to hear about any older non-values values, as
they are more stale. NotifierKit is appropriate even when this quantity changes
quickly, as it will only communicate non-final values at the rate they're being
consumed, bounded by the network round-trip time. All other non-final values
are never communicated. The NotifierKit's lossy nature enables this
optimization.

The SubscriptionKit should be used for pub-sub operations, where every
subscriber should see each published value. The producer can be described as
the *publisher* and publishes iteration values with the `publication` using the
`IterationObserver` API. The consumers can be described as *subscribers* and
consumes the published iteration values with the `subscription` using the
`AsyncIterable` API. Since each published value will be sent to all
subscribers, avoid using the SubscriptionKit with rapidly produced values.
