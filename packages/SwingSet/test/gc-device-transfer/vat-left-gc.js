import { Far } from '@endo/far';

export function buildRootObject() {
  return Far('left', {
    async forget(_amy) {
      // just drop the argument
    },
  });
}
