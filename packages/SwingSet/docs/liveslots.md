# LiveSlots

This runtime treats vats as if they were userspace processes in an operating system. The "kernel" calls into a userspace function named `dispatch()` which is registered at setup time. The vat calls into the kernel through a `syscall` object. Vats and the kernel talk about "slots", which are either exported from the vat (and referenced by other vats via the kernel), or imported into the vat (and thus reference other vats, via the kernel). Vats are internally responsible for managing their slot tables and implementing the `dispatch()` function.

"Liveslots" is a particular dispatch mechanism that uses Maps/WeakMaps to track "live objects". Imported references to objects on other vats are represented by special "Presence" objects. Liveslots implements the `E` wrapper which allows messages to be sent through presences: `promise = E(presence).methodname(args)`. Presences can be sent in arguments or returned from method calls.

The nice thing about Liveslots is that user code looks pretty close to regular non-distributed code. Objects are retained (protected against garbage collection) by virtue of being referenced by external vats, starting with the "root occupant" (aka "Object 0") as created by the `buildRootObject()` function.

The downside is that we don't have a good way to persist a vat using Liveslots. Since any living object could reference any javascript object, including functions, closures, and iterators, we can't turn the entire vat into data and store it for later resumption. This impacts our ability to use this mechanism on blockchain-based machines, as well as our ability to migrate vats from one kernel to another.

## buildRootObject()

Most SwingSet vats use liveslots (with the notable exception of the comms vat). The stereotypical vat definition file when using Liveslots is:

```js

export buildRootObject(_vatPowers) {
  const obj0 = {
    foo(arg1, arg2) {
      // implement foo
      return 'value';
    },
  };
  return harden(obj0);
}
```

See `static-vats.md`, `dynamic-vats.md`, and `vat-environment.md` in this directory for details.

This function returns the "root object". A remote reference to it will be made available to the bootstrap vat, which can use it to trigger whatever initialization needs to happen.

## Returning New Objects

```js
    foo(arg1) {
      const obj2 = harden({
        bar(arg2) { return 'barbar'; }
      });
      return obj2;
    },
```

## Calling Objects

```js
import { E } from '@agoric/eventual-send';

const p = E(target).foo('arg1');
p.then(obj2 => E(obj2).bar('arg2'))
```

The method name being invoked can be any string, or the special `Symbol.asyncIterator`. All other Symbol-named methods are currently rejected, but see #2612 for plans to accept anything that JavaScript will accept.

## What can be serialized

All objects must be frozen or hardened before serialization.

* Data Objects: when an object's enumerable properties are all non-functions, and the object inherits from either `Object`, `Array`, or `null`, and the object is not empty (there is at least one enumerable property), the object is passed by copy: the receiving end gets an object with all the same enumerable properties and their values. The new object inherits from `Object`. These objects are "selfless": they do not retain object identity, so sending the same pass-by-copy object multiple times will result in values that are not `===` to each other.
* Pass-by-Presence objects: when all of an object's enumerable properties *are* functions, and it inherits from either `Object`, `null`, or another pass-by-presence object, the object is passed by presence. The receiving end gets a special Presence object, which can be wrapped by `E(presence)` to make method calls on the original object.
* plain data: anything that JSON can handle will be serialized as plain data, including Arrays, numbers (including -0, `NaN`, `Infinity`, `-Infinity`, and BigInts), some Symbols, and `undefined`.

Some useful things cannot be serialized: they will trigger an error.

* Functions: this may be fixed, but for now only entire objects are pass-by-presence, and bare functions cause an error. This includes resolvers for Promises.
* Promises: this needs to be fixed soon
* Mixed objects: objects with both function properties and non-function properties. We aren't really sure how to combine pass-by-presence and pass-by-copy.
* Non-frozen objects: since the receiving end would not automatically get updated with changes to a non-frozen object's properties, it seems safer to require that all values be frozen before transmission

Uncertain:

* Maps: This might actually serialize as pass-by-presence, since it has no non-function properties (in fact it has no own properties at all, they all live on `Map.prototype`, whose properties are all functions). The receiving side gets a Presence, not a Map, but invoking e.g. `E(p).get(123)` will return a promise that will be fulfilled with the results of `m.get(123)` on the sending side.
* WeakMaps: same, except the values being passed into `get()` would be coming from the deserializer, and so they might not be that useful.

## How things get serialized

* pass-by-presence objects: `{@qclass: "slot", index: slotIndex}`
* local Promises: passed as a promise
* promise returned by `E(p).foo()`: passes as a promise, with pipelining enabled
* Function: rejected (todo: wrap)

## Garbage Collection vs Metering

When a swingset kernel is part of a consensus machine, the visible state must be a deterministic function of userspace activity. Every member kernel must perform the same set of operations.

However we are not yet confident that the timing of garbage collection will remain identical between kernels that experience different patterns of snapshot+restart. In particular, up until recently, the amount of "headroom" in the XS memory allocator was reset upon snapshot reload: the new XS engine only allocates as much RAM as the snapshot needs, whereas before the snapshot was taken, the RAM footprint could have been larger (e.g. if a large number of objects we allocated and then released), leading to more "headroom". Automatic GC is triggered by an attempt to allocate space which cannot be satisfied by this headroom, so it will happen more frequently in the post-reload engine than before the snapshot. See issues #3428, #3458, and #3577 for details.

To accommodate differences in GC timing between kernels that are otherwise operating in consensus, liveslots uses an "unmetered box": a span of execution that does not count against the meter. We take all of the liveslots operations that might be sensitive to the engine's GC behavior and put them "in" the box.

This includes any code that calls `deref()` on the WeakRefs used in `slotToVal`, because the WeakRef can change state from "live" to "dead" when GC is provoked, which is sensitive to more than just userspace behavior.
