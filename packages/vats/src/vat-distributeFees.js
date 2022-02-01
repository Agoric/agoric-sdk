import { Far } from '@endo/far';
import { buildDistributor, makeFeeCollector } from './distributeFees.js';

export function buildRootObject(_vatPowers) {
  return Far('feeDistributor', {
    buildDistributor,
    makeFeeCollector,
  });
}
