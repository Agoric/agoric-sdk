/** @type { <T extends Record<string, ERef<any>>>(obj: T) => Promise<{ [K in keyof T]: Awaited<T[K]>}> } */
export const allValues: <T extends Record<string, ERef<any>>>(obj: T) => Promise<{ [K in keyof T]: Awaited<T[K]>; }>;
/** @type { <V, U, T extends Record<string, V>>(obj: T, f: (v: V) => U) => { [K in keyof T]: U }} */
export const mapValues: <V, U, T extends Record<string, V>>(obj: T, f: (v: V) => U) => { [K in keyof T]: U; };
/** @type {<X, Y>(xs: X[], ys: Y[]) => [X, Y][]} */
export const zip: <X, Y>(xs: X[], ys: Y[]) => [X, Y][];
import type { ERef } from '@endo/eventual-send';
//# sourceMappingURL=objectTools.d.ts.map