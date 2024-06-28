import type { Vow } from '@agoric/vow';

/**
 * Converts a function type that returns a Promise to a function type that
 * returns a Vow. If the input is not a function returning a Promise, it
 * preserves the original type.
 *
 * @template T - The type to transform
 */
export type PromiseToVow<T> = T extends (
  ...args: infer Args
) => Promise<infer R>
  ? (...args: Args) => Vow<R>
  : T extends (...args: infer Args) => infer R
    ? (...args: Args) => R
    : T;

export type VowifyAll<T> = {
  [K in keyof T]: PromiseToVow<T[K]>;
};
