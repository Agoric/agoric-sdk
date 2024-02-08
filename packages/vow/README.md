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

On Agoric, you can use `V` exported from `@agoric/vat-data/vow.js`, which
converts a chain of promises and vows to a promise for its final
fulfilment, by unwrapping any intermediate vows:

```js
import { V as E } from '@agoric/vat-data/vow.js';
[...]
const a = await E.when(w1);
const b = await E(w2).something(...args);
// Produces the expected results.
```

## Vow Producer

On Agoric, use the following to create and resolve a vow:

```js
// CAVEAT: `V` uses internal ephemeral promises, so while it is convenient,
// it cannot be used by upgradable vats.  See "Durability" below:
import { V as E, makeVowKit } from '@agoric/vat-data/vow.js';
[...]
const { settler, vow } = makeVowKit();
// Send vow to a potentially different vat.
E(outsideReference).performSomeMethod(vow);
// some time later...
settler.resolve('now you know the answer');
```

## Durability

The vow package supports Zones, which are used to integrate Agoric's vat
upgrade mechanism and `watchPromise`.  To create vow tools that deal with
durable objects:

```js
// NOTE: Cannot use `V` as it has non-durable internal state when unwrapping
// vows.  Instead, use the default vow-exposing `E` with the `watch`
// operator.
import { E } from '@endo/far';
import { prepareVowTools } from '@agoric/vat-data/vow.js';
import { makeDurableZone } from '@agoric/zone';

// Only do the following once at the start of a new vat incarnation:
const zone = makeDurableZone(baggage);
const vowZone = zone.subZone('VowTools');
const { watch, makeVowKit } = prepareVowTools(vowZone);

// Now the functions have been bound to the durable baggage.
// Vows and settlers you create can be saved in durable stores.
```
