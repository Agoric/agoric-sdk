/* global setImmediate */

// eslint-disable-next-line import/order
import { makeMarshal } from '@endo/marshal';

import '../src/types-ambient.js';

export const eventLoopIteration = async () =>
  new Promise(resolve => setImmediate(resolve));

/**
 *
 * @param {string} path
 * @param {IterationObserver<unknown>} [publication]
 */
export const makeFakeStorage = (path, publication) => {
  let setValueCalls = 0;
  const fullPath = `publish.${path}`;
  const storeKey = harden({
    storeName: 'swingset',
    storeSubkey: `swingset/data:${fullPath}`,
    dataPrefixBytes: '',
  });
  /** @type {StorageNode} */
  const storage = {
    getStoreKey: async () => storeKey,
    setValue: async value => {
      setValueCalls += 1;
      assert.typeof(value, 'string');
      if (!publication) {
        throw Error('publication undefined');
      }
      publication.updateState(value);
    },
    makeChildNode: () => storage,
    // @ts-expect-error
    countSetValueCalls: () => setValueCalls,
  };
  return storage;
};
harden(makeFakeStorage);

export const makeFakeMarshaller = () =>
  makeMarshal(undefined, undefined, {
    marshalSaveError: () => {},
  });
harden(makeFakeMarshaller);
