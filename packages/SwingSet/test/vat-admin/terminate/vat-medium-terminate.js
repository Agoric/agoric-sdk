import { E } from '@endo/eventual-send';
import { Far } from '@endo/far';

export function buildRootObject(vatPowers) {
  const { testLog } = vatPowers;

  return Far('root', {
    async speak(target, tag) {
      try {
        await E(target).live();
      } catch (e) {
        testLog(`m: live ${tag} failed: ${e}`);
      }
    },
  });
}
