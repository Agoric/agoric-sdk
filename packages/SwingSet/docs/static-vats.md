# Static Vats

A SwingSet machine has two sets of vats. The first are the *Static Vats*, which are defined in the configuration object, and created at startup time. The root objects of these vats are made available to the `bootstrap()` method, which can wire them together as it sees fit.

The second set are the *Dynamic Vats*. These are created after startup, with source code bundles that were not known at boot time. Typically these bundles arrive over the network from external providers. In the Agoric system, contracts are installed as dynamic vats (each spawned instance goes into a separate vat).

This document describes how you define and configure the static vats.

## Creating a Static Vat

The source code for all static vats must be available at the time the host application starts up. This source code, and its dependencies, must not change for the lifetime of the SwingSet machine (which, through persistence and the kernel state database, extends beyond a single process). Applications are encouraged to copy the static vat sources into a working directory during some sort of "init" step, where they'll remain untouched by normal development work on the original files. But note that this won't protect against changes in dependencies.

Static vats are defined by a JS module file which exports a function named `buildRootObject`. The file may export other names; these are currently ignored. The module can import other modules, as long as they are pure JS (no native modules or binary libraries), and they are compatible with SES. See `vat-environment.md` for details of the kind of JS you can use. The static vat file will be scanned for its imports, and the entire dependency graph will be merged into a single "source bundle" object when the kernel first launches.

The `buildRootObject` function will be called with one object, named `vatPowers`. The contents of `vatPowers` are subject to change, but in general it provides pure functions which are inconvenient to access as imports (such as `tildotTransform`), and vat-specific authorities that are not easy to express through syscalls (such as control over local metering). See below for the current property list.

`buildRootObject` is expected to return a hardened object with callable methods and no data properties (note that `harden` is available as a global). For example:

```js
export function buildRootObject(vatPowers) {
  let counter = 0;
  return harden({
    increment() {
      counter += 1;
    },
    read() {
      return counter;
    }
  });
}
```

Each vat has a name. A *Presence* for this vat's root object will be made available to the bootstrap function, in its `vats` argument. For example, if this vat is named `counter`, then the bootstrap function could do:

```js
function bootstrap(argv, vats, devices) {
  vats.counter~.increment();
}
```

The *bootstrap function* is the method named `bootstrap` on a special *bootstrap vat*. This is a static vat defined in a separate section of the config object, currently named `config.bootstrapIndexJS`. This vat is given access to the root objects of all other vats, as well as access to all devices, plus a set of arguments passed into `buildVatController`, all delivered in the bootstrap message. This message is synthesized by the kernel and sent automatically at machine startup. Since no other messages exist at startup time, and only connectivity begets connectivity (as befits an object-capability system), the bootstrap function is entirely responsible for establishing the inter-vat connections necessary for subsequent activity.

### Legacy setup() Function

More generally, vats are defined in terms of a `syscall` object (for the vat to send instructions into the kernel), and a `dispatch` object (for the kernel to send messages into the vat). Vats can provide a `setup()` function which is given a `syscall`, among other things, and are expected to return a `dispatch`. Vats defined this way are not obligated to provide object-capability security within the vat. For example, `syscall.send()` can be used to send a message to any remote object that has ever been granted to anything within the vat. If everything within the vat can reach `syscall`, then every object within the vat is as powerful as any other, and there is no partitioning of authority within the vat.

Most vats use "liveslots", a layer which provides an object-capability environment within a vat. Liveslots is a library which provides a `makeLiveslots()` function. Vats which use liveslots will export a `setup()` function which calls `makeLiveslots()` internally. These vats tend to have boilerplate like this:

```js
export default function setup(syscall, state, helpers, vatPowers0) {
  return helpers.makeLiveSlots(syscall, state,
                               (E, D, vatPowers) => buildRootObject(vatPowers),
                               helpers.vatID,
                               vatPowers0);
}
```

These vats are still supported, for now. Any vat source file which exports `buildRootObject()` will automatically use liveslots. If the file does *not* export `buildRootObject()`, it is expected to export a `default` function that behaves like the `setup()` described above.

A few vats do not use liveslots. The main one is the "comms vat", which performs low-level mapping of kernel-sourced messages into strings that are sent off-machine to other swingsets. This mapping would be rather inefficient if it went through the serialization/deserialization layers that liveslots provides to normal vats. The comms vat will eventually be loaded with some special configuration flag to mark it as non-liveslots, rather than retaining the `default`/`setup()` fallback.

## VatPowers

Static vats currently receive the following objects in their `buildRootObject()`'s sole `vatPowers` argument:

* `makeGetMeter`
* `transformMetering`
* `transformTildot`
* `exitVat`
* `exitVatWithFailure`
* `disavow`, but only if `creationOptions.enableDisavow` was truthy

(dynamic vats do not get `makeGetMeter` or `transformMetering`)

### metering: `makeGetMeter`, `transformMetering`

