import { Far } from '@endo/marshal';

export function buildRootObject() {
  return Far('root', {
    explode() {
      const hugantuous = Array(4e9); // arbitrarily too big
    },
  });
}
