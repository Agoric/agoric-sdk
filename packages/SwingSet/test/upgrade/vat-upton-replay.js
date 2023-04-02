import { Far } from '@endo/far';

export function buildRootObject() {
  let counter = 0;

  return Far('root', {
    phase1() {
      counter += 1;
      return counter;
    },

    phase2() {
      counter += 20;
      return counter;
    },

    checkReplay() {
      counter += 300;
      return counter;
    },
  });
}
