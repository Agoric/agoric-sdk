import { Far } from '@agoric/marshal';

export function buildRootDeviceNode() {
  return Far('root', {
    pleaseReturn(obj) {
      return obj;
    },
  });
}
