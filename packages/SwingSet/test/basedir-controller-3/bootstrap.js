import { Far, E } from '@endo/far';

export function buildRootObject(vatPowers) {
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      bootstrap(vats) {
        vatPowers.testLog(`bootstrap.obj0.bootstrap()`);
        E(vats.left).foo(1, vats.right);
      },
    },
  );
}
