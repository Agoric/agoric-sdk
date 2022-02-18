import { Far } from '@endo/marshal';

export const buildRootObject = () =>
  Far('root', {
    hi: () => 'hello',
  });
