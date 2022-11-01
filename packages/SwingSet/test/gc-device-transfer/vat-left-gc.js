import { Far } from '@endo/marshal';

export function buildRootObject() {
  return Far('left', {
    async forget(_amy) {
      // just drop the argument
    },
  });
}
