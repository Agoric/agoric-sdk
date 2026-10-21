/**
 * @import {SetTestJig} from '../contractFacet/types.js';
 */

/**
 * @template {Record<string, unknown>} [T=Record<string, unknown>]
 */
export const makeJigKit = () => {
  /** @type {(() => T) | undefined} */
  let testFn;

  /** @type {SetTestJig<T>} */
  const setTestJig = fn => {
    testFn = fn;
  };

  /** @returns {T | undefined} */
  const getTestJig = () => testFn?.();

  return { setTestJig, getTestJig };
};

/**
 * @template {Record<string, unknown>} [T=Record<string, unknown>]
 * @typedef {ReturnType<typeof makeJigKit<T>>} TestJigKit
 */
