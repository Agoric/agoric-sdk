import { Far } from '@agoric/marshal';
import { buildDistributor } from './distributeFees';

export function buildRootObject(_vatPowers) {
  return Far('feeDistributor', { buildDistributor });
}
