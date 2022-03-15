User-visible changes in SwingSet:

## Release 0.3.0 (06-Nov-2019)

* change Command Device (`buildCommand()`) to take `broadcastCallback` as an
  argument, rather than set in a subsequent call (#185)
* outsource vat/kernel source bundling with @endo/bundle-source


## Release 0.2.0 (27-Oct-2019)

* add TimerVat (#178)
* buildStorageInMemory: expose the Map too (#144)


## Release 0.1.0 (16-Oct-2019)

* update to SES-0.6.4 to fix a sandbox breach


## Release 0.0.27 (08-Oct-2019)

* Rewritten state management: hosts must now provide a "HostStorage" object
  in the config record, and the kernel will use it for all state changes.
  This HostStorage can be implemented with an in-memory Map object, or a
  proper on-disk database. Hosts commit per-block checkpoints through their
  HostStorage object, rather than asking the controller for the current
  kernel state. (#144)
* Fixed infinite loop caused by `x~.foo~.bar()` on a Presence `x`. This
  performs an asynchronous property lookup followed by a method invocation,
  and should behave mostly like `Promise.resolve(x).then(y => y.foo).then(z
  => z.bar())`, except that `x` references a remote object, so cross-Vat
  message sends are involved. Caused by
  https://github.com/Agoric/eventual-send/issues/38 , fixed by updating to
  eventual-send-0.4.0 .


## Release 0.0.26 (02-Oct-2019)

* update eventual-send to fix bugs revealed in cosmic-swingset testing (#169)


## Release 0.0.25 (02-Oct-2019)

* update to SES-0.6.3 to fix a sandbox breach
* Vat code can now `import { E } from '@endo/eventual-send'`, in addition
  to receiving the `E` wrapper function from the liveSlots `createRootObject`
  call. This allows downstream Vat code (like ERTP) to run unit tests without
  SwingSet, by importing E like any other dependency. Note that `D` (used to
  invoke device nodes) is not importable in this fashion. (#166)
* Vat code can now use async property get with `x.~foo`, which will behave
  somewhat like `Promise.resolve(x).then(obj => obj.foo)`. This does not
  pipeline yet, but watch #167 for progress in fixing this. (#165)
* internal state-management improvements


## Release 0.0.24 (26-Sep-2019)

* update to @agoric/(evaluate,default-evaluate-options,eventual-send), to
  allow wavy-dot in Vat code (and code evaluated by Vats) too. (#163)


## Release 0.0.23 (25-Sep-2019)

* Add a "Timer Device", which allows authorized objects to receive a message
  at some specified point in the future. This requires support from the host,
  to call a `poll(now)` function on a periodic basis. (#123)
* Use (mostly) numeric vatID/deviceIDs within the kernel, instead of
  user-provided names, to support upcoming dynamic (unnamed) vats and more
  efficient state representation. (#146)
* Include the sourceURL line in bundled sources (vats and the kernel), which
  should improve stack traces and debugger support. (#158)
* Switch from infix-bang (`x!foo()`) to wavy-dot (`x~.foo()`) syntax, because
  infix-bang conflicted with certain Typescript annotations. Wavy-dot can
  also be pronounced "tildot" (tilde-dot), "twiddledot", or by the
  INTERCAL-specified "squigglespot".
* Doc updates (#155)


## Release 0.0.22 (18-Sep-2019)

* Upgrade to SES v0.6.1, which closes a sandbox escape discovered by @XmiliaH
  in https://github.com/Agoric/realms-shim/issues/48
* The syscall/dispatch API was changed to use a consistent "CapData"
  structure for all arguments, promise resolution data, and device-invocation
  return values. This structure contains exactly `{ body, slots }`, where
  "body" is a string (JSON-serialized object graph), and "slots" is an array
  of VatSlot identifiers (like `o+123` for an exported object, or `p-42` for
  an imported Promise). The signature of `syscall.send()` was changed from
  `send(target, method, argsString, vatSlots, result)` to `send(target,
  method, args, result)`. This also updates the signatures for
  `syscall.fulfillToData`, `syscall.reject`, `syscall.callNow`,
  `dispatch.deliver`, `dispatch.notifyFulfillToData`,
  `dispatch.notifyReject`, and (for devices) `dispatch.invoke`. OCap-style
  "vat code" should not notice these changes, as the "liveSlots" layer was
  updated to match, but non-OCap-style vats must change to use the new
  format.
* The kernel now tolerates Vats (and Devices) which export more than the
  single default "setup" function. This is useful for writing unit tests that
  want to exercise the internals of the device. Previously, naming problems
  prevented the use of vat modules that had both default and named exports.


## Release 0.0.21 (09-Sep-2019)

* Enable "Promise Pipelining" between remote SwingSet machines connected by
  Comms Vats. When a vat on the first machine does `x!foo()!bar()!baz()` to
  an object "x" on the second machine (i.e. `bar` is sent to whatever object
  `foo` returns), all three calls will be delivered to the second machine in
  a single batch, rather than waiting for each promise to resolve before
  delivering the next message. This amortizes the inter-machine latency and
  is a critical performance improvement enabled by the ocap/Promise
  architecture.
* Extensive rewrite of the vat/kernel interface and run-queue, to represent
  objects and promises more concisely, and enable pipelining.
* Upgrade to `@agoric/default-evaluate-options` and `@endo/eventual-send`
  to get a "HandledPromise" that supports pipelining.
* Rewrote the comms layer to encode remote messages more concisely, and
  support pipelining.
* Change `buildVatController` API, add per-vat options like
  `enablePipelining`, currently only used for the comms vat.
* Change the `vattp` and `comms` vat APIs for configuring new remote machines
  and adding ingress/egress objects.


## Release 0.0.20 (03-Sep-2019)

* Update dependencies (including ses-0.6.0).
* Allow use of Node.js v11 again
* fix `bin/vat`
* Improve `eval()` options available to Vat code via
  `require('@agoric/evaluate')`. The previous version only offered
  `evaluateExpr` and `evaluateProgram`, which evaluate expressions and
  programs in a frozen environment, so assignments to global variables is an
  error. In the new version, this import also provides `makeEvaluators`,
  which Vat code can use to build a new compartment with non-frozen globals:

```js
const { makeEvaluators } = require('@agoric/evaluate');
// both evaluateProgram and evaluateExpr operate on the same Compartment
const { evaluateProgram, evaluateExpr } = makeEvaluators({sloppyGlobals: true});
evaluateProgram('a = 4');
evaluateExpr('a+1') === 5; // true
```


## Release 0.0.19 (06-Aug-2019)

* Rewrite persistence to be much more efficient. (#94)
* Update to @agoric/evaluate-1.3.0 . This adds `evaluateModule`, but only in
  `--no-ses` mode for now.
* Update to ses-0.5.3, which re-enables indirect eval


## Release 0.0.18 (31-Jul-2019)

* Downgrade to @endo/eventual-send-0.1.11 via @agoric/default-evaluate-options.
  The @endo/eventual-send-0.2.0 release had some serious problems with
  memory exhaustion.


## Release 0.0.17 (31-Jul-2019)

* All Promises returned by `E(x).foo()` are now hardened. Previously this was
  inconsistent. The Promise returned by `x!foo()` is *not* hardened. The
  arguments of eventual-send calls are eventually hardened as a side-effect
  of the send, but probably not until some future turn. #95
* Upgrade to @endo/eventual-send-0.2.0, to support that hardening.
* "Presences" (the `x` in `E(x).foo()`) now have a useful `.toString()`
  method, and the previous `_importID_NN` method was removed. (#98)
* Require Node.js v12 or higher. (#99)


## Release 0.0.16 (24-Jul-2019)

* New `@agoric/evaluate` API. Vat code which needs to safely evaluate strings
  as code can now choose between `evaluateExpr` and `evaluateProgram` (the
  default export remains `evaluateExpr`). Javascript distinguishes between
  expression syntax (like `1+2`, but not sequences of statements like `let a
  = 1; a+2`) and program syntax (which allows any top-level form, and
  evaluates to the last form in the string). If your string starts with
  `function ...`, you probably want `evaluateProgram`.
* SwingSet no longer bundles the `@agoric/evaluate` package, needed to
  support evaluation when SES is turned off. This should improve the install
  and upgrade experience for downstream packages that depend upon SwingSet.


## Release 0.0.15 (13-Jul-2019)

* Fix promise-vs-resolver corruption in commsSlots (#87)
* Accept infix-bang syntax: `x!foo(args)` instead of `E(x).foo(args)` (#6)
  * in top-level code, this works in both SES and `--no-ses` modes
  * in nested/runtime `eval()`, this only works in SES mode


## Release 0.0.14 (16-Jun-2019)

* new state-management approach: pass `externalStorage` object into config
* new device-state API


## Release 0.0.13 (12-Jun-2019)

* comms: allow a single kernel import to be published to the egress table
  multiple times (once per remote machine) (#79, #78)


## Release 0.0.12 (07-Jun-2019)

* move ERTP libraries and examples to `@agoric/ertp` (#73)
* move marshalling code into `@endo/marshal`


## Release 0.0.11 (02-Jun-2019)

* new 'command' device for comms usage


## Release 0.0.10 (29-May-2019)

* externalized kvstore to record kernel+vat state
* vattp now acks inbound messages
