import { Far } from '@endo/marshal';

export const buildRootObject = _vatPowers =>
  Far('root', {
    hello: () => {
      console.log(`=> Somebody said hello to Bob`);
      return 'hi there!';
    },
  });
