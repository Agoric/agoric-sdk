const { fromEntries, keys, values } = Object;

/** @type { <X, Y>(xs: X[], ys: Y[]) => [X, Y][]} */
export const zip = (xs, ys) => harden(xs.map((x, i) => [x, ys[+i]]));

/** @type { <K extends string, V>(obj: Record<K, ERef<V>>) => Promise<Record<K, V>> } */
export const allValues = async obj => {
  const resolved = await Promise.all(values(obj));
  // @ts-expect-error cast
  return harden(fromEntries(zip(keys(obj), resolved)));
};
