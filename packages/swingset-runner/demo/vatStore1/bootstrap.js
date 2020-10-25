import { E } from '@agoric/eventual-send';

export function buildRootObject(_vatPowers) {
  return harden({
    bootstrap(vats) {
      for (let i = 0; i < 5; i += 1) {
        E(vats.bob).doYourStuff(i);
      }
    },
  });
}
