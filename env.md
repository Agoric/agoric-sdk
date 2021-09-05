# Inventory of Agoric SDK Environment Variables

```js
process.env.DOCUMENTATION // for power users
```

TODO: Fill out more details!

This file describes environment variables that influence the execution of the
Agoric SDK.  They are documented here as an advanced feature to be kept
up-to-date with the source code.

## Template

**Add to a new section in alphabetical order.**

Affects:

Purpose:

Description:

Lifetime:

## ALLOW_IMPLICIT_REMOTABLES

Affects: marshal

Purpose: to control whether the marshal system demands `Far`

Description: set to `true` if you need to debug problems with missing `Far`
declarations.

Lifetime: until all sources (including dapps) conform to using `Far`
declarations for all remote objects

## DEBUG

Affects: agoric (CLI), ag-chain-cosmos, ag-solo

Purpose: to change the meaning of `console.log` and other console methods

Description: uses `anylogger` to change whether the following methods (in order
of increasing severity) are active for a given context:

1. `console.debug`
2. `console.log`
3. `console.info`
4. `console.warn`
5. `console.error`

If not set, then default (`console.info` and above) logging is enabled.
(`console.log` and `console.debug` logging is disabled.)

If set to an empty string, or running in `ag-chain-cosmos start` mode, don't
print any logs.  This is part of "consensus mode."

If set to a value that contains the substring `agoric`, then print all console
messages for the entire SDK.

Otherwise, set to a comma-separated list of prefixes, where each prefix is the
context given to `makeConsole`.  For example:

- `DEBUG=SwingSet:ls` enable all console messages for liveslots, regardless of vat.
- `DEBUG=SwingSet:ls:v13` enable for liveslots in vat 13.
- `DEBUG=SwingSet:vat` enable for user code, regardless of vat.
- `DEBUG=SwingSet:vat,SwingSet:ls` enable for liveslots and user code, all vats

## END_BLOCK_SPIN_MS

Affects: cosmic-swingset

Purpose: simulating load to explore scalability of the Cosmos SDK.

Description: Number of milliseconds to busy-wait during every block's
end-of-block processing for `ag-chain-cosmos` and the sim-chain.

Lifetime: until we have a more consistent load testing regimen

## NO_FAKE_CURRENCIES

Used by: cosmic-swingset

Purpose: skipping the creation of pretend tokens

Description: When nonempty, don't create pretend prepopulated tokens like
"moola" or "simoleans".

Lifetime: until chain is mature enough not to need any pretend tokens

## OTEL_EXPORTER_PROMETHEUS_HOST
## OTEL_EXPORTER_PROMETHEUS_PORT

Used by: cosmic-swingset

Used for: enabling Prometheus metrics exports

Description: When either is set, these are the host IP and port number to use
for the Prometheus scrape endpoint to export telemetry.

Lifetime: until we decide not to support Prometheus for metrics export

## SOLO_SLOGFILE

Same as SLOGFILE, but for solo instead of chain.

Lifetime: ?

## SLOGFILE

Used by: cosmic-swingset

Purpose: record an on-chain Swingset LOG file

Description: when nonempty, use the value as an absolute path to which SwingSet
debug logs should be written.

Lifetime: ?
