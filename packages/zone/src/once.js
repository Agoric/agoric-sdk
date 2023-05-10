/** @typedef {import('@endo/patterns').Passable} Passable */

/**
 * The best way to understand the purpose of `once` is to first understand
 * what `once` does on a durable zone. Used correctly, `once` should only
 * be called at most once on any subzone,key pair during any vat incarnation.
 * Given that constraint, if there is already a value bound to that
 * subzone,key pair, it must have been left there by a previous incarnation and
 * `once` will simply return it. If not, then `makeValue(key)` is called to
 * determine the initial value of that slot, which will normally be preserved
 * by similar calls to `once` in future incarnations --- though that will be
 * up to them.
 *
 * For single incarnation zones, `zone.once(key, makeValue)` just calls
 * `makeValue(key)` and returns the result.
 *
 * Default zones do no uniqueness checking. It is up to the caller not to call
 * `once` more than once per subzone,key pair within any vat incarnation.
 *
 * @template {string} [K=string]
 * @template {Passable} [V=Passable]
 * @param {K} key
 * The string name of the Zone slot to provide.
 * @param {(key: K) => V} makeValue
 * Called to create a fresh value to fill an empty slot.
 * @returns {V}
 * The value of the key's slot.
 */
export const alwaysOnce = (key, makeValue) => makeValue(key);
