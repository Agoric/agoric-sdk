import { Far } from '@endo/marshal';

export const buildRootObject = _vatPowers =>
  Far('root', {
    hang: () => {
      // eslint-disable-next-line no-empty
      for (;;) {}
    },
  });
