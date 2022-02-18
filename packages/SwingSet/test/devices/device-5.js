import { Far } from '@endo/marshal';

export const buildRootDeviceNode = () =>
  Far('root', {
    pleaseThrow: msg => {
      throw Error(`intentional: ${msg}`);
    },
  });
