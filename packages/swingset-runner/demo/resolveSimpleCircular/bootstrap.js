import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

console.log(`=> loading bootstrap.js`);

export function buildRootObject(_vatPowers) {
  return Far('root', {
    bootstrap(vats) {
      const pa = E(vats.bob).genPromise();
      E(vats.bob).usePromise([pa]);
    },
  });
}
