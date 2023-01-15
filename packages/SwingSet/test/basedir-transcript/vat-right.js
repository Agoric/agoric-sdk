import { Far } from '@endo/far';

export function buildRootObject(vatPowers) {
  return Far('root', {
    bar(arg2) {
      vatPowers.testLog(`right ${arg2}`);
      return 4;
    },
  });
}
