// @ts-check
// @jessie-check

// These tools seem cross platform, but they rely on AggregateError in the error
// handling path, which is currently not available in xsnap
import 'node:process';

/**
 * @template T
 * @param {readonly (T | PromiseLike<T>)[]} items
 * @returns {Promise<T[]>}
 */
export const PromiseAllOrErrors = async items => {
  return Promise.allSettled(items).then(results => {
    const errors = /** @type {PromiseRejectedResult[]} */ (
      results.filter(({ status }) => status === 'rejected')
    ).map(result => result.reason);
    if (!errors.length) {
      return /** @type {PromiseFulfilledResult<T>[]} */ (results).map(
        result => result.value,
      );
    } else if (errors.length === 1) {
      throw errors[0];
    } else {
      throw AggregateError(errors);
    }
  });
};

/**
 * @template T
 * @param {() => Promise<T>} trier
 * @param {(error?: unknown) => Promise<unknown>} finalizer
 * @returns {ReturnType<trier>}
 */
export const aggregateTryFinally = async (trier, finalizer) =>
  trier().then(
    async result => finalizer().then(() => result),
    async tryError =>
      finalizer(tryError)
        .then(
          () => tryError,
          finalizeError => AggregateError([tryError, finalizeError]),
        )
        .then(error => Promise.reject(error)),
  );

/**
 * Run a function with the ability to defer last-in-first-out cleanup callbacks.
 *
 * @template T
 * @param {(
 *   addCleanup: (fn: (err?: unknown) => Promise<void>) => void,
 * ) => Promise<T>} fn
 * @returns {ReturnType<fn>}
 */
export const withDeferredCleanup = async fn => {
  /** @type {((err?: unknown) => unknown)[]} */
  const cleanupsLIFO = [];
  /** @type {(cleanup: (err?: unknown) => unknown) => void} */
  const addCleanup = cleanup => {
    cleanupsLIFO.unshift(cleanup);
  };
  /** @type {(err?: unknown) => Promise<void>} */
  const finalizer = async err => {
    // Run each cleanup in its own isolated stack.
    const cleanupResults = cleanupsLIFO.map(async cleanup => {
      await null;
      return cleanup(err);
    });
    await PromiseAllOrErrors(cleanupResults);
  };
  return aggregateTryFinally(() => fn(addCleanup), finalizer);
};
