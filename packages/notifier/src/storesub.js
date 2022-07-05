// @ts-check
import { E } from '@endo/eventual-send';
import { Far, makeMarshal } from '@endo/marshal';
import { observeIteration } from './asyncIterableAdaptor.js';
import { makeSubscriptionKit } from './subscriber.js';

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
    E.when(
      observeIteration(subscription, {
        updateState: publishValue,
        finish: publishValue,
        // TODO: Why not
        // fail,
        // here in the observer?
      }),
      undefined,
      fail,
    );
  }

  /** @type {StoredSubscription<T>} */
  const storesub = Far('StoredSubscription', {
    getStoreKey: async () => {
      if (!storageNode) {
        return harden({ subscription });
      }
      const storeKey = await E(storageNode).getStoreKey();
      return harden({ ...storeKey, subscription });
    },
    getUnserializer: () => unserializer,
    getSharableSubscriptionInternals:
      subscription.getSharableSubscriptionInternals,
    [Symbol.asyncIterator]: subscription[Symbol.asyncIterator],
  });
  return storesub;
};
harden(makeStoredSubscription);

/**
 * @template T
 * @typedef {object} StoredPublisherKit
 * @property {StoredSubscription<T>} subscriber TODO: change to StoredSubscriber<T> when available
 * @property {IterationObserver<T>} publisher
 */

/**
 * @template [T=unknown]
 * @param {ERef<StorageNode>} [storageNode]
 * @param {ERef<Marshaller>} [marshaller]
 * @param {string} [childPath]
 * @returns {StoredPublisherKit<T>}
 */
export const makeStoredPublisherKit = (storageNode, marshaller, childPath) => {
  const { publication, subscription } = makeSubscriptionKit();

  if (storageNode && childPath) {
    storageNode = E(storageNode).getChildNode(childPath);
  }

  // wrap the subscription to tee events to storage, repeating to this `subscriber`
  const subscriber = makeStoredSubscription(
    subscription,
    storageNode,
    marshaller,
  );

  return {
    publisher: publication,
    subscriber,
  };
};
