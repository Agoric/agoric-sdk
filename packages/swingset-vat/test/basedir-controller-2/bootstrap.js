import { Far } from '@endo/marshal';

export function buildRootObject(vatPowers) {
  vatPowers.testLog(`bootstrap called`);
  return Far('root', {});
}
