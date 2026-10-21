# SwingSet Vat

[![License][license-image]][license-url]

This repository implements an architecture in which Vats run on top of a
"kernel" as if they were userspace processes in an operating system.
Each Vat gets access to a "syscall" object, through which it can send
messages into the kernel. Vats receive message from the kernel via a
"dispatch" function which they register at startup.

See [docs](./docs) for more information.

[SwingSet Runner](../swingset-runner) can be used to explore a SwingSet
instance, as can the simple `vat` utility in this package.

## `vat` CLI

```console
$ yarn install
$ bin/vat run --config demo/encouragementBot/swingset.json
```

### REPL Shell

```console
$ bin/vat shell --config demo/encouragementBot/swingset.json
vat>
```

Shell mode gives you an interactive REPL, just like running `node` without
arguments. All vats are loaded, and three additional commands are added to
the environment:

* `dump()`: display the kernel tables, including the run queue
* `await step()`: execute the next action on the run queue
* `await run()`: keep stepping until the run queue is empty

### Vat Basedirs

`vat` must be called with either a SwingSet configuration file (as above) or a
"basedir" argument containing sources for all the Vats that should be loaded.

Every file named `vat-*.js` (e.g. `vat-foo.js` and `vat-bar-none.js`) will
create a new Vat (with names like `foo` and `bar-none`). Each directory named
`vat-*/` that has an `index.js` will also create a new Vat (e.g.
`vat-baz/index.js`).

In addition, a file named `bootstrap.js` must be present. This will contain
the source for the "bootstrap Vat", which behaves like a regular Vat except:

* At startup, its `bootstrap` method will be invoked, as `bootstrap(argv, vats)`
* The `argv` value will be an array of strings from the command line. So
  running `bin/vat BASEDIR -- x1 x2 x3` will set `argv = ['x1', 'x2', 'x3']`.
* The `vats` value will be an object with keys named after the other Vats
  that were created, and values which are each a Presence for that Vat's root
  object. This allows the bootstrap Vat to invoke the other Vats, and wire
  them together somehow.

The `bootstrap()` invocation is the only way to get anything started: all
other Vats are born without external references, and nothing can be invoked
without an external reference. Those Vats can execute code during their
`setup()` phase, but without Presences they won't be able to interact with
anything else.

## Vat Sources

Each Vat source file (like `vat-foo.js` or `vat-bar.js`) is treated as a
starting point for a bundling process that converts the Vat's source tree
into a single string (so it can be evaluated in a SES realm). This starting
point can use `import` to reference shared local files. No
non-local imports are allowed yet.

The source file is expected to export a `buildRootObject` function that returns
a Vat "root object" managed by [Liveslots](../swingset-liveslots) with which
other vats can interact. It is also possible to bypass the "Live Slots" layer
when the vat options include `enableSetup: true` and are associated with a
`managerType` that supports such bypass (currently limited to "local"), by
exporting a default function named "setup" to be invoked with a `syscall` object
and expected to return a `dispatch` object (see
[BaseVatOptions](./src/types-external.js)).

The "Live Slots" layer provides a function to build `dispatch` out of
`syscall`, as well as a way to register the root object. This requires a few
lines of boilerplate in the `setup` function.

```js
function buildRootObject(E) {
  return harden({
    callRight(arg1, right) {
      console.log(`left.callRight ${arg1}`);
      E(right)
        .bar(2)
        .then(a => console.log(`left.then ${a}`));
      return 3;
    },
  });
}

export default function setup(syscall, state, helpers) {
  const dispatch = helpers.makeLiveSlots(syscall, state, buildRootObject, helpers.vatID);
  return dispatch;
}
```

### Exposed (pass-by-presence) Objects

The Live Slots system enables delivery of inbound messages to local
"[Remotable](https://docs.agoric.com/guides/js-programming/far#pass-styles-and-harden)"
objects.

### Root Objects

The "Root Object" is a Remotable object returned by `buildRootObject()`. It
will be made available to the Bootstrap Vat.

### Sending Messages with Presences

Each Remotable object in the data of inbound messages arrives locally as a
Presence. This is a special (empty) object that represents a non-local
Remotable (i.e., a Remotable hosted by a remote Vat), and can be used to send it
messages via the special `E()` wrapper.

Suppose Vat "bob" defines a Root Object with a method named `bar`. The
bootstrap vat receives this as `vats.bob`, and can send a message like so:

```js
function bootstrap(argv, vats) {
  void E(vats.bob).bar('hello bob');
}
```

### Return Values

Eventual-sends return a Promise for their eventual result:

```js
const fooP = E(bob).foo();
fooP.then(
  fulfillment => console.log('foo said', fulfillment),
  rejection => console.log('foo errored with', rejection),
);
```

### Sending Messages to Promises

Eventual-sends can target a not-yet-fulfilled Promise, deferring invocation of
the method until the Promise fulfills to an object.

If the target Promise rejects, or fulfills to something other than a Remotable
or Presence which supports the method, the method is not invoked and the
eventual-send promise is rejected.

```js
const badP = Promise.reject(Error());
const p2 = E(badP).foo();
p2.then(undefined, rej => console.log('rejected', rej));
// prints 'rejected'
```

### Promise Pipelining

In `fooP = E(bob).foo()`, `fooP` represents the (eventual) return value of
whatever `foo()` executes. If that return value is also a Remotable, it
is possible to queue messages to be delivered to that future target. The
Promise returned by an eventual-send can be used as a target itself, and
the method invoked will be turned into a queued message that won't be
delivered until the first promise resolves:

```js
const db = E(databaseServer).openDB();
const row = E(db).select(criteria)
const success = E(row).modify(newValue);
success.then(res => console.log('row modified'));
```

If you don't care about them, the intermediate values can be discarded:

```js
E(E(E(databaseServer).openDB()).select(criteria)).modify(newValue)
  .then(res => console.log('row modified'));
```

This sequence could be expressed with plain `then()` clauses, but by chaining
them together without `then`, the kernel has enough information to
speculatively deliver the later messages to the Vat in charge of answering
the earlier messages (_if the deciding Vat is configured with
`enablePipelining: true`, which is not currently the case for any
[Liveslots](../swingset-liveslots) Vats_). This avoids unnecessary roundtrips,
by sending the later messages during "downtime" while the target Vat thinks
about the answer to the first one.

This drastic reduction in latency is significant when the Vats are far away
from each other, and the inter-Vat communication delay is large. The SwingSet
container does not yet provide complete facilities for off-host messaging,
but once that is implemented, promise pipelining will make a big difference.

### Presence Identity Comparison

Presences preserve identity as they move from one Vat to another:

* Sending the same Remotable multiple times will deliver the same Presence on
  the receiving Vat
* Sending a Presence back to its "home Vat" will arrive as the original
  Remotable
* Sending a Remotable to two different Vats will result in Presences
  that cannot be compared directly, because those two Vats can only
  communicate with messages. But if those two Vats both send those Presences
  to a third Vat, they will arrive as the same Presence object

Promises are *not* intended to preserve identity. Vat code should not compare
objects for identity until they pass out of a `.then()` resolution handler.

[license-image]: https://img.shields.io/badge/License-Apache%202.0-blue.svg
[license-url]: LICENSE
