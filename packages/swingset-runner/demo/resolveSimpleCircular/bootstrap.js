import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

console.log(`=> loading bootstrap.js`);

export const buildRootObject = _vatPowers =>
  Far('root', {
    bootstrap: vats => {
      const pa = E(vats.bob).genPromise();
      E(vats.bob).usePromise([pa]);
    },
  });
