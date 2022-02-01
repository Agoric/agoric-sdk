import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject(_vatPowers) {
  return Far('root', {
    async bootstrap(vats) {
      const pa = E(vats.bob).genPromise1();
      const pb = E(vats.bob).genPromise2();
      E(vats.bob).usePromises([pa], [pb]);
      E(vats.alice).acceptPromise(pa);
    },
  });
}
