import { Far } from '@agoric/marshal';

export function buildRootObject(_vatPowers) {
  return Far('root', {
    acceptPromise(_p) {
      console.log('Alice got p');
    },
  });
}
