/**
 * @import {Ephemera} from './types.js';
 */

/**
 * Used by a possibly-durable exo to store per-instance ephemeral state.
 * Each ephemera is created at the exo class prepare level, and then
 * used from within the exo class methods to get state `eph.for(self)`.
 * At the beginning of a new incarnation, there is no such state, so
 * the first time it is accessed, it is initialized from `reinit(self)`.
 * The ephemeral state can be dropped explicitly during an incarnation
 * with `eph.resetFor(self)`, in which case the `eph.for(self)` will
 * call it to be reinitialized again from `reinit(self)`.
 *
 * TODO consolidate with `makeEphemeraProvider` from `@agoric/zoe`, since
 * they are serving similar purposes in similar ways.
 *
 * @template {WeakKey} [S=WeakKey]
 * @template {any} [V=any]
 * @param {(self: S) => V} reinit
 * @returns {Ephemera<S,V>}
 */
export const makeEphemera = reinit => {
  /** @type {WeakMap<S,V>} */
  const map = new WeakMap();

  return harden({
    for(self) {
      if (!map.has(self)) {
        map.set(self, reinit(self));
      }
      return /** @type {V} */ (map.get(self));
    },
    resetFor(self) {
      return map.delete(self);
    },
  });
};
harden(makeEphemera);
