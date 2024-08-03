import { Fail } from '@endo/errors';

/**
 * Assert function to ensure that an object implements the StorageAPI
 * interface: methods { has, getNextKey, get, set, delete }
 * (cf. packages/SwingSet/docs/state.md#transactions).
 *
 * @param {*} kvStore  The object to be tested
 *
 * @throws {Error} if, upon inspection, the parameter does not satisfy the above
 *   criteria.
 *
 * @returns {void}
 */
export function insistStorageAPI(kvStore) {
  for (const n of ['has', 'get', 'getNextKey', 'set', 'delete']) {
    n in kvStore || Fail`kvStore.${n} is missing, cannot use`;
  }
}
