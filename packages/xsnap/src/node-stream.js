// @ts-check

/**
 * @template T
 * @typedef {import('./defer.js').Deferred<T>} Deferred
 */
import { defer } from './defer';

const continues = { value: undefined };

/**
 * @template T
 * @template TReturn
 * @template TNext
 * @typedef {{
 *  next: (value: TNext) => Promise<IteratorResult<T>>,
 *  return: (value: TReturn) => Promise<IteratorResult<T>>,
 *  throw: (error: Error) => Promise<IteratorResult<T>>,
 * }} StrictAsyncIterator
 */

/**
 * @template T
 * @template TReturn
 * @template TNext
 * @typedef {StrictAsyncIterator<T, TReturn, TNext> & {
 *   [Symbol.asyncIterator]: () => StrictAsyncIterator<T, TReturn, TNext>
 * }} StrictAsyncIterableIterator
 */

/**
 * Adapts a Node.js writable stream to a JavaScript
 * async iterator of Uint8Array data chunks.
 * Back pressure emerges from awaiting on the promise
 * returned by `next` before calling `next` again.
 *
 * @param {NodeJS.WritableStream} output
 * @returns {StrictAsyncIterableIterator<void, void, Uint8Array>}
 */
export function writer(output) {
  /**
   * @type {Deferred<IteratorResult<void>>}
   */
  let drained = defer();
  drained.resolve(continues);

  output.on('error', err => {
    console.log('err', err);
    drained.reject(err);
  });

  output.on('drain', () => {
    drained.resolve(continues);
    drained = defer();
  });

  return {
    /**
     * @param {Uint8Array} [chunk]
     * @returns {Promise<IteratorResult<void>>}
     */
    async next(chunk) {
      if (!chunk) {
        return continues;
      }
      if (!output.write(chunk)) {
        drained = defer();
        return drained.promise;
      }
      return continues;
    },
    async return() {
      output.end();
      return drained.promise;
    },
    async throw() {
      output.end();
      return drained.promise;
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
}
