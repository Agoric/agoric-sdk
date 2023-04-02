import { Far } from '@endo/far';

export function buildRootObject(vatPowers) {
  vatPowers.testLog(`buildRootObject called`);
  return Far('root', {
    bootstrap: () => {
      vatPowers.testLog(`bootstrap called`);
    },
    doMore: () => {
      vatPowers.testLog(`more stuff`);
    },
  });
}
