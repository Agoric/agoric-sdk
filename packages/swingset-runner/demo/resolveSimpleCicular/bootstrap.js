/* global harden */

import { E } from '@agoric/eventual-send';

console.log(`=> loading bootstrap.js`);

export function buildRootObject(_vatPowers) {
  return harden({
    bootstrap(argv, vats) {
      const pa = E(vats.bob).genPromise();
      E(vats.bob).usePromise([pa]);
    },
  });
}
