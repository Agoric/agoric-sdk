import { Far } from '@endo/far';

export function buildRootObject() {
  return Far('root', {
    hello() {
      console.log(`=> Somebody said hello to Bob`);
      return 'hi there!';
    },
  });
}
