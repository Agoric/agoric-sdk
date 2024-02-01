# Whenables

Native promises are not compatible with Agoric's durable stores, which means that on the Agoric platform, such promises disconnect their clients when their creator vat is upgraded.  Whenables are objects that represent promises that can be stored durably, this package also provides a `when` operator to allow clients to tolerate upgrades of whenable-hosting vats, as well as a `watch` operator to subscribe to a whenable in a way that survives upgrades of both the creator and subscribing client vats.

## Whenable Consumer

If your vat is a consumer of promises that are unexpectedly fulfilling to a Whenable (something like):

```js
import { E } from '@endo/far';

const a = await w1;
const b = await E(w2).something(...args);
console.log('Here they are:', { a, b });
```

Produces output like:
```console
Here they are: {
  a: Object [Whenable] {
    payload: { whenableV0: Object [Alleged: WhenableInternalsKit whenableV0] {} }
  },
  b: Object [Whenable] {
    payload: { whenableV0: Object [Alleged: WhenableInternalsKit whenableV0] {} }
  }
}
```

On Agoric, you can use `V` exported from `@agoric/vat-data/whenable.js`, which
converts a chain of whenables to a promise for its final settlement, with
implicit unwrapping of results that are whenables:

```js
import { V as E } from '@agoric/vat-data/whenable.js';
[...]
const a = await E.when(w1);
const b = await E(w2).something(...args);
// Produces the expected results.
```

## Whenable Producer

On Agoric, use the following to create and resolve a whenable:

```js
// CAVEAT: `V` uses internal ephemeral promises, so while it is convenient,
// it cannot be used by upgradable vats.  See "Durability" below:
import { V as E, makeWhenableKit } from '@agoric/vat-data/whenable.js';
[...]
const { settler, whenable } = makeWhenableKit();
// Send whenable to a potentially different vat.
E(outsideReference).performSomeMethod(whenable);
// some time later...
settler.resolve('now you know the answer');
```

## Durability

The whenable package supports Zones, which are used to integrate Agoric's vat
upgrade mechanism and `watchPromise`.  To create whenable tools that deal with
durable objects:

```js
// NOTE: Cannot use `V` as it has non-durable internal state when unwrapping
// whenables.  Instead, use the default whenable-exposing `E` with the `watch`
// operator.
import { E } from '@endo/far';
import { prepareWhenableTools } from '@agoric/vat-data/whenable.js';
import { makeDurableZone } from '@agoric/zone';

// Only do the following once at the start of a new vat incarnation:
const zone = makeDurableZone(baggage);
const whenableZone = zone.subZone('WhenableTools');
const { watch, makeWhenableKit } = prepareWhenableTools(whenableZone);

// Now the functions have been bound to the durable baggage.
// Whenables and settlers you create can be saved in durable stores.
```
