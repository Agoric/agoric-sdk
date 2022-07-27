// @ts-check

import { E } from '@endo/far';

/**
 *
 * @param {Promise<StoredSubscription<unknown>> | StoredSubscriber<unknown>} subscription
 */
export const subscriptionKey = subscription => {
  return E(subscription)
    .getStoreKey()
    .then(storeKey => storeKey.key);
};
