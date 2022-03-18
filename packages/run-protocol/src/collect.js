// @ts-check

const { entries, fromEntries, keys, values } = Object;

/** @type { <K extends string, T, U>(obj: Record<K, T>, f: (t: T) => U) => Record<K, U>} */
export const mapValues = (obj, f) =>
  // @ts-ignore entries() loses the K type
  harden(fromEntries(entries(obj).map(([p, v]) => [p, f(v)])));

/** @type { <X, Y>(xs: X[], ys: Y[]) => [X, Y][]} */
export const zip = (xs, ys) => harden(xs.map((x, i) => [x, ys[+i]]));

/** @type { <K extends string, V>(obj: Record<K, ERef<V>>) => Promise<Record<string, V>> } */
export const allValues = async obj => {
  const resolved = await Promise.all(values(obj));
  return harden(fromEntries(zip(keys(obj), resolved)));
};
