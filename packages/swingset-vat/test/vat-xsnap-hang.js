import { Far } from '@endo/marshal';

export function buildRootObject(_vatPowers) {
  return Far('root', {
    hang() {
      // eslint-disable-next-line no-empty
      for (;;) {}
    },
  });
}
