import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

export const buildRootObject = _vatPowers =>
  Far('root', {
    bootstrap: async vats => {
      const pa = E(vats.bob).genPromise1();
      const pb = E(vats.bob).genPromise2();
      E(vats.bob).usePromises([pa], [pb]);
      E(vats.alice).acceptPromise(pa);
    },
  });
