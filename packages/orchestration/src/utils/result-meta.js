import { makeTracer } from '@agoric/internal';

/**
 * @import {TraceLogger} from '@agoric/internal';
 * @import {ERef} from '@endo/far';
 */

/**
 * @template T
 * @typedef {T
 *   | { result: Promise<ResultMeta<T>>; meta: Record<string, any> }} ResultMeta
 */

/**
 * Extracts `meta` from a chained ResultMeta, calling `reducer` on each.
 *
 * @template T
 * @param {ERef<ResultMeta<T>>} resultP
 * @param {(
 *   meta: Record<string, any>,
 *   priorReduction: Record<string, any>,
 * ) => Record<string, any>} reducer
 * @param {Record<string, any>} [initialMeta]
 * @returns {Promise<{ result: T; meta: Record<string, any> }>} the final
 *   awaited result and the accumulated meta
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
  return { result, meta };
};
harden(reduceResultMeta);

/**
 * Unwraps the result and shallow-merged meta information from a ResultMeta<T>
 * promise.
 *
 * @template T
 * @param {ERef<ResultMeta<T>>} resultP
 * @param {string} [message]
 * @param {Record<string, any>} [details]
 * @param {TraceLogger} [trace]
 * @returns {Promise<{ result: T; meta: Record<string, any> }>} the final
 *   awaited result
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
