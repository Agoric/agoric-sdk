// @ts-check
/* global setImmediate */

// eslint-disable-next-line import/order
import { makeMarshal } from '@endo/marshal';

import '../src/types.js';

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
  });
  /** @type {StorageNode} */
  const storage = {
    getStoreKey: () => storeKey,
    setValue: value => {
      setValueCalls += 1;
      assert.typeof(value, 'string');
      if (!publication) {
        throw Error('publication undefined');
      }
      publication.updateState(value);
    },
    getChildNode: () => storage,
    // @ts-expect-error
    countSetValueCalls: () => setValueCalls,
  };
  return storage;
};
harden(makeFakeStorage);

export const makeFakeMarshaller = () => {
  const vals = [];
  const fromVal = val => {
    vals.push(val);
    return vals.length;
  };
  const toVal = slot => vals[slot];
  return makeMarshal(fromVal, toVal, {
    marshalSaveError: err => {
      throw err;
    },
  });
};
harden(makeFakeMarshaller);
