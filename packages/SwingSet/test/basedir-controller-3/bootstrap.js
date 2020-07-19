/* global harden */
import { E } from '@agoric/eventual-send';

console.log(`loading bootstrap`);

export default function setup(syscall, state, helpers, vatPowers0) {
  helpers.testLog(`bootstrap called`);
  return helpers.makeLiveSlots(
    syscall,
    state,
    vatPowers =>
      harden({
        bootstrap(argv, vats) {
          vatPowers.testLog(`bootstrap.obj0.bootstrap()`);
          console.log(`obj0.bootstrap`, argv, vats);
          E(vats.left).foo(1, vats.right);
        },
      }),
    helpers.vatID,
    vatPowers0,
  );
}
