import { Far } from '@endo/far';

export function buildRootObject() {
  let counter = 0;
  return Far('root', {
    first() {
      counter += 1;
      return counter;
    },
    second() {
      counter += 20;
      return counter;
    },
  });
}
