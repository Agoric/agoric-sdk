/**
 * @file Utility functions that are compatible with but not dependent upon a
 *   hardened environment.
 */

const { hasOwn } = Object;

export const getOwn = <O, K extends PropertyKey>(
  obj: O,
  key: K,
): K extends keyof O ? O[K] : undefined =>
  // @ts-expect-error TS doesn't let `hasOwn(obj, key)` support `obj[key]`.
  hasOwn(obj, key) ? obj[key] : undefined;
