import { makeTracer } from '@agoric/internal';
import { heapVowTools } from '@agoric/vow';
import { makePromiseKit } from '@endo/promise-kit';

/**
 * @import {TraceLogger} from '@agoric/internal';
 * @import {ERef} from '@endo/far';
 * @import {EVow} from '@agoric/vow';
 */

const { when } = heapVowTools;

/**
 * @template T
 * @typedef {T | ResultMeta<T>} MaybeResultMeta
 */

/**
 * @template T
 * @typedef {{
 *   result: EVow<T | ResultMeta<T>>;
 *   meta: Record<string, any>;
 * }} ResultMeta
 */

/**
 * @template T
 * @typedef {{ result: T; meta: Record<string, any> }} UnwrappedResultMeta
 */

/**
 * Checks if a value is a ResultMeta.
 *
 * @param {unknown} specimen
 * @returns {specimen is ResultMeta<any> | { result: any; meta: null }}
 */
export const isResultMeta = specimen => {
  return (
    specimen != null &&
    typeof specimen === 'object' &&
    'result' in specimen &&
    'meta' in specimen
  );
};

/**
 * Extracts `meta` from a chained ResultMeta, calling `reducer` on each.
 *
 * @template T
 * @param {ERef<MaybeResultMeta<T>>} resultP
 * @param {(
 *   resultMeta: ResultMeta<T> | { result: T; meta: null },
 *   priorResultMeta: ResultMeta<T>,
 * ) => ERef<MaybeResultMeta<T> | { result: T; meta: null }>} reducer
 * @param {Record<string, any>} [initialMeta]
 * @returns {Promise<UnwrappedResultMeta<T>>} the final awaited result and the
 *   accumulated meta
 */
export const reduceResultMeta = async (resultP, reducer, initialMeta = {}) => {
  /** @type {MaybeResultMeta<T>} */
  let result = await when(resultP);
  /** @type {ResultMeta<T>} */
  let priorResultMeta = { result, meta: initialMeta };
  do {
    const resultMeta = isResultMeta(result) ? result : { result, meta: null };
    const reduction = await reducer(resultMeta, priorResultMeta);
    harden(reduction);

    if (isResultMeta(reduction)) {
      if (reduction.meta == null) {
        // No meta means to use the prior's meta.
        priorResultMeta = {
          result: reduction.result,
          meta: priorResultMeta.meta,
        };
      } else {
        // Update both result and meta.
        priorResultMeta = reduction;
      }
    } else {
      // Just update the result, keep the prior meta.
      priorResultMeta = { result: reduction, meta: priorResultMeta.meta };
    }

    result = await when(priorResultMeta.result);
  } while (isResultMeta(result));

  // No more layers to reduce.
  return { result, meta: priorResultMeta.meta };
};
harden(reduceResultMeta);

/**
 * Unwraps the result and shallow-merged meta information from a
 * ResultMetaArg<T> promise.
 *
 * @template T
 * @param {ERef<MaybeResultMeta<T>>} resultP
 * @param {string} [message]
 * @param {Record<string, any>} [details]
 * @param {TraceLogger} [trace]
 */
export const unwrapResultMeta = async (
  resultP,
  message,
  details = {},
  trace = message ? makeTracer('unwrapResultMeta') : undefined,
) => {
  return reduceResultMeta(
    resultP,
    ({ result, meta }, priorResultMeta) => {
      const next = { meta: { ...priorResultMeta.meta, ...meta }, result };
      trace?.(message, { ...details, meta }, '=>', next);
      return next;
    },
    { debug: { message, details } },
  );
};
harden(unwrapResultMeta);

/**
 * Awaits the result and shallow-merges the meta information from a
 * MaybeResultMeta<T> promise.
 *
 * @template T
 * @param {ERef<MaybeResultMeta<T>>} resultP
 * @param {Record<string, any>} [initialMeta]
 */
export const wrapResultMeta = async (resultP, initialMeta = {}) => {
  const result = await resultP;
  if (
    result != null &&
    typeof result === 'object' &&
    'result' in result &&
    'meta' in result
  ) {
    return {
      result: Promise.resolve(result.result),
      meta: { ...initialMeta, ...result.meta },
    };
  }
  return { result: Promise.resolve(result), meta: initialMeta };
};
harden(wrapResultMeta);

/**
 * @template T
 * @template [U=T]
 * @param {EVow<MaybeResultMeta<T>>} resultP
 * @param {(rm: ResultMeta<T>) => ERef<MaybeResultMeta<U>>} transform
 * @returns {Promise<ResultMeta<U>>}
 */
export const transformResultMeta = (resultP, transform) => {
  /** @type {PromiseKit<ResultMeta<U>>} */
  const firstPK = makePromiseKit();

  /**
   * Create a shallow copy of all the ResultMeta layers, with the last layer
   * replaced by the transform function.
   *
   * @param {EVow<MaybeResultMeta<T>>} firstResult
   * @param {PromiseKit<MaybeResultMeta<U>>} lastPromiseKit
   */
  const cloneThenTransformResultMeta = async (firstResult, lastPromiseKit) => {
    await null;
    let lastPK = lastPromiseKit;
    try {
      let lastMeta = {};
      let nextResult = firstResult;
      for (;;) {
        const resultOrMeta = await when(nextResult);
        if (!isResultMeta(resultOrMeta)) {
          // Base case: not a ResultMeta, just resolve the last promise with the
          // transformation.
          const result = /** @type {T} */ (resultOrMeta);
          const transformation = transform({ result, meta: lastMeta });
          lastPK.resolve(transformation);
          return;
        }

        // Resolve the last promise with a copy of this layer.
        assert(resultOrMeta.meta != null);
        lastMeta = resultOrMeta.meta;
        const nextPK = makePromiseKit();
        lastPK.resolve({ result: nextPK.promise, meta: lastMeta });

        // Update the last promise kit and get the next result.
        lastPK = nextPK;
        nextResult = resultOrMeta.result;
      }
    } catch (e) {
      lastPK.reject(e);
    }
  };

  // Run the loop in the background, so that it doesn't block the return of the
  // first promise in the chain.
  void cloneThenTransformResultMeta(resultP, firstPK).catch(reason =>
    firstPK.reject(reason),
  );

  return firstPK.promise;
};

harden(transformResultMeta);
