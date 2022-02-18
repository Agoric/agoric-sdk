import { Far } from '@endo/marshal';

export const buildRootDeviceNode = () =>
  Far('root', {
    pleaseReturn: obj => obj,
  });
