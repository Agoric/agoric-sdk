import { Far } from '@agoric/marshal';
import { buildDistributor, makeTreasuryFeeCollector } from './distributeFees';

export function buildRootObject(_vatPowers) {
  return Far('feeDistributor', { buildDistributor, makeTreasuryFeeCollector });
}
