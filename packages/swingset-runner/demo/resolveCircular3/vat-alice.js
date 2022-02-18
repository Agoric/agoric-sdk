import { Far } from '@endo/marshal';

export const buildRootObject = _vatPowers =>
  Far('root', {
    acceptPromise: _p => {
      console.log('Alice got p');
    },
  });
