// @ts-check
import { mustMatch as typelessMustMatch } from '@endo/patterns';

/**
 * @import {MustMatch, PatternType, TypedPattern} from './types.js';
 */

/** @type {MustMatch} */
export const mustMatch = typelessMustMatch;

/**
 * @template M
 * @param {unknown} specimen
 * @param {TypedPattern<M>} patt
 * @returns {M}
 */
export const cast = (specimen, patt) => {
  // mustMatch throws if they don't, which means that `cast` also narrows the
  // type but a function can't both narrow and return a type. That is by design:
  // https://github.com/microsoft/TypeScript/issues/34636#issuecomment-545025916
  mustMatch(specimen, patt);
  return specimen;
};
