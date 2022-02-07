import { Far } from '@endo/marshal';

export function buildRootObject(vatPowers) {
  return Far('root', {
    bar(arg2) {
      vatPowers.testLog(`right ${arg2}`);
      return 4;
    },
  });
}
