import { Far } from '@endo/far';

export function buildRootDeviceNode() {
  return Far('root', {
    add(x, y) {
      return x + y;
    },
  });
}
