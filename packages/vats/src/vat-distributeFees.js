import { Far } from '@agoric/marshal';
import { buildDistributor, makeFeeCollector } from './distributeFees.js';

export function buildRootObject(_vatPowers) {
  return Far('feeDistributor', {
    buildDistributor,
    makeFeeCollector,
  });
}
