import { Far } from '@agoric/far';
import { buildDistributor, makeFeeCollector } from './distributeFees.js';

export function buildRootObject(_vatPowers) {
  return Far('feeDistributor', {
    buildDistributor,
    makeFeeCollector,
  });
}
