// @ts-check

export { isKey, assertKey } from './keys/checkKey.js';
export { keyLT, keyLTE, keyEQ, keyGTE, keyGT } from './keys/compareKeys.js';

export {
  M,
  isPattern,
  assertPattern,
  matches,
  assertMatches,
} from './patterns/patternMatchers.js';
// export { compareRank } from './patterns/rankOrder.js';

export { makeScalarWeakSetStore } from './stores/scalarWeakSetStore.js';
export { makeScalarSetStore } from './stores/scalarSetStore.js';
export { makeScalarWeakMapStore } from './stores/scalarWeakMapStore.js';
export { makeScalarMapStore } from './stores/scalarMapStore.js';

// /////////////////////// Deprecated Legacy ///////////////////////////////////

// export default as well as makeLegacy* only for compatibility
// during the transition.
export { makeLegacyMapStore } from './legacy/legacyMap.js';
export { makeLegacyWeakMapStore } from './legacy/legacyWeakMap.js';
