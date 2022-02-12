// @ts-check

const { entries, fromEntries, keys, values } = Object;

/** @type { <T, U>(obj: Record<string, T>, f: (t: T) => U) => Record<string, U>} */
export const mapValues = (obj, f) =>
  fromEntries(entries(obj).map(([p, v]) => [p, f(v)]));

/** @type { <X, Y>(xs: X[], ys: Y[]) => [X, Y][]} */
export const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);

/** @type { <V>(obj: Record<string, ERef<V>>) => Promise<Record<string, V>> } */
export const allValues = async obj =>
  fromEntries(zip(keys(obj), await Promise.all(values(obj))));
