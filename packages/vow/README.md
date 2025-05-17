# Vows

Native promises are not compatible with Agoric's durable stores, which means that on the Agoric platform, such promises disconnect their clients when their creator vat is upgraded.  Vows are objects that represent promises that can be stored durably, this package also provides a `when` operator to allow clients to tolerate upgrades of vow-hosting vats, as well as a `watch` operator to subscribe to a vow in a way that survives upgrades of both the creator and subscribing client vats.

## Vow Consumer

If your vat is a consumer of promises that are unexpectedly fulfilling to a Vow (something like):

```js
import { E } from '@endo/far';

const a = await w1;
const b = await E(w2).something(...args);
console.log('Here they are:', { a, b });
```

Produces output like:
```console
Here they are: {
  a: Object [Vow] {
    payload: { vowV0: Object [Alleged: VowInternalsKit vowV0] {} }
  },
  b: Object [Vow] {
    payload: { vowV0: Object [Alleged: VowInternalsKit vowV0] {} }
  }
}
```

You can use `heapVowE` exported from `@agoric/vow`, which converts a chain of
promises and vows to a promise for its final fulfillment, by unwrapping any
intermediate vows:

```js
import { heapVowE as E } from '@agoric/vow';
[...]
const a = await E.when(w1);
const b = await E(w2).something(...args);
// Produces the expected results.
```

## Vow Producer

Use the following to create and resolve a vow:

```js
// CAVEAT: `heapVow*` uses internal ephemeral promises, so while it is convenient,
// it cannot be used by upgradable vats.  See "Durability" below:
import { heapVowE, heapVowTools } from '@agoric/vow';
const { makeVowKit } = heapVowTools;
[...]
const { resolver, vow } = makeVowKit();
// Send vow to a potentially different vat.
E(outsideReference).performSomeMethod(vow);
// some time later...
resolver.resolve('now you know the answer');
```

## Durability

By default, the `@agoric/vow` module allows vows to integrate with Agoric's vat
upgrade mechanism.  To create vow tools that deal with durable objects:

```js
// NOTE: Cannot use `V` as it has non-durable internal state when unwrapping
// vows.  Instead, use the default vow-exposing `E` with the `watch`
// operator.
import { E } from '@endo/far';
import { prepareVowTools } from '@agoric/vow';
import { makeDurableZone } from '@agoric/zone';

// Only do the following once at the start of a new vat incarnation:
const zone = makeDurableZone(baggage);
const vowZone = zone.subZone('VowTools');
const { watch, makeVowKit } = prepareVowTools(vowZone);

// Now the functions have been bound to the durable baggage.
// Vows and resolvers you create can be saved in durable stores.
```

## VowTools

VowTools are a set of utility functions for working with Vows in Agoric smart contracts and vats. These tools help manage asynchronous operations in a way that's resilient to vat upgrades, ensuring your smart contract can handle long-running processes reliably.

### Usage

VowTools are typically prepared in the start function of a smart contract or vat and passed in as a power to exos.


```javascript
import { prepareVowTools } from '@agoric/vow/vat.js';
import { makeDurableZone } from '@agoric/zone/durable.js';

export const start = async (zcf, privateArgs, baggage) => {
  const zone = makeDurableZone(baggage);
  const vowTools = prepareVowTools(zone.subZone('vows'));  

  // Use vowTools here...
}
```

### Available Tools

#### `when(vowOrPromise)`
Returns a Promise for the fulfillment of the very end of the `vowOrPromise` chain.  It can retry disconnections due to upgrades of other vats, but cannot survive the upgrade of the calling vat.

#### `watch(promiseOrVow, [watcher], [context])`
Watch a Vow and optionally provide a `watcher` with `onFulfilled`/`onRejected` handlers and a `context` value for the handlers. When handlers are not provided the fulfillment or rejection will simply pass through.

It also registers pending Promises, so if the current vat is upgraded, the watcher is rejected because the Promise was lost when the heap was reset.

#### `all(arrayOfPassables, [watcher], [context])`
Vow-tolerant implementation of Promise.all that takes an iterable of vows and other Passables and returns a single Vow.  It resolves with an array of values when all of the input's promises or vows are fulfilled and rejects with the first rejection reason when any of the input's promises or vows are rejected.

#### `allSettled(arrayOfPassables, [watcher], [context])`
Vow-tolerant implementation of Promise.allSettled that takes an iterable of vows and other Passables and returns a single Vow.  It resolves when all of the input's promises or vows are settled with an array of settled outcome objects.

#### `asVow(fn)`
Takes a function that might return synchronously, throw an Error, or return a Promise or Vow and returns a Vow.

#### `asPromise(vow)`
Converts a Vow back into a Promise.

### Example

```javascript
const { when, watch, all, allSettled } = vowTools;

// Using watch to create a Vow
const myVow = watch(someAsyncOperation());

// Using when to resolve a Vow
const result = await when(myVow);

// Using all
const results = await when(all([vow, vowForVow, promise]));

// Using allSettled
const outcomes = await when(allSettled([vow, vowForVow, promise]));
```

## Internals

The current "version 0" vow internals expose a `shorten()` method, returning a
promise for the next resolution.  `watch` and `when` use `shorten()` to advance
through the vow chain step-by-step, tolerating disconnects by retrying a failed
step, rather than just making one giant leap to the end of a promise chain with
`.then(...)`.

Here is an (oversimplified) algorithm that `watch` and `when` use to obtain a
final result:

```js
// Directly await the non-retryable original specimen.
// This is non-retryable because we don't know how our caller obtained
// it in the first place, since it is an application-specific detail
// that may not be side-effect free.
let result = await specimenP;
let vowInternals = getVowInternals(result);
let disconnectionState = undefined;
// Loop until the result is no longer a vow.
while (vowInternals) {
  try {
    // WARNING: Do not use `shorten()` in your own code.  This is an example
    // for didactic purposes only.
    const shortened = await E(vowInternals.vowV0).shorten();
    const nextInternals = getVowInternals(shortened);
    // Atomically update the state.
    result = shortened;
    vowInternals = nextInternals;
  } catch (e) {
    const nextDisconnectionState = isDisconnectionReason(e, disconnectionState);
    if (!nextDisconnectionState) {
      // Not a disconnect, so abort.
      throw e;
    }
    // It was a disconnect, so try again with the updated state.
    disconnectionState = nextDisconnectionState;
  }
}
return result;
```
