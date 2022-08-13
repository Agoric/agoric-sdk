import { Far } from '@endo/marshal';

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
