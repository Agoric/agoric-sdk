export function NonNullish<T>(val: T | null | undefined, optDetails?: string | undefined): T;
export function compose(...fns: any[]): (initialValue: any) => any;
/** @type { <T extends Record<string, ERef<any>>>(obj: T) => Promise<{ [K in keyof T]: Awaited<T[K]>}> } */
export const allValues: <T extends Record<string, ERef<any>>>(obj: T) => Promise<{ [K in keyof T]: Awaited<T[K]>; }>;
/** @type { <V, U, T extends Record<string, V>>(obj: T, f: (v: V) => U) => { [K in keyof T]: U }} */
export const mapValues: <V, U, T extends Record<string, V>>(obj: T, f: (v: V) => U) => { [K in keyof T]: U; };
/** @type {<X, Y>(xs: X[], ys: Y[]) => [X, Y][]} */
export const zip: <X, Y>(xs: X[], ys: Y[]) => [X, Y][];
/** @type {<T>(x: T[]) => T} */
export const head: <T>(x: T[]) => T;
export function objectToMap(obj: any, baggage: any): any;
export function assign(a: any, c: any): any;
export function constructObject(array?: any[]): any;
export function pair(a: any, b: any): any[];
export function concatenate(a: any, o: any): any;
import type { ERef } from '@endo/eventual-send';
//# sourceMappingURL=objectTools.d.ts.map