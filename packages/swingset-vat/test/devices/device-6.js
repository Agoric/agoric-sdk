import { Far } from '@endo/marshal';

export function buildRootDeviceNode() {
  return Far('root', {
    pleaseReturn(obj) {
      return obj;
    },
  });
}
