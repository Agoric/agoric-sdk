// @ts-check

/**
 * Modern version of Fisher-Yates shuffle algorithm (in-place).
 *
 * @param {Array<unknown>} a
 * @returns {void}
 */
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
}
harden(shuffle);

export { shuffle };
