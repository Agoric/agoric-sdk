/**
 * For use by debug.js but defined here because .js files cannot define
 * circular TS types.
 */
export type OptPrefixPath = undefined | [string, OptPrefixPath];
