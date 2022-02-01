import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject(vatPowers) {
  return Far('root', {
    bootstrap(vats) {
      vatPowers.testLog(`bootstrap.obj0.bootstrap()`);
      E(vats.left).foo(1, vats.right);
    },
  });
}
