import { Far } from '@agoric/marshal';
import {
  buildDistributor,
  makeTreasuryFeeCollector,
} from './distributeFees.js';

export function buildRootObject(_vatPowers) {
  return Far('feeDistributor', { buildDistributor, makeTreasuryFeeCollector });
}
