import { Far } from '@endo/marshal';

export function buildRootObject(_vatPowers) {
  return Far('root', {
    getANumber() {
      return 44;
    },
  });
}
