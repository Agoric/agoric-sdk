import { Far } from '@endo/far';

export function buildRootObject() {
  return Far('root', {
    hang() {
      // eslint-disable-next-line no-empty
      for (;;) {}
    },
  });
}
