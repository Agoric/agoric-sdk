import { Far } from '@endo/far';

export function buildRootObject(vatPowers) {
  vatPowers.testLog(`buildRootObject called`);
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      bootstrap: () => {
        vatPowers.testLog(`bootstrap called`);
      },
      doMore: () => {
        vatPowers.testLog(`more stuff`);
      },
    },
  );
}
