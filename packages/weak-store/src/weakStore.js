// Copyright (C) 2019 Agoric, under Apache license 2.0

import harden from '@agoric/harden';
import { assert, details, openDetail } from '@agoric/assert';
/**
 * Distinguishes between adding a new key (init) and updating or
 * referencing a key (get, set, delete).
 *
 * `init` is only allowed if the key does not already exist. `Get`,
 * `set` and `delete` are only allowed if the key does already exist.
 * @param  {string} keyName - the column name for the key
 */
function makeWeakStore(keyName = 'key') {
  const wm = new WeakMap();
  const assertKeyNotBound = key =>
    assert(
      !wm.has(key),
      details`${openDetail(keyName)} already registered: ${key}`,
    );
  const assertKeyBound = key =>
    assert(wm.has(key), details`${openDetail(keyName)} not found: ${key}`);

  // /////// Methods /////////

  const has = key => wm.has(key);
  const init = (key, value) => {
    assertKeyNotBound(key);
    wm.set(key, value);
  };
  const get = key => {
    assertKeyBound(key);
    return wm.get(key);
  };
  const set = (key, value) => {
    assertKeyBound(key);
    wm.set(key, value);
  };
  const deleteIt = key => {
    assertKeyBound(key);
    wm.delete(key);
  };

  // eslint-disable-next-line no-use-before-define
  const readOnly = () => readOnlyWeakStore;

  const readOnlyWeakStore = harden({
    readOnly,
    has,
    get,
  });

  return harden({
    readOnly,
    has,
    init,
    get,
    set,
    delete: deleteIt,
  });
}
harden(makeWeakStore);
export default makeWeakStore;
