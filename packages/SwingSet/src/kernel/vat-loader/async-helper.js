/**
 * @template T
 * @typedef {T extends PromiseLike<any> ? never : T} SyncOnly
 */

/**
 * @template {boolean} AllowAsync
 * @template T
 * @typedef {true extends AllowAsync ? (Promise<T> | T) : T} MaybePromiseResult
 */

/**
 * WARNING: Do not use, this is releasing Zalgo
 *
 * @template T
 * @template R
 * @param {T} v
 * @param {(v: Awaited<T>) => R} handle
 * @returns {T extends PromiseLike<any> ? Promise<Awaited<R>> : R}
 */
export function maybeAsync(v, handle) {
  if (Object(v) === v && typeof v.then === 'function') {
    return Promise.resolve(v).then(handle);
  } else {
    return handle(v);
  }
}

/**
 * Somewhat tames Zalgo
 *
 * @template {(...args: any[]) => any} T
 * @param {T} fn
 * @returns {(...args: Parameters<T>) => SyncOnly<ReturnType<T>>}
 */
export function ensureSync(fn) {
  // eslint-disable-next-line func-names
  return function (...args) {
    const result = Reflect.apply(fn, this, args);
    if (Object(result) === result && typeof result.then === 'function') {
      throw new Error('Unexpected async result');
    } else {
      return result;
    }
  };
}
