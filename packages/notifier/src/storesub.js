// @ts-check
import { E } from '@endo/eventual-send';
import { Far, makeMarshal } from '@endo/marshal';
import { observeIteration } from './asyncIterableAdaptor.js';

/**
 * Begin iterating the source, storing serialized iteration values.  If the
 * storageNode's `setValue` operation rejects, the iteration will be terminated.
 *
 * Returns a StoredSubscription that can be used by a client to directly follow
 * the iteration themselves, or obtain information to subscribe to the stored
 * data out-of-band.
 *
 * @template T
 * @param {Subscription<T>} subscription
 * @param {ERef<StorageNode>} [storageNode]
 * @param {ERef<ReturnType<typeof makeMarshal>>} [marshaller]
 * @returns {StoredSubscription<T>}
 */
export const makeStoredSubscription = (
  subscription,
  storageNode,
  marshaller = makeMarshal(undefined, undefined, {
    marshalSaveError: () => {},
  }),
) => {
  /** @type {Unserializer} */
  const unserializer = Far('unserializer', {
    unserialize: E(marshaller).unserialize,
  });

  // Abort the iteration on the next observation if the publisher ever fails.
  let publishFailed = false;
  let publishException;

  const fail = err => {
    publishFailed = true;
    publishException = err;
  };

  // Must *not* be an async function, because it sometimes must throw to abort
  // the iteration.
  const publishValue = obj => {
    assert(storageNode);
    if (publishFailed) {
      // To properly abort the iteration, this must be a synchronous exception.
      throw publishException;
    }

    // Publish the value, capturing any error.
    E(marshaller)
      .serialize(obj)
      .then(serialized => {
        const encoded = JSON.stringify(serialized);
        return E(storageNode).setValue(encoded);
      })
      .catch(fail);
  };

  if (storageNode) {
    // Start publishing the source.
    observeIteration(subscription, {
      updateState: publishValue,
      finish: publishValue,
    }).catch(fail);
  }

  /** @type {StoredSubscription<T>} */
  const storesub = Far('StoredSubscription', {
    getStoreKey: () =>
      (storageNode ? E(storageNode).getStoreKey() : Promise.resolve({})).then(
        storeKey => ({ ...storeKey, subscription }),
      ),
    getUnserializer: () => unserializer,
    getSharableSubscriptionInternals:
      subscription.getSharableSubscriptionInternals,
    [Symbol.asyncIterator]: subscription[Symbol.asyncIterator],
  });
  return storesub;
};
harden(makeStoredSubscription);
