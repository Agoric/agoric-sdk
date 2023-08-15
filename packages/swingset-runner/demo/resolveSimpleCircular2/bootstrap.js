import { E, Far } from '@endo/far';

console.log(`=> loading bootstrap.js`);

export function buildRootObject() {
  return Far('root', {
    bootstrap(vats) {
      const pa = E(vats.bob).genPromise();
      E(vats.bob).usePromise([pa]);
      E(vats.bob).getThing();
    },
  });
}
