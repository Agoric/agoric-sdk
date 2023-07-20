// @jessie-check

import { makeScalarBigWeakMapStore } from '@agoric/vat-data';
import { makeNotifierKit } from '@agoric/notifier';

/**
 * Call `provideLazy` to get or make the value associated with the key.
 * If there already is one, return that. Otherwise,
 * call `makeValue(key)`, remember it as the value for
 * that key, and return it.
 *
 * @template K,V
 * @param {WeakMapStore<K,V>} mapStore
 * @param {K} key
 * @param {(key: K) => V} makeValue
 * @returns {V}
 */
const provideLazy = (mapStore, key, makeValue) => {
  if (!mapStore.has(key)) {
    mapStore.init(key, makeValue(key));
  }
  return mapStore.get(key);
};
harden(provideLazy);

// Note: Virtual for high cardinality, but *not* durable, and so
// broken across an upgrade.
export const makeTransientNotifierKit = () => {
  /** @type {WeakMapStore<Purse, NotifierRecord<any>>} */
  const transientNotiferKits = makeScalarBigWeakMapStore(
    'transientNotiferKits',
  );

  const provideNotifierKit = key =>
    provideLazy(transientNotiferKits, key, () =>
      makeNotifierKit(key.getCurrentAmount()),
    );

  const provideNotifier = key => provideNotifierKit(key).notifier;
  const update = (key, newValue) => {
    if (transientNotiferKits.has(key)) {
      const { updater } = transientNotiferKits.get(key);
      updater.updateState(newValue);
    }
  };

  return { provideNotifier, update };
};
harden(makeTransientNotifierKit);
