// @ts-check
import { mustMatch } from '@endo/patterns';

/**
 * @import {CastedPattern} from '@endo/patterns';
 */

/**
 * Re-exported from `@endo/patterns`, which now narrows `specimen` to the
 * pattern's type. Prefer importing `mustMatch` from `@endo/patterns` directly.
 *
 * @deprecated import from `@endo/patterns` instead
 */
export { mustMatch };

/**
 * @template M
 * @param {unknown} specimen
 * @param {CastedPattern<M>} patt
 * @returns {M}
 */
export const cast = (specimen, patt) => {
  // mustMatch throws if they don't, which means that `cast` also narrows the
  // type but a function can't both narrow and return a type. That is by design:
  // https://github.com/microsoft/TypeScript/issues/34636#issuecomment-545025916
  mustMatch(specimen, patt);
  // The assertion narrows `specimen`, but inside this generic body TS keeps an
  // `unknown extends M` conditional that doesn't collapse to `M`, so re-assert.
  return /** @type {M} */ (specimen);
};
