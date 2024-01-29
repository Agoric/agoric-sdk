# Whenables

Native promises are not compatible with `@agoric/store`, which means that on the Agoric platform, such promises are disconnected when their creator vat is upgraded.  Whenables are storable objects that represent a promise that tolerates disconnections.

## Whenable Consumer

If your vat is a consumer of promises that are unexpectedly fulfilling to a Whenable (something like):

```js
await w;
Object [Whenable] {
  payload: { whenableV0: Object [Alleged: WhenableInternalsKit whenableV0] {} }
}
```

you can change the `await w` into `await when(w)` to convert a chain of whenables to its final settlement:

```js
import { when } from '@agoric/whenable/heap.js';
[...]
await when(w);
'Hello, patient world!'
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
const { when, watch, makeWhenableKit } = prepareWhenableModule(whenableZone);

// Now you the functions have been bound to the durable baggage.
// Whenables and settlers you create can be saved in durable stores.
```
