// This is like `@agoric/install-ses` but sacrificing safety to optimize
// for debugging and testing. The difference is only the lockdown options.
// The setting below are *unsafe* and should not be used in contact with
// genuinely malicious code.

// See
// https://github.com/endojs/endo/blob/master/packages/ses/lockdown-options.md
// for more explanation of these lockdown options.

import 'ses';
import '@agoric/eventual-send/shim';

lockdown({
  // The default `{errorTaming: 'safe'}` setting, if possible, redacts the
  // stack trace info from the error instances, so that it is not available
  // merely by saying `errorInstance.stack`. However, some tools will look
  // for the stack there and become much less useful if it is missing.
  //
  errorTaming: 'unsafe',

  // The default `{overrideTaming: 'moderate'}` setting does not hurt the
  // debugging experience much. But it will introduce noise into, for example,
  // the vscode debugger's object inspector. During debug and test, if you can
  // avoid legacy code that needs the `'moderate'` setting, then the `'min'`
  // setting reduces debugging noise yet further, by turning fewer inherited
  // properties into accessors.
  //
  overrideTaming: 'min',

  // The default `{stackFiltering: 'concise'}` setting usually makes for a
  // better debugging experience, but severely reducing the noisy distractions
  // of the normal verbose stack traces. Which is why the alternative
  // `'verbose'` setting is commented out below. However, the actual cause
  // of the bug may be anywhere, so the `'noise'` thrown out by the default
  // `'concise'` setting may also contain the signal you need. To see it,
  // uncomment out the following line. But please do not commit it in that
  // state.
  //
  // NOTE TO REVIEWERS: If you see the following line *not* commented out,
  // this may be a development accident that should be fixed before merging.
  //
  // stackFiltering: 'verbose',

  // The default `{consoleTaming: 'safe'}` setting usually makes for a
  // better debugging experience, by wrapping the original `console` with
  // the SES replacement `console` that provides more information about
  // errors, expecially those thrown by the `assert` system. However,
  // in case the SES `console` is getting in the way, we provide the
  // `'unsafe'` option for leaving the original `console` in place.
  //
  // consoleTaming: 'unsafe',
});

Error.stackTraceLimit = Infinity;

harden(TextEncoder);
harden(TextDecoder);
