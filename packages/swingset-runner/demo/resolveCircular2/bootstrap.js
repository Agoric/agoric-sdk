import { E } from '@agoric/eventual-send';

console.log(`=> loading bootstrap.js`);

export function buildRootObject(_vatPowers) {
  return harden({
    bootstrap(vats) {
      const pa = E(vats.bob).genPromise1();
      const pb = E(vats.bob).genPromise2();
      E(vats.bob).usePromises([pa], [pb]);
      E(vats.bob).finish();
    },
  });
}
