export function getRandomColor(fraction, num) {
  // This is a linear-feedback shift register with computed startState
  // and number of iterations.  Thus, it is totally deterministic, but
  // at least looks a little random.

  /* eslint-disable no-bitwise */
  const startState = Math.floor(fraction * 0xffffffff) ^ 0xdeadbeef;
  let lfsr = startState;
  for (let i = -3; i < num; i += 1) {
    lfsr ^= lfsr >>> 7;
    lfsr ^= (lfsr << 9) & 0xffffffff;
    lfsr ^= lfsr >>> 13;
  }
  /* eslint-enable no-bitwise */

  // lfsr may be negative, so we make it start at 0.
  const rand = (Math.floor(lfsr) % 0x800000) + 0x7fffff;

  // Need to pad the beginning of the string with zeros.
  const randomColor = `#${rand.toString(16).padStart(6, '0')}`;
  const isHexColor = color => /^#[0-9A-F]{6}$/i.test(color);
  if (!isHexColor(randomColor)) {
    throw new Error(`color ${randomColor} is not a valid color`);
  }
  return randomColor;
}
