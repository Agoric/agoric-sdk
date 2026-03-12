/* global lockdown */

/**
 * Similar to @endo/lockdown/commit-debug.js, but does not constrain
 * `overrideTaming` to "min" (which is incompatible with dependency
 * "json-rpc-2.0").
 *
 * The console pipeline relies on the default SES causal console remaining in
 * place after lockdown.  Keep `consoleTaming: 'safe'` explicit so future
 * edits do not accidentally bypass causal error expansion before logs are
 * rendered as JSONL.
 *
 * Keep `errorTaming: 'unsafe'` commented out so ordinary `error.stack` is
 * censored.  The causal console can still reveal the hidden stack information
 * before anylogger serializes the rendered output.
 */
lockdown({
  consoleTaming: 'safe',
  // errorTaming: 'unsafe',
  domainTaming: 'unsafe',
});
