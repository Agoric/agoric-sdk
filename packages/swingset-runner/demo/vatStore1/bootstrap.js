import { E } from '@endo/eventual-send';
import { Far } from '@agoric/marshal';

export function buildRootObject(_vatPowers) {
  return Far('root', {
    bootstrap(vats) {
      for (let i = 0; i < 5; i += 1) {
        E(vats.bob).doYourStuff(i);
      }
    },
  });
}
