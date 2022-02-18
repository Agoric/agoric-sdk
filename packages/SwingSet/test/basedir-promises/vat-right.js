import { Far } from '@endo/marshal';

export const buildRootObject = vatPowers =>
  Far('root', {
    bar: arg2 => {
      vatPowers.testLog(`right ${arg2}`);
      return 4;
    },
  });
