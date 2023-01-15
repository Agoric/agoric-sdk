import { Far } from '@endo/far';

export function buildRootDeviceNode() {
  return Far('root', {
    pleaseThrow(msg) {
      throw Error(`intentional: ${msg}`);
    },
  });
}
