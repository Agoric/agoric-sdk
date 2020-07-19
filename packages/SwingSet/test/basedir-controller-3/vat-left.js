/* global harden */
import { E } from '@agoric/eventual-send';

console.log(`left loaded`);

export default function setup(syscall, state, helpers, vatPowers0) {
  helpers.testLog(`left.setup called`);
  return helpers.makeLiveSlots(
    syscall,
    state,
    vatPowers =>
      harden({
        foo(arg1, right) {
          vatPowers.testLog(`left.foo ${arg1}`);
          E(right).bar(2, right);
        },
      }),
    helpers.vatID,
    vatPowers0,
  );
}
