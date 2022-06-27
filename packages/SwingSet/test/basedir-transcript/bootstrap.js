import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
const { details: X } = assert;

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
        assert.fail(X`unknown mode ${mode}`);
      }
    },
  });
}
