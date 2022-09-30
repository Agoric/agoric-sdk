// XXX hack until https://github.com/Agoric/agoric-sdk/issues/4560
// Generated from @agoric/ertp in a manual build
declare module '@endo/promise-kit' {
  /**
   * A reified Promise
   */
  type PromiseKit<T> = {
    resolve: (value: ERef<T>) => void;
    reject: (reason: any) => void;
    promise: Promise<T>;
  };
  /**
   * PromiseRecord is deprecated in favor of PromiseKit.
   */
  type PromiseRecord<T> = PromiseKit<T>;
  /**
   * A reference of some kind for to an object of type T. It may be a direct
   * reference to a local T. It may be a local presence for a remote T. It may
   * be a promise for a local or remote T. Or it may even be a thenable
   * (a promise-like non-promise with a "then" method) for a T.
   */
  type ERef<T> = T | PromiseLike<T>;

  /**
   * Determine if the argument is a Promise.
   *
   * @param {unknown} maybePromise The value to examine
   * @returns {maybePromise is Promise} Whether it is a promise
   */
  function isPromise(maybePromise: unknown): maybePromise is Promise<any>;

  /**
   * makePromiseKit() builds a Promise object, and returns a record
   * containing the promise itself, as well as separate facets for resolving
   * and rejecting it.
   *
   * @template T
   * @returns {import('./src/types.js').PromiseKit<T>}
   */
  function makePromiseKit<T>(): PromiseKit<T>;
  /**
   * Creates a Promise that is resolved or rejected when any of the provided Promises are resolved
   * or rejected.
   *
   * Unlike `Promise.race` it cleans up after itself so a non-resolved value doesn't hold onto
   * the result promise.
   *
   * @template T
   * @param {Iterable<T>} values An iterable of Promises.
   * @returns {Promise<Awaited<T>>} A new Promise.
   */
  function racePromises<T>(values: Iterable<T>): Promise<Awaited<T>>;
}
