import { Far } from '@agoric/marshal';

export function buildRootObject(_vatPowers) {
  return Far('root', {
    hello() {
      console.log(`=> Somebody said hello to Bob`);
      return 'hi there!';
    },
  });
}
