import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

console.log(`=> loading bootstrap.js`);

export function buildRootObject() {
  return Far('root', {
    bootstrap(vats) {
      const pa = E(vats.bob).genPromise();
      E(vats.bob).usePromise([pa]);
    },
  });
}
