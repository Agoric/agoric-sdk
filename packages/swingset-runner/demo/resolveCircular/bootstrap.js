import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

console.log(`=> loading bootstrap.js`);

export function buildRootObject() {
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      bootstrap(vats) {
        const pa = E(vats.bob).genPromise1();
        const pb = E(vats.bob).genPromise2();
        E(vats.bob).usePromises([pa], [pb]);
      },
    },
  );
}
