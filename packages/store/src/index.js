export { isKey, assertKey } from './keys/keyKind.js';
export { sameKey } from './keys/compareKeys.js';
export { fulfillToKey } from './keys/fulfillToKey.js';

// export { M } from './matchers/M.js';

export { makeScalarMap, makeScalarMap as makeStore } from './scalarMap.js';
export {
  makeScalarWeakMap,
  makeScalarWeakMap as makeWeakStore,
} from './scalarWeakMap.js';
// export default as well as makeLegacy* only for compatibility
// during the transition.
export { makeLegacyMap, makeLegacyMap as default } from './legacyMap.js';
export { makeLegacyWeakMap } from './legacyWeakMap.js';
