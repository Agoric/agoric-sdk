# PublishKit and Related Types

This package provides an abstraction for production and consumption of
asynchronous value sequences, the *PublishKit*, along with similar but
deprecated types *NotifierKit* and *SubscriptionKit*.
All three let a service notify clients of state changes.

In JavaScript, *async iterations* are interacted with by means of AsyncGenerators, AsyncIterables, and AsyncIterators.
For an introduction to these concepts and implementations,
see [here](https://javascript.info/async-iterators-generators).

This content elaborates on [user documentation](https://docs.agoric.com/guides/js-programming/notifiers.html)
to more precisely describe the semantics and distributed system properties of the types.

# Distributed Asynchronous Iteration

An async iteration is an abstract sequence of values. It consists of zero or more
*non-final values* in a fully ordered sequence, revealed asynchronously over time. In other words,
the values have a full ordering, and all consumers see the whole sequence, or a subset of it, in the
same order.

The sequence may continue indefinitely or may terminate in one of two ways:

  * *Finish*: The async iteration successfully completes and reports a final *completion value*,
    which can be any JavaScript value.
  * *Fail*: The async iteration fails and gives a reported final *reason*. This should be an error
     object, but can be any JavaScript value.

Finish and Fail are *final values*. To avoid possible confusion, for iteration values in this doc,
"final" and "non-final" merely refer to position in an iteration, and not "final" in the sense of
the Java keyword or similar.

# Type Differences

`makePublishKit()` makes a `{ publisher, subscriber }` pair, while
`makeSubscriptionKit()` makes a similar `{ publication, subscription }` pair and
`makeNotifierKit()` makes a similar `{ updater, notifier }` pair.
`publisher` and `publication` and `updater` each produce an async iteration which can be
consumed using the respective corresponding `subscriber` and `subscription` and `notifier`.

`notifier` and `subscription` both directly implement the [JavaScript AsyncIterable interface](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-asynciterable-interface)
to consume the iteration (and the `{ subscribeAfter, getUpdateSince }` Subscriber interface
of `subscriber` can be sent to adaptor functions such as `subscribeEach` and `subscribeLatest`
for translation to AsyncIterable).
`updater` and `publication` both implement the `{ updateState, finish, fail }`
IterationObserver interface defined in this package, and `publisher` implements an
analogous `{ publish, finish, fail }` Publisher interface (JavaScript has no standard for
producing iterations).
Note that Publisher and IterationObserver provide *only* the ability to produce the
iteration, while Subscriber AsyncIterable provide *only* the ability to consume the
iteration.

## Lossiness

An iteration subset may be a valid iteration. The types are each organized
around a different way of subsetting one iteration into another.

### NotifierKit

A NotifierKit `notifier` generates *lossy* "sampling subsets" of the iteration produced
by its corresponding `updater`. Different consumers may see different sampling subsets.

An iteration’s *sampling subset*:
   * May omit some of the original iteration’s non-final values.
   * All sampling subset non-final values are in the original’s non-final values in the same order.
   * The original and the subset both have the same termination.
   * Once an original iteration value is available, either that value or a later one will become available on each sampling subset *promptly*, i.e. eventually and without waiting on any other manual steps. In other words, If a value 'a' is introduced on the producer end, then all clients either promptly see 'a', or won't see 'a' but will promptly see a successor. So if two values are added in succession, the first might not be visible to all consumers. But if a value is added and nothing follows for a while, then that value must be distributed promptly to the consumers.

### SubscriptionKit

A SubscriptionKit `subscription` generates fully *lossless* sampling subsets of the iteration
produced by its corresponding `publication`, although consumers can also opt in (or be
restricted) to *forward-lossless* sampling in which they see each value starting with the
current value at the time when consumption starts.
Since each published value will be sent to all subscribers, the SubscriptionKit should generally
not be used with rapidly produced values (and since SubscriptionKit requires permanently
keeping all values, it should generally not be used at all).

The *suffix subset* of a forward-lossless iteration is defined by its *starting point* in the
original iteration.
* A starting point may be a non-final value or a termination.
* The suffix subset has exactly the original iteration’s members from its starting point to and
  including its termination (e.g. if the original is { 2 5 9 13 Fail } with Fail as the
  termination and a starting point at 9, the subset is { 9 13 Fail }).
* When a value becomes available on the original iteration, it *promptly* becomes available
  on every suffix subset whose starting point is at or before that value (e.g. if the original is
  { 2 5 9 13 Fail } and 9 becomes available, 9 promptly becomes available to any suffix
  subset with a starting point of 2, 5, or 9. It does not become available to any subset starting at
  13 or Fail).

The values published using the publication define the original iteration.
Each consumer has a starting point in that iteration and provides access to a suffix subset
from that starting point.
The initial `subscription` created by the `makeSubscriptionKit()` call provides the entire
iteration.

### PublishKit

A PublishKit `subscriber` generates *forward-lossless* sampling subsets of the iteration
produced by its corresponding `publisher`, although consumers can also opt in (or be
restricted) to lossy sampling.
This flexibility is why NotifierKit and SubscriptionKit are deprecated in favor of PublishKit.

## Use Cases

If your consumers need gap-free access to a sequence of values, support forward-lossless
or fully lossless iteration.
Otherwise, support lossy iteration.
The latter is often appropriate when the iteration represents a changing quantity, like
a purse balance, and a consumer updating a UI that doesn't care to hear about any older
non-final values, as they are more stale.
PublishKit and NotifierKit are optimized for that, as non-final values are only
communicated at the rate they're being consumed (bounded by the network round-trip time)
and all other non-final values are never communicated.

# Example

Let’s look at a subscription example. We have three characters: Paula the publisher,
and Alice and Bob the subscribers. While Alice and Bob both consume Paula's published
iteration, they use different tools to do so.

First we create a publication/subscription pair with `makeSubscriptionKit()`.
Paula publishes an iteration with the sequence `'a'`, `'b'`, and then terminates it
with `'done'` as the completion value.

```js
const { publication, subscription } = makeSubscriptionKit();
// Paula the publisher says
publication.updateState('a');
publication.updateState('b');
publication.finish('done');
```

You can use the JavaScript AsyncIterable interface directly, but both the JavaScript
`for`-`await`-`of` syntax and the `observeIteration` adaptor are more convenient.

Subscriber Alice consumes the iteration using a `for`-`await`-`of` loop. She can see the
non-final values and whether the iteration completes or fails. She can see a failure reason,
but the `for`-`await`-`of` syntax does not let her see the completion value `'done'`.
While she can write code that only executes after the loop finishes, that code won’t know
if the completion value was “done”, “completed”, or something else.
This is a limitation of JavaScript's iteration, whether asynchronous or synchronous (as
consumed by a `for`-`of` loop).
```js
const consume = async subscription => {
  try {
    for await (const val of subscription) {
      console.log('non-final', val);
    }
    console.log('the iteration finished');
  } catch (reason) {
    console.log('the iteration failed', reason);
  }
};
consume(subscription);
// eventually prints
// non-final a
// non-final b
// the iteration finished
```

Subscriber Bob consumes using the `observeIteration(asyncIterableP, iterationObserver)` adaptor.
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

The iterators associated with `subscription` and iterables from `subscribeEach` and
`subscribeLatest` adaptors further implement a ForkableAsyncIterable interface allowing
them to produce any number of ForkableAsyncIterators that each advance independently from
a starting point that is the current position of the parent ForkableAsyncIterator at the
time of calling `fork()`.

Carol's code is like Bob's except lower level, using the ForkableAsyncIterable interface directly.

```js
import { makePromiseKit } from '@agoric/promiseKit';

const subscriptionIterator = subscription[Symbol.asyncIterator]();
const { promise: afterA, resolve: afterAResolve } = makePromiseKit();

const observer = harden({
  updateState: val => {
    if (val === 'a') {
      afterAResolve(subscriptionIterator.fork());
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

// afterA is a Promise<ForkableAsyncIterator> so we use observeIterator on it.
observeIterator(afterA, observer);
// eventually prints
// non-final b
// finished done
```

Remember that SubscriptionKits are *fully lossless*.
Each one conveys all of an async iteration’s non-final values, as well as the final value.

On the other hand, NotifierKit is a *lossy* conveyor of non-final values, but does also
losslessly convey termination. Had the example above started with the following instead
of using `makeSubscriptionKit()`,
```js
const { updater: publication, notifier: subscription } = makeNotifierKit();
```
The code is still correct. However, Alice and Bob may each have missed either or both
of the non-final values due to NotifierKit’s lossy nature.

On yet another hand (🤷), the `subscriber` of a Publication includes both a
`subscribeAfter(publishCount?)` method for forward-lossless iteration and a
`getUpdateSince(publishCount?)` method for lossy iteration.
`publishCount` is a gap-free sequence of bigints that starts at 1 for the first result.

# Distributed Operation

PublishKits, NotifierKits, and SubscriptionKits can all be used in a multicast manner with good
distributed systems properties, where there is only one producing site but any number of
consuming sites. The producer is not vulnerable to the consumers; they cannot cause the kit
to malfunction or prevent the code producing values from making progress. The consumers are
not vulnerable to each other; one can’t cause other consumers to hang or miss values.

For distributed operation, all the iteration values---non-final values, successful completion
value, failure reason---must be [Passable](https://docs.agoric.com/guides/js-programming/far.html#pass-styles-and-harden);
values that can somehow be passed between vats.
The rest of this doc assumes all these values are Passable.

The `makePublishKit()` or `makeNotifierKit()` or `makeSubscriptionKit()` call makes the
producer/consumer pair on the producer's site. But if Producer Paula sends Consumer Bob
the `subscriber`/`notifier`/`subscription`, Bob receives a possibly-remote reference to
it. Consumers of an iteration can be remote from its producer.

Bob's code above is still correct if he uses this reference directly, since `observeIteration` only
needs its first argument to be a reference of some sort to an AsyncIterable conveying Passable
values. This reference may be a local AsyncIterable, a local presence of a remote AsyncIterable,
or a promise for a local or remote AsyncIterable.
`observeIteration` only sends it eventual messages using [`E`](https://docs.agoric.com/guides/js-programming/eventual-send.html#eventual-send),
and so doesn't care about those differences.

While correct, Bob’s code is sub-optimal. Its distributed systems properties are not terrible, but
Bob does better using `getSharableSubscriptionInternals()` (provided by
SubscriptionKit). This lets Bob make a local AsyncIterable that coordinates better with Producer
Paula's IterationObserver.

Subscriber Alice's above code is less forgiving. She's using JavaScript's `for`-`await`-`of` loop
which requires a local AsyncIterable. It cannot handle a remote reference to an AsyncIterable
at Paula's site. Alice **must** make an AsyncIterable at her site by using `getSharableSubsciptionInternals()`.
She can replace her call to `consume(subscription)` with:

```js
import { makeSubscription } from '@agoric/notifier';

const localSubscription =
  makeSubscription(E(subscription).getSharableSubscriptionInternals());
consume(localSubscription);
```

The above used a SubscriptionKit. NotifierKits have a similar pair of a `getSharableNotifierInternals` method
and a `makeNotifier`. However, this technique requires that Alice know what kind of possibly-remote
AsyncIterable she has, and to have the required making function code locally available.

Alternatively, Alice can generically mirror any possibly remote AsyncIterable by making a new
local pair and plugging them together with `observeIteration`.
```js
const {
  publication: adapterPublication,
  subscription: adapterSubscription
} = makeSubscriptionKit();
observeIteration(subscription, adapterPublication);
consume(adapterSubscription);
```
This works when `subscription` is a reference to any AsyncIterable. If Alice only needs to
consume in a lossy manner, she can use `makeNotifierKit()` instead, which still works
independently of what kind of AsyncIterable `subscription` is a reference to.

It is also possible to use `subscribeEach` for forward-lossless consumption of a `subscriber`
or `subscription`, and `subscribeLatest` for lossy consumption of a `subscriber` or `notifier`.

# Summary

Data producers must decide whether to support fully lossless, forward-lossless, and/or lossy
consumption.
If your consumers only care about more recent states, then use a PublishKit
`subscriber.getUpdateSince` or a NotifierKit.
This is often appropriate when the iteration represents a changing quantity.
If you want to support consumers that need to see gap-free values, then use a PublishKit
`subscriber.subscribeAfter` or a SubscriptionKit.

Consumers can choose different ways of processing the sequence.
In all cases, the publisher doesn't have to know the consumers, and the consumers can't
interfere with the producer or with each other.
