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
  if (typeof v === 'object' && v !== null && 'then' in v) {
    return Promise.resolve(v).then(handle);
  } else {
    return handle(v);
  }
}
