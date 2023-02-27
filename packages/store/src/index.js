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
} from './keys/checkKey.js';
export { coerceToElements } from './keys/copySet.js';
export { coerceToBagEntries } from './keys/copyBag.js';
export {
  compareKeys,
  keyLT,
  keyLTE,
  keyEQ,
  keyGTE,
  keyGT,
} from './keys/compareKeys.js';
export {
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
} from './keys/merge-set-operators.js';

export {
  bagIsSuperbag,
  bagCompare,
  bagUnion,
  bagIntersection,
  bagDisjointSubtract,
} from './keys/merge-bag-operators.js';

export {
  M,
  getRankCover,
  isPattern,
  assertPattern,
  matches,
  mustMatch,
} from './patterns/patternMatchers.js';

export {
  initEmpty,
  defineExoClass,
  defineExoClassKit,
  makeExo,
} from './patterns/exo-makers.js';

export { makeScalarWeakSetStore } from './stores/scalarWeakSetStore.js';
export { makeScalarSetStore } from './stores/scalarSetStore.js';
export { makeScalarWeakMapStore } from './stores/scalarWeakMapStore.js';
export { makeScalarMapStore } from './stores/scalarMapStore.js';

export { provideLazy } from './stores/store-utils.js';

// /////////////////////// Deprecated Legacy ///////////////////////////////////

export { makeLegacyMap } from './legacy/legacyMap.js';
export { makeLegacyWeakMap } from './legacy/legacyWeakMap.js';
