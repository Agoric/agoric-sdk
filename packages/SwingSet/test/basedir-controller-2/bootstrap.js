import { Far } from '@agoric/marshal';

export function buildRootObject(vatPowers) {
  vatPowers.testLog(`bootstrap called`);
  return Far('root', {});
}
