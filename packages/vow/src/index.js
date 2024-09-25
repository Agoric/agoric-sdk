// @ts-check

// We default to the vat-compatible version of this package, which is easy to
// reconfigure if not running under SwingSet.
export * from '../vat.js';
export { default as makeE } from './E.js';
export { VowShape, toPassableCap } from './vow-utils.js';

// eslint-disable-next-line import/export
export * from './types-index.js';
