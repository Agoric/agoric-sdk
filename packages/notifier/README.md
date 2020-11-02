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
The call `makeSubscriptionKit()` for makes a similar
`{publication, subscription}` pair. The first element of each pair (`updater`,
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
const consume = async subscription => {
  try {
    for await (const val of subscription) {
      console.log('non-final', val);
    }
    console.log('finished');
  } catch (reason) {
    console.log('failed', reason);
  }
};
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
  fail: reason => console.log('failed', reason),
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
successful completion value, failure reason---must be `Passable`, that is, they
must be values that can somehow be passed betwen vats. The rest of this page
assumes all these values are Passable.

The maker is used to make the pair on the producer's site. As a result, both
the iterationObserver and the initial asyncIterable are on the producer's site.
If Paula the producer sends Bob the asyncIterable, Bob receives a possibly
remote reference to the async iterable Bob's code above is still correct if he
uses this
reference directly, since `observeIteration` only needs its first argument to
be an `ERef<AsyncIterable<Passable>>`, that is, a reference of some sort to an
AsyncIterable conveying Passable values. This reference may be a local
AsyncIterable, a remote presence of an AsyncIterable, or a local or remote
promise for an AsyncIterable. `observeIteration` only sends it eventual
messages using `E` (equivalent to the tildot syntax `~.`), and so doesn't care
about these differences.

Although Bob's code is correct, it is sub-optimal. Its distributed systems
properties are not terrible, but Bob can do better using the
`getSharableSubsciptionInternals()` method provided by both NotifierKit and
SubscriptionKit. This enables consumer Bob to make a local AsyncIterable that
coordinates better with producer Paula's IterationObserver. Alice's code is
less forgiving. She's using JavaScript's `for-await-of` loop which requires a
local AsyncIterable. It cannot handle a remote reference to an AsyncIterable
at
Paula's site. Alice has no choice but to make an AsyncIterable at her site.
Using `getSharableSubsciptionInternals()` is the best way for her to do so. She
can replace her last line, the call to `consume(subscription)` with

```js
import { makeSubscription } from '@agoric/notifier';

const localSubscription =
  makeSubscription(E(subscription).getSharableSubsciptionInternals());
consume(localSubscription);
```

For NotifierKits there is a similar pair of a `getSharableNotifierInternals`
method and a `makeNotifier`. However, the technique requires Alice to know what
kind of possibly-remote AsyncIterable she has, and to have the required making
function code locally available. Alternatively, Alice can generically mirror
any possibly remote AsyncIterable by making a new local pair and plugging them
together with `observeIteration`.
```js
const {
  publication: adapterPublication,
  subscription: adapterSubscription
} = makeSubscriptionKit();
observeIteration(subscription, adapterPublication);
consume(adapterSubscription);
```
This will work for `subscription` being a reference to any AsyncIterable. If
Alice only needs to consume in a lossy manner, she can use `makeNotifierKit()`
instead, which will still work independent of what kind of AsyncIteratable
`subscription` is a reference to.

## NotifierKit *vs* SubscriptionKit

A subset of an iteration may itself be a valid iteration. NotifierKit and
SubscriptionKit are each organized around a different way of subsetting one
iteration into another.
   * A *sampling subset* of an iteration omits some of the non-final values of
     the original iteration. Each of the non-final values in the sampling
     subset is also non-final values of the original in the same
     order. The sampling subset has the same termination as the original.
     Once  a value is available on the original iteration, either that value or
     a later value will become available on each sampling subset *promptly*,
     that is, eventually and without waiting on any other manual steps.
   * A *suffix subset* of an iteration is defined by its *starting point* in
     the original iteration. This starting point may be a non-final value or
     a termination. The suffix subset has exactly the members of the original
     iteration from that starting point onward. A suffix subset therefore has
     the same termination as the original. Once a value becomes available on
     the original iteration, that value will *promptly* become available on
     every suffix subset whose starting point is not later than that value.

A NotifierKit *producer* produces iteration values with the `unpdater` using
the `IterationObserver` API. The *consumers* consume iteration values with the
`notifier` using the `AsyncIterable` API. The iteration seen by each NotifierKit
consumer is a sampling subset of the iteration produced by the NotifierKit
producer. Different consumers may see different sampling subsets.

The NotifierKit should be used only when the consumer would only be interested
in more recent non-final values. This is often appropriate when the
iteration represents a changing quantity, like a purse balance, and a consumer
updating a UI that doesn't care to hear about any older non-final values, as
they are more stale. NotifierKit is appropriate even when this quantity changes
quickly, as it will only communicate non-final values at the rate they're being
consumed, bounded by the network round-trip time. All other non-final values
are never communicated. The NotifierKit's lossy nature enables this
optimization.

The SubscriptionKit should be used for pub-sub operations, where every
subscriber should see each published value starting with the starting point of
their subscription. The producer can be described as
the *publisher* and publishes iteration values with the `publication` using the
`IterationObserver` API. The consumers can be described as *subscribers* and
consume the published iteration values with the `subscription` using the
`AsyncIterable` API. Since each published value will be sent to all
subscribers, the SubscriptionKit should generally not be used with rapidly
produced values.

The values published using the publication define the original iteration. Each
subscription has a starting point in that iteration and provides access to a
suffix subset of that iteration starting at that starting point. The initial
subscription created by the `makeSubscriptionKit()` call provides the entire
iteration. Each subscription is a kind of `AsyncIterable` which produces any
number of `AsyncIterators`, each of which advance independently starting with
that subscription's starting point. These `AsyncIterators` are
`SubsciptionIterators` which also have a `subscribe()` method. Calling a
SubscriptionIterator's `subscribe()` method makes a `Subscription` whose
starting point is that `SubscriptionIterator`'s current position at that time.

Neither Alice nor Bob are good starting points to construct an example of
`subscribe()` since their code uses only a `Subscription`, not
a `SubscriptionIterator`. Carol's code is like Bob's except lower level, using
a `SubscriptionIterator` directly. Where Bob uses `observeIteration` which
takes an AsyncIterable`, Carol's uses the lower level `observeIterator` which
takes an `AsyncIterator`.

```js
import { makePromiseKit } from '@agoric/promiseKit';

const subscriptionIterator = subscription[Symbol.asyncIterator]();
const { promise: afterA, resolve: afterAResolve } = makePromiseKit();

const observer = harden({
  updateState: val => {
    if (val === 'a') {
      afterAResolve(subscriptionIterator.subscribe());
    }
    console.log('non-final', val);
  },
  finish: completion => console.log('finished', completion),
  fail: reason => console.log('failed', reason),
});

observeIterator(subscriptionIterator, observer);
// eventually prints
// non-final a
// non-final b
// finished done

// afterA is an ERef<Subscription> so we use observeIteration on it.
observeIteration(afterA, observer);
// eventually prints
// non-final b
// finished done
```
