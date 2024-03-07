import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

console.log(`=> loading bootstrap.js`);

export function buildRootObject() {
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      bootstrap(vats) {
        const pa = E(vats.bob).genPromise();
        E(vats.bob).usePromise([pa]);
        E(vats.bob).getThing();
      },
    },
  );
}
