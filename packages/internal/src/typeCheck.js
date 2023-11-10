// @ts-check
import { mustMatch as typelessMustMatch } from '@endo/patterns';

/** @type {import('./types.js').MustMatch} */
export const mustMatch = typelessMustMatch;

/**
 * @template {import('./types.js').TypedMatcher} M
 * @param {unknown} specimen
 * @param {M} patt
 * @returns {import('./types.js').MatcherType<M>}
 */
export const cast = (specimen, patt) => {
  // mustMatch throws if they don't, which means that `cast` also narrows the
  // type but a function can't both narrow and return a type. That is by design:
  // https://github.com/microsoft/TypeScript/issues/34636#issuecomment-545025916
  mustMatch(specimen, patt);
  return specimen;
};
