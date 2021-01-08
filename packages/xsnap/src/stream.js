// @ts-check

import { defer } from './defer';

/**
 * @template T
 * @typedef {{
 *   put(value: T | Promise<T>): void,
 *   get(): Promise<T>
 * }} AsyncQueue
 */

/**
 * @template T
 * @returns {AsyncQueue<T>}
 */
export function queue() {
  const ends = defer();
  return {
    put(value) {
      const next = defer();
      const promise = next.promise;
      ends.resolve({ value, promise });
      ends.resolve = next.resolve;
    },
    get() {
      const promise = ends.promise.then(next => next.value);
      ends.promise = ends.promise.then(next => next.promise);
      return promise;
    },
  };
}

/**
 * @template T
 * @template U
 * @typedef {{
 *   next(value: T): Promise<IteratorResult<U>>,
 *   return(value: T): Promise<IteratorResult<U>>,
 *   throw(error: Error): Promise<IteratorResult<U>>,
 *   [Symbol.asyncIterator](): Stream<T, U>
 * }} Stream
 */

/**
 * @template T
 * @template U
 * @param {AsyncQueue<IteratorResult<T>>} data
 * @param {AsyncQueue<IteratorResult<U>>} acks
 * @returns {Stream<T, U>}
 */
export function stream(data, acks) {
  return {
    next(value) {
      data.put({ value, done: false });
      return acks.get();
    },
    return(value) {
      data.put({ value, done: true });
      return acks.get();
    },
    throw(error) {
      data.put(Promise.reject(error));
      return acks.get();
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
}

/**
 * @template T
 * @template U
 * @returns {[Stream<T, U>, Stream<U, T>]}
 */
export function pipe() {
  const syn = queue();
  const ack = queue();
  const input = stream(syn, ack);
  const output = stream(ack, syn);
  return [input, output];
}
