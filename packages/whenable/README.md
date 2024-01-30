# Whenables

Native promises are not compatible with Agoric's durable stores, which means that on the Agoric platform, such promises disconnect their clients when their creator vat is upgraded.  Whenables are objects that represent promises that can be stored durably, this package also provides a `when` operator to allow clients to tolerate upgrades of whenable-hosting vats, as well as a `watch` operator to subscribe to a whenable in a way that survives upgrades of both the creator and subscribing client vats.

## Whenable Consumer

If your vat is a consumer of promises that are unexpectedly fulfilling to a Whenable (something like):

```js
import { E } from '@endo/far';

const a = await w;
const b = await E(w).something(...args);
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

you can use the exported `E` and change the `await w` into `await E.when(w)` in
order to convert a chain of whenables to a promise for its final settlement, and
to do implicit unwrapping of results that are whenables:

```js
import { E } from '@agoric/internal/whenable.js';
[...]
const a = await E.when(w);
const b = await E(w).something(...args);
// Produces the expected results.
```

## Whenable Producer

Use the following to create and resolve a whenable:

```js
import { makeWhenableKit } from '@agoric/whenable/heap.js';
[...]
const { settler, whenable } = makeWhenableKit();
// Send whenable to a potentially different vat.
E(outsideReference).performSomeMethod(whenable);
// some time later...
settler.resolve('now you know the answer');
```

## Durability

The whenable package supports Zones, which are used to integrate Agoric's vat
upgrade mechanism.  To create durable whenable functions:

```js
import { prepareWhenableModule } from '@agoric/whenable';
import { makeDurableZone } from '@agoric/zone';

// Only do the following once at the start of a new vat incarnation:
const zone = makeDurableZone(baggage);
const whenableZone = zone.subZone('WhenableModule');
const { E, when, watch, makeWhenableKit } = prepareWhenableModule(whenableZone);

// Now the functions have been bound to the durable baggage.
// Whenables and settlers you create can be saved in durable stores.
```
