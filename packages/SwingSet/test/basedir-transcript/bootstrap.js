import { Fail } from '@endo/errors';
import { E, Far } from '@endo/far';

export function buildRootObject(vatPowers, vatParameters) {
  return Far('root', {
    bootstrap(vats) {
      const mode = vatParameters.argv[0];
      if (mode === 'one') {
        E(vats.left)
          .callRight(1, vats.right)
          .then(
            r => vatPowers.testLog(`b.resolved ${r}`),
            err => vatPowers.testLog(`b.rejected ${err}`),
          );
      } else {
        Fail`unknown mode ${mode}`;
      }
    },
  });
}
