// @ts-check

import { E } from '@endo/far';

/**
 *
 * @param {Promise<StoredFacet>} subscription
 */
export const subscriptionKey = subscription => {
  return E(subscription)
    .getStoreKey()
    .then(storeKey => storeKey.key);
};
