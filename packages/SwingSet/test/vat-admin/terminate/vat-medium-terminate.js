import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

export const buildRootObject = vatPowers => {
  const { testLog } = vatPowers;

  return Far('root', {
    speak: async (target, tag) => {
      try {
        await E(target).live();
      } catch (e) {
        testLog(`m: live ${tag} failed: ${e}`);
      }
    },
  });
};
