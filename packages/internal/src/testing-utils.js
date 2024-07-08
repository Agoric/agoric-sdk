// @ts-check
/**
 * @file note this cannot be called test-utils.js due to
 *   https://github.com/Agoric/agoric-sdk/issues/7503
 */
/* global setImmediate */
/** @import {MapStore} from '@agoric/store'; */

/**
 * A workaround for some issues with fake time in tests.
 *
 * Lines of test code can depend on async promises outside the test resolving
 * before they run. Awaiting this function result ensures that all promises that
 * can do resolve. Note that this doesn't mean all outstanding promises.
 */
export const eventLoopIteration = async () =>
  new Promise(resolve => setImmediate(resolve));
harden(eventLoopIteration);

/** @type {(value: any) => string} */
const stringOrTag = value => {
  if (typeof value === 'string') {
    return value;
  } else if (typeof value === 'object' && Symbol.toStringTag in value) {
    return value[Symbol.toStringTag];
  }
  return String(value);
};
/**
 * @param {MapStore} store
 * @returns {object} tree of the contents of the storeÂ
 */
export const inspectMapStore = store => {
  /** @type {Record<string, unknown>} */
  const obj = {};
  for (const key of store.keys()) {
    const value = store.get(key);
    const hasKeys = typeof value === 'object' && 'keys' in value;
    const index = stringOrTag(key);
    if (hasKeys && 'get' in value) {
      obj[index] = inspectMapStore(value);
    } else if (hasKeys) {
      obj[index] = Array.from(value.keys());
    } else {
      obj[index] =
        value instanceof Object && Symbol.toStringTag in value
          ? value[Symbol.toStringTag]
          : value;
    }
  }
  return obj;
};
harden(inspectMapStore);
