import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject() {
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      bootstrap(vats) {
        const pa = E(vats.bob).genPromise('a');
        const pb = E(vats.bob).genPromise('b');
        E(vats.bob).usePromise('a', [pb]);
        E(vats.bob).usePromise('b', [pa]);
      },
    },
  );
}
