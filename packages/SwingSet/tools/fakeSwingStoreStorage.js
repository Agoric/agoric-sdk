import { initSwingStore } from '@agoric/swing-store';
import { serializedCommit } from '@agoric/swingset-liveslots/tools/fakeStorage.js';

/**
 * @import { LiveFakeStorage, SerializedFakeStorage } from '@agoric/swingset-liveslots/tools/fakeStorage.js';
 */

/**
 * @param {Uint8Array} [buffer]
 * @returns {SerializedFakeStorage<Uint8Array>}
 */
export const initSerializedFakeSwingStoreStorage = buffer => {
  const serialized = buffer;
  return harden({
    kvStore: undefined,
    serialized,
    commit: serializedCommit,
    // eslint-disable-next-line no-use-before-define
    init: initLiveFakeSwingStoreStorage,
  });
};

/**
 * @param {Uint8Array} [serialized]
 * @returns {LiveFakeStorage<Uint8Array>}
 */
export const initLiveFakeSwingStoreStorage = serialized => {
  const {
    debug,
    hostStorage,
    kernelStorage: { kvStore },
  } = initSwingStore(null, { serialized });

  const commit = () => {
    const notSyncCommit = Promise.reject(
      Error('swing-store commit was not synchronous'),
    );
    const committed = hostStorage.commit();

    // Cause an unhandled rejection if swing-store commit took more than one turn.
    void Promise.race([committed, notSyncCommit]);

    // Assumes the commit above was synchronous
    const buffer = debug.serialize();
    return initSerializedFakeSwingStoreStorage(buffer);
  };

  return harden({
    kvStore,
    serialized: undefined,
    commit,
    init: initLiveFakeSwingStoreStorage,
  });
};
