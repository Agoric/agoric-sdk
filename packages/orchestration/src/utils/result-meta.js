import { makeTracer } from '@agoric/internal';

/**
 * @import {TraceLogger} from '@agoric/internal';
 * @import {ERef} from '@endo/far';
 */

/**
 * @template T
 * @typedef {T | ResultMeta<T>} MaybeResultMeta
 */

/**
 * @template T
 * @typedef {{
 *   result: Promise<T>;
 *   meta: Record<string, any>;
 * }} ResultMeta
 */

/**
 * @template T
 * @typedef {{ result: Awaited<T>; meta: Record<string, any> }} UnwrappedResultMeta
 */

/**
 * Extracts `meta` from a chained ResultMeta, calling `reducer` on each.
 *
 * @template T
 * @param {ERef<MaybeResultMeta<T>>} resultP
 * @param {(
 *   meta: Record<string, any>,
 *   priorReduction: Record<string, any>,
 * ) => Record<string, any>} reducer
 * @param {Record<string, any>} [initialMeta]
 * @returns {Promise<UnwrappedResultMeta<T>>} the final awaited result and the
 *   accumulated meta
 */
export const reduceResultMeta = async (resultP, reducer, initialMeta = {}) => {
  let result = await resultP;
  let meta = initialMeta;
  while (
    result != null &&
    typeof result === 'object' &&
    'result' in result &&
    'meta' in result
  ) {
    if (reducer) {
      meta = reducer(result.meta, meta);
    }
    result = await result.result;
  }
  if (reducer) {
    // Final merge to allow extra publishing.
    meta = reducer(meta, {});
  }
  return { result, meta };
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
    (meta, prior) => {
      const next = { ...prior, ...meta };
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
 * @param {ERef<MaybeResultMeta<T>>} resultP
 * @param {(rm: ResultMeta<T>) => ERef<MaybeResultMeta<U>>} transform
 * @returns {Promise<ResultMeta<U>>}
 */
export const transformResultMeta = async (resultP, transform) => {
  const resultMeta = await wrapResultMeta(resultP);
  const { result, meta } = resultMeta;
  const transformed = transform({ result, meta });
  return wrapResultMeta(transformed);
};
harden(transformResultMeta);
