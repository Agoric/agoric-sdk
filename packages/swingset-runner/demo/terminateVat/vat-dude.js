import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject(vatPowers) {
  let count = 0;
  return Far('root', {
    async elsewhere(other) {
      const val = await E(other).query();
      console.log(`other returns ${val}`);
    },
    dude(truth) {
      if (truth) {
        count += 1;
        return `DUDE${'!'.repeat(count - 1)}`;
      } else {
        throw Error('Sorry, dude');
      }
    },
    dieHappy(completion) {
      vatPowers.exitVat(completion);
    },
    dieSad(reason) {
      vatPowers.exitVatWithFailure(reason);
    },
  });
}
