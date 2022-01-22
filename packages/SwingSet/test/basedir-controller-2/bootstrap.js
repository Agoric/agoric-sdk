import { Far } from '@agoric/marshal';

export function buildRootObject(vatPowers) {
  vatPowers.testLog(`buildRootObject called`);
  return Far('root', { bootstrap() {} });
}
