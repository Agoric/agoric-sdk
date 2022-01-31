import { Far } from '@endo/marshal';

export function buildRootObject() {
  return Far('root', {
    explode() {
      // eslint-disable-next-line no-unused-vars
      const hugantuous = Array(4e9); // arbitrarily too big
    },
  });
}
