// @ts-check

const { entries, fromEntries, keys, values } = Object;

export const Collect = {
  /**
   * @param {Record<string, V>} obj
   * @param {(v: V) => U} f
   * @returns {Record<string, U>}
   * @template V
   * @template U
   */
  mapValues: (obj, f) => fromEntries(entries(obj).map(([p, v]) => [p, f(v)])),
  /**
   * @param {X[]} xs
   * @param {Y[]} ys
   * @returns {[X, Y][]}
   * @template X
   * @template Y
   */
  zip: (xs, ys) => xs.map((x, i) => [x, ys[i]]),
  /**
   * @param {Record<string, ERef<V>>} obj
   * @returns {Promise<Record<string, V>>}
   * @template V
   */
  allValues: async obj =>
    fromEntries(Collect.zip(keys(obj), await Promise.all(values(obj)))),
};
