import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

const log = console.log;

log(`=> loading bootstrap.js`);

export function buildRootObject() {
  const target = makeExo(
    'target',
    M.interface('target', {}, { defaultGuards: 'passable' }),
    {
      one() {
        log(`target in one`);
      },
      two() {
        log(`target in two`);
      },
    },
  );
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      bootstrap(vats) {
        const bob = vats.bob;
        const p1 = E(bob).result();
        E(bob).promise(p1);
        E(bob).run(target);
      },
    },
  );
}
