export {
  isKey,
  assertKey,
  assertScalarKey,
  makeCopySet,
  getCopySetKeys,
  makeCopyBag,
  makeCopyBagFromElements,
  getCopyBagEntries,
  makeCopyMap,
  getCopyMapEntries,
  coerceToElements,
  coerceToBagEntries,
  compareKeys,
  keyLT,
  keyLTE,
  keyEQ,
  keyGTE,
  keyGT,
  elementsIsSuperset,
  elementsIsDisjoint,
  elementsCompare,
  elementsUnion,
  elementsDisjointUnion,
  elementsIntersection,
  elementsDisjointSubtract,
  setIsSuperset,
  setIsDisjoint,
  setCompare,
  setUnion,
  setDisjointUnion,
  setIntersection,
  setDisjointSubtract,
  bagIsSuperbag,
  bagCompare,
  bagUnion,
  bagIntersection,
  bagDisjointSubtract,
  M,
  getRankCover,
  isPattern,
  assertPattern,
  matches,
  mustMatch,
} from '@endo/patterns';

export {
  initEmpty,
  defineExoClass,
  defineExoClassKit,
  makeExo,
} from '@endo/exo';

export { makeScalarWeakSetStore } from './stores/scalarWeakSetStore.js';
export { makeScalarSetStore } from './stores/scalarSetStore.js';
export { makeScalarWeakMapStore } from './stores/scalarWeakMapStore.js';
export { makeScalarMapStore } from './stores/scalarMapStore.js';

export { provideLazy, isCopyMap, isCopySet } from './stores/store-utils.js';

// /////////////////////// Deprecated Legacy ///////////////////////////////////

export { makeLegacyMap } from './legacy/legacyMap.js';
export { makeLegacyWeakMap } from './legacy/legacyWeakMap.js';
