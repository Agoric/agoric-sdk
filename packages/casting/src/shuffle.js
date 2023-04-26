/**
 * Modern version of Fisher-Yates shuffle algorithm (in-place).
 *
 * @template T
 * @param {Array<T>} a
 */
export const shuffle = a => {
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
};
