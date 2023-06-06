// @ts-check
const { Fail } = assert;

/**
 * @param {string} baseLabel
 * @param {import('.').Stores} stores
 */
export const makeOnceKit = (baseLabel, stores) => {
  const usedKeys = stores.detached().setStore(`${baseLabel} used keys`);

  /**
   * @template V
   * @param {string} key
   * @param {(key: string) => V} maker
   * @returns {V}
   */
  const makeOnceUnvalidated = (key, maker) => {
    typeof key === 'string' || Fail`key ${key} must be a string`;
    typeof maker === 'function' || Fail`maker ${maker} must be a function`;
    !usedKeys.has(key) ||
      Fail`key ${key} has already been used once in this incarnation`;

    // Mark this key as used.  We make no attempt to recover from invalid makers
    // or backingStores.
    usedKeys.add(key);

    // Not provided previously, so make it.
    return maker(key);
  };

  /**
   * @template {(key: string, ...rest: unknown[]) => any} T
   * @param {T} fn
   * @returns {T}
   */
  const makeOnceWrapper = fn => {
    /** @type {(...args: Parameters<T>) => T} */
    const wrapper = (key, ...rest) =>
      makeOnceUnvalidated(key, () => fn(key, ...rest));
    return /** @type {T} */ (wrapper);
  };

  /**
   * The best way to understand the purpose of `makeOnce` is to first understand
   * what `makeOnce` does on a durable zone. Used correctly, `makeOnce` should only
   * be called at most once on any subzone,key pair during any vat incarnation.
   * Given that constraint, if there is already a value bound to that
   * subzone,key pair, it must have been left there by a previous incarnation and
   * `makeOnce` will simply return it. If not, then `maker(key)` is called to
   * determine the initial value of that slot, which will normally be preserved
   * by similar calls to `once` in future incarnations --- though that will be
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
    const value = makeOnceUnvalidated(key, maker);
    stores.isStorable(value) ||
      Fail`maker return value ${value} is not storable`;
    return value;
  };

  return harden({ makeOnce, makeOnceWrapper });
};
harden(makeOnceKit);
