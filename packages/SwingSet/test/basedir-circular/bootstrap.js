import { Far, E } from '@endo/far';

export function buildRootObject() {
  return Far('root', {
    bootstrap(vats) {
      const pa = E(vats.bob).genPromise1();
      const pb = E(vats.bob).genPromise2();
      E(vats.bob).usePromises([pa], [pb]);
    },
  });
}
