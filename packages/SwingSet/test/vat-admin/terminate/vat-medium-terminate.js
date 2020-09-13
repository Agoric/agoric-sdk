import { E } from '@agoric/eventual-send';

export function buildRootObject(vatPowers) {
  const { testLog } = vatPowers;

  return harden({
    async speak(target, tag) {
      try {
        await E(target).live();
      } catch (e) {
        testLog(`m: live ${tag} failed: ${e}`);
      }
    },
  });
}
