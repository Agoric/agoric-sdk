import { Far, E } from '@endo/far';

export function buildRootObject(vatPowers) {
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      foo(arg1, right) {
        vatPowers.testLog(`left.foo ${arg1}`);
        E(right).bar(2, right);
      },
    },
  );
}
