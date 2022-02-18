import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

export const buildRootObject = _vatPowers =>
  Far('root', {
    bootstrap: vats => {
      const pa = E(vats.alice).genPromise();
      const pb = E(vats.bob).genPromise();
      E(vats.alice).usePromise([pb]);
      E(vats.bob).usePromise([pa]);
    },
  });
