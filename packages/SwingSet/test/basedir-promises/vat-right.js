import { Far } from '@endo/far';

export function buildRootObject(vatPowers) {
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      bar(arg2) {
        vatPowers.testLog(`right ${arg2}`);
        return 4;
      },
    },
  );
}
