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
 * @type {<T>(
 *   trier: () => Promise<T>,
 *   finalizer: (error?: unknown) => Promise<void>,
 * ) => Promise<T>}
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
