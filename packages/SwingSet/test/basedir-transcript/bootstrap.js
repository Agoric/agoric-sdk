import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';
import { assert, details as X } from '@agoric/assert';

export const buildRootObject = (vatPowers, vatParameters) =>
  Far('root', {
    bootstrap: vats => {
      const mode = vatParameters.argv[0];
      if (mode === 'one') {
        E(vats.left)
          .callRight(1, vats.right)
          .then(
            r => vatPowers.testLog(`b.resolved ${r}`),
            err => vatPowers.testLog(`b.rejected ${err}`),
          );
      } else {
        assert.fail(X`unknown mode ${mode}`);
      }
    },
  });
