import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject() {
  return Far('root', {
    bootstrap(vats) {
      const pa = E(vats.alice).genPromise();
      const pb = E(vats.bob).genPromise();
      E(vats.alice).usePromise([pb]);
      E(vats.bob).usePromise([pa]);
    },
  });
}
