// @ts-check

// eslint-disable-next-line jsdoc/require-returns-check
/**
 * @param {boolean} _flag
 * @returns {asserts _flag}
 */
const assert = _flag => {};

/**
 * @template T
 * @typedef {{
 *   resolve(value?: T | Promise<T>): void,
 *   reject(error: Error): void,
 *   promise: Promise<T>
 * }} Deferred
 */

/**
 * @template T
 * @returns {Deferred<T>}
 */
export const defer = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  assert(resolve !== undefined);
  assert(reject !== undefined);
  return { promise, resolve, reject };
};