Static vats are, for now, allowed to apply metering enforcement within their own walls. These vat powers provide the tools they need to do this. `makeGetMeter` returns a new `getMeter` function and a collection of functions to check and refill the meter it wraps. `transformMetering` takes a string of code and returns a new string into which metering code has been injected. By including `getMeter` in the `endowments` of a new `Compartment`, and adding `transformMetering` in the `transforms` of that compartment, vats can impose metering limits on other code evaluated inside the new compartment. When the meter runs out, the code subject to that meter starts throwing exceptions (which it cannot catch itself), and keeps throwing them until the meter is refilled.

This approach is not yet complete or sound (the evaluated code may be able to consume more CPU or memory than the meter ought to allow), and it is easy for the vat code to get confused about how much progress it has made. The metered code might call back into the vat's code, and cause a metering exception to happen halfway through that call, leaving the vat in a confused state. The safest way to meter code is to run it in a completely separate (dynamic) vat, which will live or die as a single unit.

### wavy-dot: `transformTildot`

The "tildot transform" converts wavy-dot (aka tildot) syntax (`counter~.increment()`) into invocations of `HandledPromise` APIs (`HandledPromise.applyMethod(counter, "increment", [])`). The function passed as `vatPowers.transformTildot` accepts one string and returns a new string, with the transform applied.

This is particularly useful for vats that implement a REPL, so operators can include tildot syntax in the expressions they submit. Such a vat will have to transform each expression string before passing it to e.g. `compartment.evaluate()`, generally by creating a new `Compartment` with `transforms: [ vatPowers.transformTildot ]`.

`transformTildot` is provided in `vatPowers` because it relies upon the Babel parser library, and Babel does not run inside a SES non-"Start Compartment" yet. Also, Babel has a lot of code, and bundling all of it into a vat would make the vat bundle file pretty large. Finally, `transformTildot` is unmetered. This doesn't matter for static vats (which aren't metered either), but for dynamic vats (which *are* metered), calling `transformTildot` under metering would consume a lot of the vat's metering budget.

### vat termination: `exitVat` and `exitVatWithFailure`

A vat may signal to the kernel that it should be terminated at the end of its current crank.  Two powers are provided to do this: `exitVat(completion)` and `exitVatWithFailure(reason)`.  These powers will work in any vat but are primarily useful in dynamic vats.  The two differ in how the circumstances of termination are signalled to holders of the vat's `done` promise: `exitVat` fulfills that promise with the value provided in the `completion` parameter, whereas `exitVatWithFailure` rejects the promise with the value provided in the `reason` parameter.  Conventionally, `completion` will be a string and `reason` will be an `Error`, but any serializable object may be used for either.  After the crank in which either of these powers is invoked, no further messages will be delivered to the vat; instead, any such messages will be rejected with a `'vat terminated'` error.  Any outstanding promises for which the vat was the decider will also be rejected in the same way.  The vat and any resources it holds will become eligible for garbage collection.  However, the crank itself will end normally, meaning that any actions taken by the vat during the crank in which either exit power was invoked will become part of the persisted state of the swingset, including messages that were sent from the vat during that crank (including, notably, actions taken _after_ the exit power was invoked but before the crank finished).

### explicitly dropping imported Presences: `disavow`

If enabled, vat code can explicitly drop an imported Presence by calling `vatPowers.disavow(presence)`, which will cause liveslots to invoke `syscall.dropImports()` on the Presence's object ID. This is primarily for testing the GC syscalls without relying upon engine-level finalizers (which are non-trivial to force), especially before the finalization code is complete.

Once disavowed, the Presence stops working. Any messages sent to it (with `E(disavowedPresence).method(args)`) or which reference it (`E(target).method(disavowedPresence)`) will be rejected with an error. Any promise resolutions that reference it will fail somewhat silently (just like unhandled rejected promises).

It's not clear that `disavow` is a good idea: it may be removed once the GC implementation is complete.

## Configuring Vats

Each swingset is created by a call to `buildVatController`, which takes a `config` argument. The `config.vats` property is a Map of named vat definitions: each value is an object with `sourcepath` and `options`. The `sourcepath` is the filename of the vat definition file (the one that exports `buildRootObject`).

The `options` bag currently only recognizes one property: `enablePipelining`. When a pipelining-enabled vat is the *decider* of some unresolved promise, and some other vat sends a message to that promise, the kernel will deliver the message to the vat, rather than holding the message in the kernel queue until the promise becomes resolved. Pipelining is enabled on the comms vat, where it is vital to reduce latency, but disabled on all other vats, where it wouldn't help very much.

## Built-in Vats

The kernel has a handful of built-in vats, which are automatically added and do not need to appear in the `config.vats` table. One is used to create new dynamic vats, this is known as the `vatAdmin` vat.

Other vats are defined by swingset but must be added (to `config.vats`) by the application. These include the timer management vat and the comms vat. These vats might be turned into built-in vats in the future, and removed from the application's sphere of responsibility.
