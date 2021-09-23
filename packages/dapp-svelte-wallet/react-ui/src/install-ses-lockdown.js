/* global process */
import '@agoric/eventual-send/shim.js';

// Lockdown must be handled differently between production and dev.
// In dev, lockdown must be invoked here to let the framework bootstrapping
// code run first, else it breaks.
// In prod, lockdown must be invoked directly in index.html, else the
// transpiler breaks it.
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-undef
  lockdown({
    errorTaming: 'unsafe',
    overrideTaming: 'severe',
  });
}

// Even on non-v8, we tame the start compartment's Error constructor so
// this assignment is not rejected, even if it does nothing.
Error.stackTraceLimit = Infinity;
