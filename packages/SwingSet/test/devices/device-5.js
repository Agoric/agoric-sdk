import { Far } from '@endo/marshal';

export function buildRootDeviceNode() {
  return Far('root', {
    pleaseThrow(msg) {
      throw Error(`intentional: ${msg}`);
    },
  });
}
