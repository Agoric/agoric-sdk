/* eslint-disable import/no-extraneous-dependencies */
import '@endo/init/pre-remoting.js';

lockdown({
  __allowUnsafeMonkeyPatching__: 'unsafe',
  errorTaming: 'unsafe',
  overrideTaming: 'severe',
});

// Even on non-v8, we tame the start compartment's Error constructor so
// this assignment is not rejected, even if it does nothing.
Error.stackTraceLimit = Infinity;
