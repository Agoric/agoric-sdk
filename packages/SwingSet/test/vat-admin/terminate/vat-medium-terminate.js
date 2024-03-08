import { Far, E } from '@endo/far';

export function buildRootObject(vatPowers) {
  const { testLog } = vatPowers;

  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      async speak(target, tag) {
        try {
          await E(target).live();
        } catch (e) {
          testLog(`m: live ${tag} failed: ${e}`);
        }
      },
    },
  );
}
