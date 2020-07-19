/* global harden */
import { E } from '@agoric/eventual-send';

console.log(`left loaded`);

export default function setup(syscall, state, helpers) {
  const { log } = helpers;
  log(`left.setup called`);
  return helpers.makeLiveSlots(
    syscall,
    state,
    _vatPowers =>
      harden({
        foo(arg1, right) {
          log(`left.foo ${arg1}`);
          E(right).bar(2, right);
        },
      }),
    helpers.vatID,
  );
}
