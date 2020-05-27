/* global globalThis */

export function bundle2_add(a) {
  return a + 2;
}

export function bundle2_transform(a) {
  return `${a} is two foot wide`;
}

export function bundle2_read_global() {
  return globalThis.sneakyChannel;
}
