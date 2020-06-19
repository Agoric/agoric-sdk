# The Vat Runtime JS Environment

SwingSet JavaScript Vats are containers that run code in a confined and resource-limited environment, with orthogonal persistence and eventual-send-based access to external resources.

The specific flavor of JavaScript provided by a vat is a frozen SES "Compartment", with a few additions. Most JS environments (Node.js, web browsers) provide a combination of the baseline JavaScript [language globals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects) (`Object`, `Array`, etc) plus some number of "host objects". [Web browsers](https://developer.mozilla.org/en-US/docs/Web/API) offer things like `window`, `fetch`, `WebAssembly`, and `localStorage`, while [Node.js includes](https://nodejs.org/dist/latest-v14.x/docs/api/globals.html) ones like `require`, `process`. and `Buffer`. In general, all IO is provided by the host objects.

SES is a safe deterministic subset of "strict mode" JavaScript, which means it does not include any of these IO objects (they would provide ambient authority, which is not "safe"). It also modifies a few built-in objects to remove non-determinism.

The full list of SES globals (as of SES-0.8.0) is defined in [this list](https://github.com/Agoric/SES-shim/blob/SES-v0.8.0/packages/ses/src/whitelist.js). It includes things like `Object`, `Array`, `Number`, `Map` and `WeakMap`, `Number` and `BigInt`. This is a subset of the baseline JavaScript language globals.

This includes `Math`, but `Math.random` is disabled (calling it throws an error) as an obvious source of non-determinism. Likewise `Date` is included, but `Date.now` throws an error. The remaining `Math` and `Date` features are purely computational and deterministic.

Much of the `Intl` package, and some locale-specifc part of other objects (e.g. `Number.prototype.toLocaleString`) has results which depend upon which locale is configured, and that will vary from one process to another. The way we handle this is still in development. Either these functions will be disabled, or they will act as if they run on a host with a single fixed locale defined by the SES specification.

As SES is on the standards track for JavaScript, it includes several other proposed features. If these features survive the standardization process, future JS environments will include them as global objects, so these objects are made available by the current SES shim as well.

## Additions

`console` is available to vat code as a deliberate addition. It is not part of JavaScript, but it's so important for debugging that leaving it out would cause too much confusion.

`harden` is available as a global. It freezes the API surface (enumerable data properties) of an object. For more details, see https://github.com/Agoric/SES-shim/blob/SES-v0.8.0/packages/harden/README.md .

`HandledPromise` is also a global. The `E` wrapper (`E(target).methodname(args)`) can be imported as `import { E } from '@agoric/eventual-send`. These are defined by the TC39 [Eventual-Send Proposal](https://github.com/tc39/proposal-eventual-send). In addition, "tildot" syntax (`target~.methodname(args)`) can be used by vat code.

`Compartment`, [part of SES](https://github.com/Agoric/SES-shim/tree/SES-v0.8.0/packages/ses#compartment), is a global. Vat code runs inside a Compartment, but vat code can create sub-compartments to host other code (with different globals or transforms). Note that these child Compartments get `harden` and `Compartment`, but they won't include other endowments (like `console` or `HandledPromise`) unless you explicitly provide them. Child compartments will have the metering and tildot transformations applied (these are inescapable). Child compartments will *not* be frozen by default, so if you want to prohibit ambient communication channels through the global scope, you must call `harden(c.globalThis)` before loading any untrusted code into the new compartment.

## Removals

Nearly all existing JS code was written to run under Node.js or inside a browser, so it's easy to conflate the features of these environments with those of the core language itself. As a result, many JavaScript developers may be surprised to learn that e.g. `Buffer` and `require` are not actually a part of the language, but is instead a Node.js addition.

Most of the Node.js-specific [global objects](https://nodejs.org/dist/latest-v14.x/docs/api/globals.html) are not available within a vat:

* `queueMicrotask`
* `Buffer` (consider using TypedArray instead, but see below)
* `setImmediate`/`clearImmediate`: These are not available, but you can generally replace `setImmediate(fn)` with `Promise.resolve().then(_ => fn())` to defer execution of `fn` until some time after the current event/callback has finished processing. But be aware that won't run until after all *other* ready Promise callbacks are executed. There are two queues: the "IO queue" (accessed by `setImmediate`), and the "Promise queue" (accessed by Promise resolution), and SES code is only allowed to add to the Promise queue. Note that the Promise queue is higher-priority than the IO queue, so no IO or timers will be handled until the Promise queue is empty.
* `setInterval` and `setTimeout` (and `clearInterval`/`clearTimeout`): any notion of time must come from exchanging messages with external timer services (the SwingSet environment provides a TimerService object to the bootstrap vat for this purpose, which may or may not be shared with other vats)
* `global` is not defined, use `globalThis` instead
* `process` is not available, e.g. `process.env` for accessing the process's environment variables, or `process.argv` for the argument array
* `URL`, `URLSearchParams` are not available
* `WebAssembly` is not available, as neat as that would be
* `TextEncoder` and `TextDecoder` are not available

Some names look like globals, but are really part of the tools that define modules: imports, exports, and metadata. Modules start as files on disk, but are then bundled together into an archive before being loaded into a vat. Several standard functions are used by the bundling tool to locate all the other modules that must be included. These are not a part of SES, but are allowed in module source code, and are translated or removed before execution finally happens:

* `require`, `module`, `module.exports`, and `exports` are allowed in CommonJS-style modules, and should work as expected. They are either consumed by the the bundling process, provided (in some form) by the execution environment, or otherwise rewritten to work sensibly
* `__dirname` and `__filename` are not provided
* `import` and `export` syntax are allowed in ESM-style modules (the preferred style). These are not globals per se, but rather top-level syntax which defines the module graph.
* The dynamic import expression (`await import('name')`) is currently prohibited in vat code, but a future SES implementation may allow it.

Node.js has a [large collection](https://nodejs.org/dist/latest-v14.x/docs/api/) of "built-in modules", like `http` and `crypto`. Some are clearly platform-specific (like `v8`), while others are not so obvious (`stream`). All of these are accessed by importing a module (`const v8 = require('v8')` in CommonJS modules, or `import v8 from 'v8'` in ESM modules). These modules are built out of native code (C++), not plain JS.

None of these built-in modules are available to Vat code. `require` or `import` can be used on modules that contain pure JS, but not on modules that include native code.

The following objects are present in both Node.js and browsers, but are not a part of core JavaScript, and are therefore not provided in a SES environment:

* `setInterval` and `setTimeout` (and `clearInterval`/`clearTimeout`)
* `URL`, `URLSearchParams`
* `TextEncoder`, `TextDecoder`
* `WebAssembly`

Browser environments also have a huge list of [other features](https://developer.mozilla.org/en-US/docs/Web/API) which are presented as names in the global scope. None of these are available in a SES environment. The most surprising removals include `atob`, `TextEncoder`, and `URL`.

TODO: how is `debugger` handled? I think it works, but I don't think it is a global.

## Other Changes

The [shim](https://github.com/Agoric/SES-shim/) which provides our SES environment is not as fully-featured as a native implemenation could be. As a result, some forms of code cannot be used yet. These restrictions should be lifted once the JS engine you use can provide SES natively:

### HTML Comments

JavaScript parsers may or may not recognize HTML comments within source code, potentially leading to different behavior on different engines. For safety, the SES shim rejects any source code which looks like it might contain a comment open (`<!--`) or close (`-->`) sequence. The filter use a regular expression, not a full parser.

### Dynamic Import Expressions

One active JS feature proposal would add a "dynamic import" expression: `await import('path')`. If the engine implements this, vat code might be able to bypass the Compartment's module map. For safety, the SES shim rejects code that looks like it uses this feature. The regular expression that looks for this pattern can be confused into falsely rejecting legitimate code, usually by having the word `import` in a comment at the end of a line.

### Direct Eval Expressions

A "direct eval", invoked like `eval(code)`, is defined to behave as if `code` were expanded in place. The evaluated code sees the same scope as the `eval` itself sees, so the `code` in:

```js
function foo(code) {
  const x = 1;
  eval(code);
}```

gets to reference `x`. If you perform a direct eval, you cannot hide your internal authorities from the code you're evaluating.

In contrast, an "indirect eval" only gets the global scope, not the local scope. In a safe SES environment, indirect eval is a useful and common tool. The evaluated code can only access global objects, and those are all safe (and frozen). The only bad thing an indirect eval can do is consume unbounded CPU or memory. Once you've evaluated that code, you can give it as many or as few authories as you like, by invoking it with arguments.

The most common way to invoke an indirect eval is like `(1,eval)(code)`.

The SES shim cannot correctly emulate a "direct eval". If it tried, it would wind up performing an indirect eval. This could be pretty confusing, because the code might not actually use objects from the local scope, so you might not notice the problem until some future change altered the behavior.

To avoid confusion, the shim use a regular expression to reject code that looks like it is performing a direct eval. This regexp is not complete (it is possible to trick it into performing a direct eval anyway), but that's ok, because our goal is merely to guide people away from confusing behaviors early in their development process.

This regexp will falsely reject occurrences inside static strings and comments.

### Frozen globalThis

Vats run in a Compartment whose `globalThis` object is frozen. A mutable global object would provide an "ambient communication channel": one side sets `globalThis.heyBuddyAreYouOutThere = 'exfiltrated message'` and the other side periodically reads it. This would violate one of the rules of object-capability security: objects may only communicate through references.

Vats can create new Compartments, and they get to decide whether the new `globalThis` is frozen or not. If the Compartment is meant to support ocap security, the creator should do `harden(c.globalThis)` before loading any code into it.

### Frozen Primordials

SES freezes the "primordials": the built-in JavaScript objects like `Object`, `Array`, and `RegExp`, as well as their prototype chains. This prevents malicious code from changing the behavior of built-ins in surprising ways (imagine `Array.prototype.push` being changed to deliver a copy of its argument to the attacker, or simply ignore certain values). It also prevents the use of e.g. `Object.heyBuddy` as an ambient communication channel.

Both frozen primordials and a frozen `globalThis` will break a few JS libraries that add new features to built-in objects (shims/polyfills). For shims which merely add properties to `globalThis`, it may be possible to load these in a new non-frozen Compartment. Shims which modify primordials can only work if you build new (mutable) wrappers around the default primordials and allow the shims to modify those wrappers instead.

## Library Compatibility

Vat code can use `import` or `require()` to import other libraries, as long as those libraries consist of purely JS code, and are compatible with the SES environment. This includes a significant portion of the NPM registry.

However many NPM packages use built-in Node.js modules. If they use these at import time (in their top-level code), the package cannot be used by vat code: the vat will fail to load at all. If they wait until runtime to use the built-in features, then the package can be loaded, but might fail later when a function is invoked that accesses the missing functionality. As a result, some NPM packages may be partially compatible: you can use them as long as you don't invoke certain features.

The same is true for NPM packages that use missing globals, or attempt to modify frozen primordials.

The SES [wiki](https://github.com/Agoric/SES-shim/wiki) keeps track of compatibility reports for NPM packages, including potential workarounds.
