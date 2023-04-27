import { Far } from '@endo/far';

export function buildRootDeviceNode() {
  return Far('root', {
    pleaseReturn(obj) {
      return obj;
    },
  });
}
