/* global globalThis endow1 */

import { bundle2_add, bundle2_transform, bundle2_read_global } from './bundle2.js';

// invocation
export function f1(a) {
  return a + 1;
}

// nested module invocation
export function f2(a) {
  return bundle2_add(a);
}

// endowments
export function f3(a) {
  return a + endow1;
}

// transforms
export function f4(a) {
  return `replaceme ${a}`;
}

// nested module transforms
export function f5(a) {
  return `Mr. Lambert says ${bundle2_transform(a)}`;
}

// globalThis should not hardened, and not available as a channel between
// unrelated code

export function f6_read_global() {
  return globalThis.sneakyChannel;
}

export function f7_write_global(a) {
  // this will throw TypeError
  globalThis.sneakyChannel = a;
}

export function f8_read_global_submodule() {
  return bundle2_read_global();
}
