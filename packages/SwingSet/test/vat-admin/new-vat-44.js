import { Far } from '@endo/marshal';

export const buildRootObject = _vatPowers =>
  Far('root', {
    getANumber: () => 44,
  });
