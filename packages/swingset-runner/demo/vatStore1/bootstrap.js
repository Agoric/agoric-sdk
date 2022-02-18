import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

export const buildRootObject = _vatPowers =>
  Far('root', {
    bootstrap: vats => {
      for (let i = 0; i < 5; i += 1) {
        E(vats.bob).doYourStuff(i);
      }
    },
  });
