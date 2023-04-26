import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

console.log(`=> loading bootstrap.js`);

export function buildRootObject() {
  return Far('root', {
    bootstrap(vats) {
      const pX = E(vats.bob).genPromiseX();
      const pY = E(vats.bob).genPromiseY();
      E(vats.bob).resPromiseX([pY]);
      E(vats.bob).resPromiseY([pX]);
    },
  });
}
