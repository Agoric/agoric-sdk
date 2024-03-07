import { Far, E } from '@endo/far';

export function buildRootObject(vatPowers) {
  const log = vatPowers.testLog;
  const obj0 = makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      callRight(arg1, right) {
        log(`left.callRight ${arg1}`);
        E(right)
          .bar(2)
          .then(a => log(`left.then ${a}`));
        return 3;
      },
    },
  );
  return obj0;
}
