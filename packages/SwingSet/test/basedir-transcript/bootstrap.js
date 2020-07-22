/* global harden */
import { E } from '@agoric/eventual-send';

export function buildRootObject(vatPowers) {
  return harden({
    bootstrap(argv, vats) {
      const mode = argv[0];
      if (mode === 'one') {
        E(vats.left)
          .callRight(1, vats.right)
          .then(
            r => vatPowers.testLog(`b.resolved ${r}`),
            err => vatPowers.testLog(`b.rejected ${err}`),
          );
      } else {
        throw Error(`unknown mode ${mode}`);
      }
    },
  });
}
