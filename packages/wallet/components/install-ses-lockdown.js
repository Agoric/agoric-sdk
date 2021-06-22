// eslint-disable-next-line import/no-extraneous-dependencies
import 'ses';
import '@agoric/eventual-send/shim';

lockdown({ errorTaming: 'unsafe', stackFiltering: 'verbose' });

// Even on non-v8, we tame the start compartment's Error constructor so
// this assignment is not rejected, even if it does nothing.
// FIXME: The claim is the following should work:
// Error.stackTraceLimit = Infinity;
try {
  Error.stackTraceLimit = Infinity;
} catch (e) {
  console.log('NOTE:', e);
}
