User-visible changes in SwingSet:

## Release 0.0.17 (31-Jul-2019)

* All Promises returned by `E(x).foo()` are now hardened. Previously this was
  inconsistent. The Promise returned by `x!foo()` is *not* hardened. The
  arguments of eventual-send calls are eventually hardened as a side-effect
  of the send, but probably not until some future turn. #95
* Upgrade to @agoric/eventual-send-0.2.0, to support that hardening.
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
* move marshalling code into `@agoric/marshal`


## Release 0.0.11 (02-Jun-2019)

* new 'command' device for comms usage


## Release 0.0.10 (29-May-2019)

* externalized kvstore to record kernel+vat state
* vattp now acks inbound messages
