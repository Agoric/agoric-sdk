import { E } from '@agoric/eventual-send';

export function buildRootObject(_vatPowers) {
  return harden({
    bootstrap(vats) {
      const pa = E(vats.bob).genPromise('a');
      const pb = E(vats.bob).genPromise('b');
      E(vats.bob).usePromise('a', [pb]);
      E(vats.bob).usePromise('b', [pa]);
    },
  });
}
