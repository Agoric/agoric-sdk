# NotifierKits and SubscriptionKits

This package provides two similar abstractions for producing and consuming asynchronous value 
sequences, the *NotifierKit* and the *SubscriptionKit*. Both let a service notify clients of state changes.

In JavaScript, async iterations are manipulated by `AsyncGenerators`, `AsyncIterables`, and `AsyncIterators`. 
For an introduction to these concepts and implementations, 
see [here](https://javascript.info/async-iterators-generators).

For NotifierKit user documentation see 
[here](https://agoric.com/documentation/distributed-programming.html#notifiers).
The following doc more precisely describes the semantics of the NotifierKit and the 
SubscriptionKit, their distributed system properties, and what this means for when to use each one. 

# Distributed Asynchronous Iteration

JavaScript's *async iterations* are manipulated by `AsyncGenerators`, `AsyncIterables`, and
`AsyncIterators`.  An async iteration is an abstract sequence of values. It consists of any number
of *non-final values* in a fully ordered sequence revealed asynchronously over time. In other words,
the values have a full ordering, and all consumers see the whole sequence, or a subset of it, in the
same order.

The sequence may continue indefinitely or may terminate in one of two ways:

  * *Finish*: The async iteration successfully completes and reports a final *completion value*, 
    Which can be any JavaScript value.
  * *Fail*: The async iteration fails and a gives a reported final *reason*. This should be an error  
     object, but can be any JavaScript value.
     
Finish and Fail are *final values*. To avoid possible confusion, for iteration values in this doc,
"final" and "non-final" just refer to position in an iteration, and not "final" in the sense of 
the Java keyword or similar. 
   
`makeNotifierKit()` makes an `{updater, notifier}` pair, while `makeSubscriptionKit()` makes a 
similar `{publication, subscription}` pair. Each pair’s first element (`updater` or `publication`) 
produces the async iteration which is then consumed using each pair’s second element (`notifier` 
or `subscription`).

`notifier` and `subscription` both implement the JavaScript `AsyncIterable` API to consume the 
iteration. Both `updater` and `publication` implement the `IterationObserver` API, as defined in 
this package (JavaScript has no standard for producing iterations). For both pairs:
`IterationObserver` provides *only* the ability to produce the iteration. 
`AsyncIterable` provides *only* the ability to consume the iteration.

## Example

Let’s look at an example using `makeSubscriptionKit()` There are three “characters”; Paula the 
publisher, and Alice and Bob, who are both subscribers but use different tools to consume the
iteration.  

You can use the JavaScript `AsyncIterable` API directly, but it is more convenient to either use:
the JavaScript `for-await-of` syntax or
the `observeIteration` adaptor.

Below, Paula publishes an iteration with the non-final sequence `'a'`, `'b'` which terminates 
with `'done'` as its completion value.

```js
const { publication, subscription } = makeSubscriptionKit();
// Paula the publisher says
publication.updateState('a');
publication.updateState('b');
publication.finish('done');
```

Alice, the subscriber, consumes the iteration using the `for-await-of` loop. She can see the 
non-final values and whether the iteration completes or fails. She can see a failure reason, 
but the `for-await-of` syntax does not let her see the completion value `'done'`. While she 
can write code that only executes after the loop finishes, the code won’t know if the completion 
value was “done”, “completed”, or something else. This is a limitation of JavaScript's iteration, 
whether asynchronous or synchronous (as consumed by a `for-of` loop).

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

Bob consumes using the `observeIteration(asyncIterableP, iterationObserver)` adaptor.
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

Note that SubscriptionKit is a *lossless conveyor* of values. It conveys all of 
an async iteration’s non-final values, as well as the final value. 

On the other hand, NotifierKit is a *lossy conveyor* of non-final values, but does also 
losslessly convey termination. Had the example above started with the following instead 
of using `makeSubscriptionKit()`, 
```js
const { updater, notifier } = makeNotifierKit();
```
The code is still correct (assuming we also rename `publication` to `updater` 
and `subscription` to `notifier` in the rest of the code). However, Alice and Bob may 
each have missed either or both of the non-final values due to NotifierKit’s lossy nature.

## Distributed Operation

Either makeNotifierKit or makeSubscriptionKit can be used in a multicast manner with good 
distributed systems properties, where there is only one producing site but any number of 
consuming sites. The producer is not vulnerable to the consumers; they cannot cause the kit 
to malfunction or prevent the code producing values from making progress. The consumers are 
not vulnerable to each other; one can’t cause other consumers to hang or miss values.

For distributed operation, all the iteration values---non-final values, successful completion 
value, failure reason---must be `Passable`; values that can somehow be passed between vats. 
The rest of this doc assumes all these values are Passable.

The makeNotifierKit() or makeSubscriptionKit() call makes the notifier/updater or 
publication/subscription pair on the producer's site. As a result, both the `iterationObserver` and 
the initial `asyncIterable` are on the producer's site. If Producer Paula sends Consumer Bob 
the `asyncIterable`, Bob receives a possibly remote reference to the asyncIterable. Consumers can 
be remote from the producer of their consumed content. 

Bob's code above is still correct if he uses this reference directly, since `observeIteration` only
needs its first argument to be a reference of some sort to an AsyncIterable conveying Passable 
values. This reference may be a local AsyncIterable, a remote presence of an AsyncIterable, or a 
local or remote promise for an AsyncIterable. `observeIteration` only sends it eventual messages 
using `E` (equivalent to the tildot syntax `~.`), and so doesn't care about these differences.

While correct, Bob’s code is sub-optimal. Its distributed systems properties are not terrible, but 
Bob does better using `getSharableSubscriptionInternals()` (provided by
SubscriptionKit). This lets Bob make a local AsyncIterable that coordinates better with producer 
Paula's IterationObserver. 

Subscriber Alice's above code is less forgiving. She's using JavaScript's `for-await-of` loop 
which requires a local AsyncIterable. It cannot handle a remote reference to an AsyncIterable 
at Paula's site. Alice has to make an AsyncIterable at her site by using `getSharableSubsciptionInternals()`. 
She can replace her call to `consume(subscription)` with:

```js
import { makeSubscription } from '@agoric/notifier';

const localSubscription =
  makeSubscription(E(subscription).getSharableSubsciptionInternals());
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

## NotifierKit *vs* SubscriptionKit

An iteration subset may be a valid iteration. NotifierKit and SubscriptionKit are each organized
around a different way of subsetting one iteration into another.

### NotifierKit

A NotifierKit *producer* produces iteration values with the `updater` using the `IterationObserver`
API. Its *consumers* consume iteration values via the `notifier` using the `AsyncIterable` API. Each
NotifierKit consumer iteration is a *sampling subset* of the iteration produced by that NotifierKit
producer. Different consumers may see different sampling subsets.

An iteration’s *sampling subset*:
   * May omit some of the original iteration’s non-final values. 
   * All sampling subset non-final values are in the original’s non-final values in the same order. 
   * The original and the subset both have the same termination. 
   * Once an original iteration value is available, either that value or a later one will become available on each sampling subset *promptly*, i.e. eventually and without waiting on any other manual steps. In other words, If a value 'a' is introduced on the producer end, then all clients either promptly see 'a', or won't see 'a' but will promptly see a successor. So if two values are added in succession, the first might not be visible to all consumers. But if a value is added and nothing follows for a while, then that value must be distributed promptly to the consumers.

If your consumers only care about more recent states, then use a NotifierKit. 
To support consumers that need to see all the values, use a SubscriptionKit. This is often
appropriate when the iteration represents a changing quantity, like a purse balance, and a consumer 
updating a UI that doesn't care to hear about any older non-final values, as they are more stale. A 
Notifier is appropriate even when this quantity changes quickly, as it only communicates non-final values
at the rate they're being consumed, bounded by the network round-trip time. All other non-final values 
are never communicated. The NotifierKit's lossy nature enables this optimization.

### SubscriptionKit

Use the SubscriptionKit for pub-sub operations, where subscribers should see each published value
starting with the starting point of their subscription. The producer can be described as 
the *publisher* and publishes iteration values with the `publication` using the
`IterationObserver` API. The consumers can be described as *subscribers* and consume the published
iteration values with the `subscription` using the `AsyncIterable` API. Since each published value
will be sent to all subscribers, the SubscriptionKit should generally not be used with rapidly produced values.

An iteration’s  *suffix subset* is defined by its *starting point* in the original iteration. 
  * A starting  point may be a non-final value or a termination. 
  * The suffix subset has exactly the original iteration’s members from its starting point to and
     Including its termination (e.g. if the original is { 2 5 9 13 Fail } with Fail as the termination and 
     a starting point at 9, the subset is { 9 13 Fail }).
  * When a value becomes available on the original iteration, it *promptly* becomes available
     on every suffix subset whose starting point is at or before that value (e.g. if the original is
     { 2 5 9 13 Fail } and 9 becomes available, 9 promptly becomes available to any suffix 
     subset with a starting point of 2, 5, or 9. It does not become available to any subset starting at
     13 or Fail).

The values published using the publication define the original iteration. Each subscription has a starting
point in that iteration and provides access to a suffix subset of that iteration starting at that starting
point. The initial subscription created by the `makeSubscriptionKit()` call provides the entire iteration.
Each subscription is an `ForkableAsyncIterable` capable of producing any number of `ForkableAsyncIterator`s,
each of which advances independently from the subscription's starting point.
Each produced `ForkableAsyncIterator` is an `AsyncIterator`,
with a `fork()` method that when called
produces a new `ForkableAsyncIterator`
whose starting point is the current position of its parent `ForkableAsyncIterator`.

Carol's code is like Bob's except lower level, using the `ForkableAsyncIterable` interface directly.

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
## Summary

Data producers have to decide whether to publish losslessly or lossily. If your consumers only care about more recent states,
then use a NotifierKit. This is often appropriate when the iteration represents a changing quantity. If you want to support consumers
that need to see all the values, then use a SubscriptionKit.

Consumers can choose different ways of processing the data. In all cases, the publisher doesn't have to know the 
consumers, and the consumers can't interfere with the producer or each other.

