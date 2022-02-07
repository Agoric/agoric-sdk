import { Far } from '@endo/marshal';

export function buildRootObject(_vatPowers) {
  return Far('left', {
    async forget(_amy) {
      // just drop the argument
    },
  });
}
