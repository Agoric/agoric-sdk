import { isPassable as realIsPassable } from '@endo/pass-style';

/**
 * @deprecated Import `isPassable` directly from `@endo/pass-style`
 * @param {any} specimen
 * @returns {specimen is Passable}
 */
export const isPassable = specimen => realIsPassable(specimen);
