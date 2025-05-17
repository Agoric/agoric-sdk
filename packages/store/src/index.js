/**
 * @import {MustMatch} from '@agoric/internal';
 */
import { mustMatch as typelessMustMatch } from '@endo/patterns';

export { makeScalarWeakSetStore } from './stores/scalarWeakSetStore.js';
export { makeScalarSetStore } from './stores/scalarSetStore.js';
export { makeScalarWeakMapStore } from './stores/scalarWeakMapStore.js';
export { makeScalarMapStore } from './stores/scalarMapStore.js';

export { provideLazy } from './stores/store-utils.js';

// /////////////////////// Deprecated Re-exports ///////////////////////////////
// Importers should import directly from the packages shown below

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
  isCopySet,
  isCopyMap,
} from '@endo/patterns';

// XXX @agoric/store should not depend on @agoric/internal
// TODO move to Endo
/** @type {MustMatch} */
export const mustMatch = typelessMustMatch;

export {
  initEmpty,
  defineExoClass,
  defineExoClassKit,
  makeExo,
} from '@endo/exo';

// /////////////////////// Deprecated Legacy ///////////////////////////////////

export { makeLegacyMap } from './legacy/legacyMap.js';
export { makeLegacyWeakMap } from './legacy/legacyWeakMap.js';
// eslint-disable-next-line import/export
export * from './types.js';
