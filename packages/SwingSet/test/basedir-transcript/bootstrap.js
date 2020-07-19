/* global harden */
import { E } from '@agoric/eventual-send';

console.log(`loading bootstrap`);

function build(log) {
  return harden({
    bootstrap(argv, vats) {
      const mode = argv[0];
      if (mode === 'one') {
        E(vats.left)
          .callRight(1, vats.right)
          .then(
            r => log(`b.resolved ${r}`),
            err => log(`b.rejected ${err}`),
          );
      } else {
        throw Error(`unknown mode ${mode}`);
      }
    },
  });
}

export default function setup(syscall, state, helpers, vatPowers0) {
  helpers.testLog(`bootstrap called`);
  return helpers.makeLiveSlots(
    syscall,
    state,
    vatPowers => build(vatPowers.testLog),
    helpers.vatID,
    vatPowers0,
  );
}
