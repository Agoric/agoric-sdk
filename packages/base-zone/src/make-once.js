// @ts-check
import { Fail } from '@endo/errors';

/** @param {string} label */
const defaultLabelToKeys = label => harden([label]);
harden(defaultLabelToKeys);

/**
 * @param {string} debugName Only used internally for diagnostics, not available to user code
 * @param {import('./types.js').Stores} stores
 * @param {import('@agoric/swingset-liveslots').MapStore<string, any>} [backingStore]
 */
export const makeOnceKit = (debugName, stores, backingStore = undefined) => {
  // We need a detached setStore so that it isn't persisted as part of the zone.
  // That way, our usedKeys are only tracked for the current incarnation, which
  // is what we want.  Using `debugName` in the label is good for diagnostics,
  // and since it is only for a detached store, it should not be visible to the
  // backing store.
  const usedKeys = stores.detached().setStore(`${debugName} used keys`);

  /**
   * @param {string} key
   */
  const assertOnlyOnce = key => {
    typeof key === 'string' || Fail`key ${key} must be a string`;
    !usedKeys.has(key) ||
      Fail`key ${key} has already been used in this zone and incarnation`;

    // Mark this key as used.  We make no attempt to recover from invalid makers
    // or backingStores.
    usedKeys.add(key);
  };

  /**
   * Ensure the wrapped function is only called once per incarnation.  It is
   * expected to update the backing store directly.
   *
   * @template {(key: string, ...rest: any[]) => any} T
   * @param {T} provider
   * @param {(label: string) => string[]} [labelToKeys]
   * @returns {T}
   */
  const wrapProvider = (provider, labelToKeys = defaultLabelToKeys) => {
    /** @type {(...args: Parameters<T>) => ReturnType<T>} */
    const wrapper = (label, ...rest) => {
      for (const key of labelToKeys(label)) {
        assertOnlyOnce(key);
      }
      return provider(label, ...rest);
    };
    return /** @type {T} */ (wrapper);
  };

  /**
   * The best way to understand the purpose of `makeOnce` is to first understand
   * what `makeOnce` does on a durable zone. Used correctly, `makeOnce` should only
   * be called at most once on any zone,key pair during any vat incarnation.
   * Given that constraint, if there is already a value bound to that
   * zone,key pair, it must have been left there by a previous incarnation and
   * `makeOnce` will simply return it. If not, then `maker(key)` is called to
   * determine the initial value of that slot, which will normally be preserved
   * by similar calls to `makeOnce` in future incarnations --- though that will be
   * up to them.
   *
   * Also ensures the maker returns a storable value.
   *
   * @template V
   * @param {string} key The string name of the Zone slot to provide.
   * @param {(key: string) => V} maker Called to create a fresh value to fill an empty slot.
   * @returns {V} The value of the key's slot.
   */
  const makeOnce = (key, maker) => {
    assertOnlyOnce(key);
    if (backingStore && backingStore.has(key)) {
      return backingStore.get(key);
    }
    const value = maker(key);
    stores.isStorable(value) ||
      Fail`maker return value ${value} is not storable`;
    backingStore && backingStore.init(key, value);
    return value;
  };

  return harden({ makeOnce, wrapProvider });
};
harden(makeOnceKit);
