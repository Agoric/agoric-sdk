// @jessie-check

import { assertAllDefined } from '@agoric/internal';
import { makeSerializeToStorage } from '@agoric/internal/src/lib-chainStorage.js';
import { E } from '@endo/far';
import { makeExo } from '@endo/exo';
import { M } from '@endo/patterns';
import { observeNotifier } from './asyncIterableAdaptor.js';

/**
 * @template T
 * @typedef {BaseNotifier<T> & Omit<StoredFacet, 'getStoreKey'>} StoredNotifier
 */

/**
 * Begin iterating the source, storing serialized iteration values.  If the
 * storageNode's `setValue` operation rejects, no further writes to it will
 * be attempted (but results will remain available from the subscriber).
 *
 * Returns a StoredNotifier that can be used by a client to directly follow
 * the iteration themselves, or obtain information to subscribe to the stored
 * data out-of-band.
 *
 * @template T
 * @param {ERef<Notifier<T>>} notifier
 * @param {ERef<StorageNode>} storageNode
 * @param {ERef<Marshaller>} marshaller
 * @returns {StoredNotifier<T>}
 */
export const makeStoredNotifier = (notifier, storageNode, marshaller) => {
  assertAllDefined({ notifier, storageNode, marshaller });

  const marshallToStorage = makeSerializeToStorage(storageNode, marshaller);

  observeNotifier(notifier, {
    updateState(value) {
      marshallToStorage(value).catch(reason =>
        console.error('StoredNotifier failed to updateState', reason),
      );
    },
    fail(reason) {
      console.error('StoredNotifier failed to iterate', reason);
    },
  }).catch(reason => {
    console.error('StoredNotifier halted iteration', reason);
  });

  /** @type {Unserializer} */
  const unserializer = makeExo(
    'unserializer',
    M.interface('unserializer', {}, { defaultGuards: 'passable' }),
    {
      fromCapData: data => E(marshaller).fromCapData(data),
      unserialize: data => E(marshaller).fromCapData(data),
    },
  );

  /** @type {StoredNotifier<T>} */
  const storedNotifier = makeExo(
    'StoredNotifier',
    M.interface('StoredNotifier', {}, { defaultGuards: 'passable' }),
    {
      getUpdateSince: updateCount => E(notifier).getUpdateSince(updateCount),
      getPath: () => E(storageNode).getPath(),
      getUnserializer: () => unserializer,
    },
  );
  return storedNotifier;
};
