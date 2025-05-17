# swingset-xsnap-supervisor

This package provides the bundle necessary to convert an `xsnap` SES environment into a SwingSet vat worker.

The basic xsnap package ([@agoric/xsnap](../xsnap)) provides two components. The first is the `xsnap` executable, which embeds the XS JavaScript engine inside a driver program that listens for commands on a socket. The second is a library which can launch that program as a child process, and sends/receives messages over the socket. The `@agoric/xsnap` API lets you perform three basic operations on the worker: evaluate a string of code, deliver a string to a globally-registered handler function, and instruct the XS engine to write out a heap snapshot.

However this is not quite sufficient for use as a vat host, which needs a SES environment which can accept vat deliveries and issue syscalls. To build something more suitable, we need additional layers:

* We must evaluate a "lockdown" bundle within the worker, transforming it from plain (unsecured) JS to our preferred Endo environment. This tames the global constructors, adds the `Compartment` constructor, and removes ambient authority. It also creates a `console` object around the basic XS `print` function.
* Then, we need to install a "supervisor" (i.e. evaluate the supervisor bundle), which hooks into the globally-registered handler function to accept delivery messages. The supervisor includes the "liveslots" code, which constructs an object-capability environment with messages routed through syscalls, as well as virtual/durable object support (through the vat-data package).
* Finally, we'll install the actual vat bundle and run its `buildRootObject()` function.

This package provides the "supervisor" bundle, which incorporates liveslots and the delivery/syscall management path. It also builds a special console object that sends any logged messages back to the kernel (for logging or display from the kernel's stdout, rather than the worker's).

The bundle is generated at build time, so the contents are fixed for any given version of the `@agoric/swingset-xsnap-supervisor` package. The exported API includes a function which returns the supervisor bundle contents.

## Bundle Stability

The main purpose of this `@agoric/swingset-xsnap-supervisor` package is to maintain the stability of the supervisor bundle, even when the versions of other components (XS, `xsnap`, the lockdown bundle, or the kernel) might change. Deterministic execution is critical for a consensus/blockchain application, and a kernel upgrade should not accidentally cause the contents of the supervisor bundle to change.

When the Endo source bundler is used, with `{ moduleFormat: 'endoZipBase64' }`, the generated bundles include package names and version numbers of all the source files in the transitive import graph starting from the entry point. This means the bundle contents are sensitive to version-number changes, even if the code itself remains the same.

The supervisor bundle does not use this format: the initial `xsnap` environment does not yet have a loader for `endoZipBase64`-format bundles, so instead we use `nestedEvaluate`, which is fairly easy to evaluate into place. This format does not include as much metadata (like version numbers), nevertheless using a separate package for the bundle makes it easier to maintain stability of the contents.

## API

Bundles are JS Objects with a `moduleFormat` property (a string), and then a few other properties that depend on the module format. The `nestedEvaluate` format includes a `.source` property (a large string, suitable for IIFE evaluation) and sometimes a `.sourceMap` property. We can also JSON-serialize the bundle for storage in a single string, on disk or in a database.

The primary job of this package is to provide the supervisor bundle in a form that can be delivered to the `xsnap` process for evaluation in its "Start Compartment". So the primary API is a `getSupervisorBundle()`, which returns the JS Object form.

```js
import { getSupervisorBundle } from '@agoric/swingset-xsnap-supervisor';
const bundle = await getSupervisorBundle();

assert.equal(bundle.moduleFormat, 'nestedEvaluate');
await worker.evaluate(`(${bundle.source}\n)()`.trim());
```

To help detect version drift or build/import problems, the package also exports a function to get the hex-encoded SHA256 hash of the JSON-stringified bundle. This should be identical to running `/usr/bin/shasum -a 256` on the pathname recorded in the internal `bundlePaths.supervisor` (typically `swingset-xsnap-supervisor/bundles/supervisor.bundle`). Clients which have selected a particular version of `@agoric/swingset-xsnap-supervisor` in their `package.json` can retrieve this hash at import time and compare it against a hard-coded copy, to assert that their preferred version is actually in use. Such clients would need to update their copy of the hash each time they deliberately switch to a different version.

```js
import { getSupervisorBundleSHA256 } from '@agoric/swingset-xsnap-supervisor';
const expected = '54434e4a0eb0c2883e30cc43a30ac66bb792bec3b4975bb147cb8f25c2c6365a';
assert.equal(await getSupervisorBundleSHA256(), expected, 'somehow got wrong version');
```
## Bundle Generation

If you have a source tree, you must run `yarn build` to generate the bundles, before this package can be used.

The files in `src/` are used to support downstream users who do `import {..} from '@agoric/swingset-xsnap-supervisor'`, and they implement the API described above.  The files in `lib/` are used to create the bundle during `yarn build`, and are *not* directly visible to, or importable by, the downstream users of this package.

This package has no direct dependencies (the `package.json` field named `dependencies` is empty). The input to the bundler comes from `devDependencies`, which are only used at build time.

The intention is that most users of this package will get their copy from the NPM registry.

We will figure out a different approach for "dev" development, where downstream clients want to use unstable/recent versions instead. Follow https://github.com/Agoric/agoric-sdk/issues/7056 for details.
