import { E } from '@agoric/eventual-send';

export function buildRootObject(_vatPowers) {
  return Far('root', {
    bootstrap(vats) {
      const pa = E(vats.alice).genPromise();
      const pb = E(vats.bob).genPromise();
      E(vats.alice).usePromise([pb]);
      E(vats.bob).usePromise([pa]);
    },
  });
}
