import { passStyleOf } from '@endo/pass-style';

/**
 * Is `specimen` Passable? This returns true iff `passStyleOf(specimen)`
 * returns a string. This returns `false` iff `passStyleOf(specimen)` throws.
 * Under no normal circumstance should `isPassable(specimen)` throw.
 *
 * TODO implement an isPassable that does not rely on try/catch, and
 * move it to @endo/pass-style.
 * This implementation is just a standin until then
 *
 * @param {any} specimen
 * @returns {specimen is Passable}
 */
export const isPassable = specimen => {
  try {
    // In fact, it never returns undefined. It either returns a
    // string or throws.
    return passStyleOf(specimen) !== undefined;
  } catch (_) {
    return false;
  }
};
