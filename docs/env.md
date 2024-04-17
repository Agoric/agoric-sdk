# Agoric SDK Environment Variables

```js
process.env.DOCUMENTATION // for power users
```

This file describes environment variables that influence the execution of the
Agoric SDK.

<!--
## Template

**Add to a new section in alphabetical order.**

Affects:

Purpose:

Description:

Lifetime:

-->

## CHAIN_BOOTSTRAP_VAT_CONFIG

Affects: `ag-chain-cosmos`, `ag-solo`

Purpose: to set the specifier for the chain/sim-chain's `vatconfig.json`

Description: defaults to `@agoric/vm-config/decentral-core-config.json`

Lifetime: until we don't want to allow user control of the chain's vat config

## CXXFLAGS

Affects: yarn, agoric install

Purpose: add compilation flags to Node.js C++ addons

Description: defaults to `-std=c++14` if not set (empty string doesn't default)

Lifetime: probably forever (until all supported Node versions work with
`CXXFLAGS=''`)

## DEBUG

Affects: agoric (CLI), ag-chain-cosmos, ag-solo

Purpose: to change the meaning of `console.log` and other console methods

Description: uses `anylogger` to change whether the following methods are active
for a given context, in order of increasing severity:

1. `console.debug`
2. `console.log`
3. `console.info`
4. `console.warn`
5. `console.error`

If `$DEBUG` is unset or non-empty, then default (`console.log` and above) logging is enabled.  (`console.debug` logging is disabled.)

If `$DEBUG` is set to an empty string, then quiet (`console.info` and above) logging is enabled.
(`console.log` and `console.debug` logging is disabled.)

Otherwise, set to a comma-separated list of strings.

If one of those strings is
- `agoric:${level}`, then don't print `agoric-sdk` console messages below `${level}`.
- `agoric:none`, then silence all `agoric-sdk` console messages.
- `agoric` (an alias for `agoric:debug`) print all `agoric-sdk` console messages.
- `track-turns`, then log errors at the top of the event-loop that may otherwise be unreported. See also the TRACK_TURNS environment variable below.
- `label-instances`, then log exo instances with a unique label per instance. HAZARD This causes an information leak in the messages of thrown errors, which are available even to code without access to the console. Use with care.

For each of those strings beginning with a prefix recognized as indicating what
console messages to enable, pass it to `makeConsole`. For example:

- `DEBUG=SwingSet:ls` enable all console messages for liveslots, regardless of vat.
- `DEBUG=SwingSet:ls:v13` enable for liveslots in vat 13.
- `DEBUG=SwingSet:vat` enable for user code, regardless of vat.
- `DEBUG=SwingSet:vat,SwingSet:ls` enable for liveslots and user code, all vats

## ENDO_DELIVERY_BREAKPOINTS

The value of this option should be a JSON string identifying for which
eventual-send message deliveries should a JS `debugger;` statement be executed.
The format of the JSON string is
```json
{
  <class-like>: {
    <method-like>: <countdown>,
    <method-like>: <countdown>,
    ...
  },
  <class-like>: {
    <method-like>: <countdown>
    ...
  },
  ...
}
```
Where
- `<class-like>` is either `"*"` or an alleged string tag of the receiving
   remotable (exo or far) object
- `<method-like>` is either `"*"` or a method name. There is not yet a syntax for symbols to name symbol-named methods, but there may eventually be.
- `<countdown>` is either `"*"` or a non-negative integer saying how many occurrences to ignore before breakpointing.

When the program is run under a debugger, it will breakpoint when the JS
`debugger;` statement is executed. When run normally without a debugger, the
`debugger;` statement will have no effect. The `debugger;` statement
is executed *before* the method is entered.

See https://github.com/endojs/endo/blob/master/packages/pass-style/test/prepare-breakpoints.js for an example.

## ENDO_SEND_BREAKPOINTS

The value of this option is a JSON string identifying for which eventual sends
should a JS `debugger;` statement be executed. The format is the same as
shown for `ENDO_DELIVERY_BREAKPOINTS` above, but the breakpoint happens
when and where the message is sent, rather than when and where it is delivered.

## END_BLOCK_SPIN_MS

Affects: cosmic-swingset

Purpose: simulating load to explore scalability of the Cosmos SDK.

Description: Number of milliseconds to busy-wait during every block's
end-of-block processing for `ag-chain-cosmos` and the sim-chain.

Lifetime: until we have a more consistent load testing regimen

## FAKE_CURRENCIES

Affects: cosmic-swingset

Purpose: allow the creation of pretend tokens

Description: When nonempty, create pretend prepopulated tokens like "moola" and
"simoleans".

Lifetime: until chain is mature enough not to need any pretend tokens

## LOCKDOWN_*

For the environment variables beginning with `LOCKDOWN_` , see [`lockdown` Options](https://github.com/endojs/endo/blob/master/packages/ses/docs/lockdown.md).

## ONLY_WELL_FORMED_STRINGS_PASSABLE

As part of the OCapN standards process, we have agreed that only so-called
"well formed" unicode strings should be considered `Passable`. However, we are
not yet confident about the performance impact of enforcing this ban, so it
is `"disabled"` by default for now. To turn it on, set this option to `"enabled"`.
See https://github.com/endojs/endo/blob/master/packages/pass-style/NEWS.md#v130-2024-03-19 for more explanation.

## OTEL_EXPORTER_PROMETHEUS_PORT

Affects: cosmic-swingset

Purpose: enabling Prometheus metrics exports

Description: When either is set, these are the host IP and port number to use
for the Prometheus scrape endpoint to export telemetry.

Lifetime: until we decide not to support Prometheus for metrics export

## SOLO_BRIDGE_TARGET

Affects: solo

This enables a proxy so that the solo bridge interface (/wallet-bridge.html) is backed by the smart wallet (/wallet/bridge.html). Dapps designed for the solo bridge can enable this until they connect to the smart wallet directly.

```sh
BRIDGE_TARGET=http://localhost:3001 make BASE_PORT=8002 scenario3-run
```

Lifetime: smart wallet transition period

## SOLO_MNEMONIC

Affects: solo init

Seed phrase for HD key derivation.

## SOLO_OTEL_EXPORTER_PROMETHEUS_PORT

Affects: solo

Same as `OTEL_EXPORTER_PROMETHEUS_PORT`, but for solo instead of chain.

Lifetime: ?

## SOLO_SLOGFILE

Same as `SLOGFILE`, but for solo instead of chain.

Lifetime: ?

## SOLO_SLOGSENDER

Same as `SLOGSENDER`, but for solo instead of chain.

Lifetime: ?

## SOLO_MAX_DEBUG_LENGTH

Affects: solo

Purpose: reduce the size of each individual `console.debug` output

Description: defaults to no limit, set to a decimal byte count to reduce the
output

Lifetime: Until CI no longer balks on long output, or our source bundles aren't delivered via messages to the sim-chain

## SLOGFILE

Affects: cosmic-swingset

Purpose: record an on-chain Swingset LOG file

Description: when nonempty, use the value as an absolute path to which SwingSet
debug logs should be written.

Lifetime: ?

## SLOGSENDER

Affects: cosmic-swingset

Purpose: intercept the SwingSet LOG file in realtime

Description: when nonempty, use the value as a list of module specifiers
separated by commas `,`.  The modules will be loaded by
`@agoric/telemetry/src/make-slog-sender.js`, via `import(moduleSpec)`, and
their exported `makeSlogSender` function called to create an aggregate
`slogSender`. Every time a SLOG object is written by SwingSet, each module's
`slogSender(slogObject)` will be called.

The default is `'@agoric/telemetry/src/flight-recorder.js'`, which writes to an
mmap'ed circular buffer.

## SLOGSENDER_AGENT

Affects: cosmic-swingset

Purpose: selects the agent type used to handle the SwingSet LOG

Description: if empty or `'self'` slog senders are loaded in the same process
and thread as the SwingSet kernel. If `'process'`, slog senders are loaded in a
sub-process which receives all SLOG events over an IPC connection.

The default is `'self'`.

## SLOGSENDER_FAIL_ON_ERROR

Affects: cosmic-swingset

Purpose: causes failures of the slogSender to be fatal

Description: if set (to a non empty value), a failure of the slogSender flush
operation will result in a rejection instead of mere logging. Can be used to
validate during tests that complex slog senders like the otel converter do not
have any unexpected errors.

The default is `undefined`.

## SWINGSET_WORKER_TYPE

Affects: solo, unit tests

Purpose: select the default Worker type (default `local`)

Description: The SwingSet kernel launches each vat into a "worker" of a
particular type. The `local` workers run in the same Node.js process as the
kernel (which facilitates debugging). The `xsnap` workers run in a child
process under the XS engine (which provides metering and heap snapshots, as
well as more consistent GC behavior). `xs-worker` is an alias for `xsnap`.

Applications and unit tests may specify which type of worker they use for all
vats in their `config.defaultManagerType` record, especially if they need a
specific type for some reason. If they do not specify it there, the environment
variable will supply a default. The full hierarchy of controls are:

* config.vats.NAME.creationOptions.managerType (highest priority, but
                                                only for static vats)
* config.defaultManagerType (applies to both static and dynamic vats)
* env.SWINGSET_WORKER_TYPE
* use a 'local' worker (lowest priority)

The environment variable exists so CI commands (e.g. 'yarn test:xs') can run a
batch of unit tests under a different worker, without editing all their config
records individually. `config.defaultManagerType` has a higher priority so that
tests which require a specific worker (e.g. which exercise XS heap snapshots,
or metering) can override the env var, so they won't break under `yarn
test:xs`.

## TRACK_TURNS

Log the deep causality stack behind logged errors if possible. See also the
`DEBUG` setting `DEBUG=track-turns` above.
