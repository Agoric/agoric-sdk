import { Far } from '@agoric/marshal';

import { makeRewards } from './rewards/rewards';

export function buildRootObject(_vatPowers) {
  return Far('root', {
    buildRewards: adminVat => makeRewards(adminVat),
  });
}
