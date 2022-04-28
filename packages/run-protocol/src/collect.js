// @ts-check

const { entries, fromEntries, keys, values } = Object;

/** @type { <K extends string, T, U>(obj: Record<K, T>, f: (t: T, k: K) => U) => Record<K, U>} */
export const mapValues = (obj, f) =>
  // @ts-expect-error entries() loses the K type
  harden(fromEntries(entries(obj).map(([p, v]) => [p, f(v, p)])));

/** @type { <X, Y>(xs: X[], ys: Y[]) => [X, Y][]} */
export const zip = (xs, ys) => harden(xs.map((x, i) => [x, ys[+i]]));

/** @type { <K extends string, V>(obj: Record<K, ERef<V>>) => Promise<Record<K, V>> } */
export const allValues = async obj => {
  const resolved = await Promise.all(values(obj));
  // @ts-expect-error cast
  return harden(fromEntries(zip(keys(obj), resolved)));
};
