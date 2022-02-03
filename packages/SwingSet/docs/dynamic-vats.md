# Dynamic Vats

A SwingSet machine has two sets of vats. The first are the *Static Vats*, which are defined in the configuration object, and created at startup time. The root objects of these vats are made available to the `bootstrap()` method, which can wire them together as it sees fit.

The second set are the *Dynamic Vats*. These are created after startup, with source code bundles that were not known at boot time. Typically these bundles arrive over the network from external providers. In the Agoric system, contracts are installed as dynamic vats (each spawned instance goes into a separate vat).

Dynamic vats are metered by default: each message delivered gets a limited amount of resources (CPU cycles, memory, stack frames). If it exceeds this budget, the vat is terminated. All outstanding messages will be rejected, any future messages will be rejected, and it will never get CPU time again.

## Creating a Dynamic Vat

Vats are created by sending a `createVat()` message to the *Vat Admin Service* object, containing the source bundle which defines your new vat. Dynamic vats can only be created by other vats on the same SwingSet, so ultimately one of the static vats must cooperate.

The ability to create new vats is not ambient: it requires access to the Vat Admin Service object, which is initially only made available to the bootstrap call. The bootstrap call usually shares it with the vat that installs contracts.

### Making the Source Bundle

The first step is to create a source bundle. To do this, you'll want to point the `bundleSource` function (from the `@endo/bundle-source` package) at a local source file. This file should export a function named `buildRootObject` (it can export other things too, perhaps for unit tests, but only `buildRootObject` will be used by the dynamic vat loader). Suppose your vat code is stored in `vat-counter.js`:

```js
export function buildRootObject() {
  let counter = 0;
  const root = {
    increment() {
      return counter += 1;
    },
    read() {
      return counter;
    },
  };
  return harden(root);
}
```

Then turn this into a bundle:

```js
import bundleSource from '@endo/bundle-source';
async function run() {
  const bundle = await bundleSource('.../vat-counter.js');
  // 'bundle' can be JSON serialized
}
```

The next step is to somehow get this bundle into an existing vat. The bundle can be turned into a string with `s = JSON.stringify(bundle)`, and back into an object with `bundle = JSON.parse(s)`. In the Agoric system, the bundling and transfer is managed by the `agoric deploy` command.

### Options

There is currently only one option recognized by `createVat()`:

* `metered` (boolean, default `true`). If `true`, the new dynamic vat is subject to metering restrictions, and may be terminated if any single crank uses too much. If `false`, the vat is unmetered, and may cause the overall SwingSet machine to cease making progress (by going into an infinite loop, or consuming too much memory, or too many stack frames).

Note that any vat which can reach `createVat()` can create a new unmetered vat, even if the caller was metered themselves. So do not share an unattenuated Vat Admin object with an unmetered vat if you wish them to remain confined to metered operation.

### Invoking createVat()

Once the bundle object is present within a vat that has access to the Vat Admin Service, you create the vat with a `createVat` call:

```js
const control = await E(vatAdminService).createVat(bundle, options);
```

To create an unmetered dynamic vat, set `metered: false`:

```js
const control = await E(vatAdminService).createVat(bundle, { metered: false });
```


## Root Object and Admin Node

The result of `createVat` gives you access to two things. One is a *Presence* through which you can send messages to the root object of the new vat (whatever `buildRootObject()` returned):


```js
const { root, adminNode } = await E(vatAdminService).createVat(bundle);
await E(root).increment();
let count = E(root).read();
console.log(count); // 1
await E(root).increment();
count = E(root).read();
console.log(count); // 2
```

The other is the `adminNode`. This gives the creator of the vat control over the vat itself. Through this, you can retrieve statistics about the vat's execution, find out whether it is still running or not (it might be terminated because it ran down its meter), and preemptively terminate the vat. More features will be added in the future.

### Vat Stats

The current stats include the number of objects, promises, and devices in the vat's *C-List*, which tracks what this vat can reach on other vats.

It also contains the count of entries in the vat's *transcript*. When the SwingSet restarts and needs to restore the vat to its previously-stored state, the kernel will replay the transcript: it re-submits each entry to the vat, allowing the vat to perform the same actions it did the previous time around. Each message delivery goes into a separate transcript entry, as does each promise-resolution notification. The `transcriptCount` thus gives a rough measure of how many messages the vat has executed.

```js
const data = E(adminNode).adminData();
const {
  objectCount,
  promiseCount,
  deviceCount,
  transcriptCount,
} = data;
```

### Waiting for Vat Termination

To find out when the vat is terminated (either explicitly or due to a metering fault), you can wait for the `done()` Promise to fire. It will be resolved normally if the vat was terminated explicitly, and it will be rejected if the vat halted for any other reason.

```
E(adminNode).done()
  .then(() => console.log(`the vat was intentionally shut down`) )
  .catch(error => console.log(`surprise halt: ${error}`) );
```

When the vat halted due to a metering fault, `error` will be a `RangeError` with a message of `Compute meter exceeded`, `Allocate meter exceeded`, or `Stack meter exceeded`.
