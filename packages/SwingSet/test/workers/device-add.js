import { Far } from '@endo/marshal';

export function buildRootDeviceNode() {
  return Far('root', {
    add(x, y) {
      return x + y;
    },
  });
}
