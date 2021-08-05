export { makeScalarMap, makeScalarMap as makeStore } from './scalarMap.js';
export {
  makeScalarWeakMap,
  makeScalarWeakMap as makeWeakStore,
} from './scalarWeakMap.js';
// export default as well as makeLegacy* only for compatibility
// during the transition.
export { makeLegacyMap, makeLegacyMap as default } from './legacyMap.js';
export { makeLegacyWeakMap } from './legacyWeakMap.js';
