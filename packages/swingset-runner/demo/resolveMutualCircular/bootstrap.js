import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject() {
  return Far('root', {
    bootstrap(vats) {
      const pa = E(vats.bob).genPromise('a');
      const pb = E(vats.bob).genPromise('b');
      E(vats.bob).usePromise('a', [pb]);
      E(vats.bob).usePromise('b', [pa]);
    },
  });
}
