// In our system (at least for now), we make a distinction between callable
// objects and non-callable data. Attempting to send a message to data will
// throw an error. This function provides a consistent definition of this
// error message, for the use of the kernel and the comms vat. The capdata it
// returns can be used in a `notify` on the rejection promise.

// Within a vat, the native JavaScript behavior (e.g. `const obj = {};
// obj.foo()`) would be TypeError with a message like "obj.foo is not a
// function", which gleans "obj" from the name of the variable that held the
// target. We have no idea what the caller used to name their target, and the
// "data is not callable" error is kind of unique to the way swingset handles
// references, so we create a distinct error message.

import { kunser, kser } from '@agoric/kmarshal';

export function makeUndeliverableError(methargs) {
  const method = kunser(methargs)[0];
  return kser(TypeError(`data is not callable, has no method ${method}`));
}
