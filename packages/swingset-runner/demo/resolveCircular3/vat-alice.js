import { Far } from '@endo/marshal';

export function buildRootObject() {
  return Far('root', {
    acceptPromise(_p) {
      console.log('Alice got p');
    },
  });
}
