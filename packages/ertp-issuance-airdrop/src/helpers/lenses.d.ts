/** @file utility library for working with lenses (composable getters/setters) */
export function curry(f: any, arity?: any, ...args: any[]): any;
/**
 * Transforms a curried function into an uncurried function.
 *
 * @function
 * @param {Function} fn - The curried function to uncurry.
 * @returns {Function} The uncurried function.
 */
export function uncurry(fn: Function): Function;
export const lens: any;
export function lensPath(path: any): (args: any) => any;
export function lensProp(k: any): any;
export const view: any;
export const set: any;
export const over: any;
//# sourceMappingURL=lenses.d.ts.map