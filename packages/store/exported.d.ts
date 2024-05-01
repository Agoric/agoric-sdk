/** @file Ambient exports until https://github.com/Agoric/agoric-sdk/issues/6512 */
/** @see {@link /docs/typescript.md} */
/* eslint-disable -- doesn't understand .d.ts */
import {
  LegacyMap as _LegacyMap,
  LegacyWeakMap as _LegacyWeakMap,
  MapStore as _MapStore,
  SetStore as _SetStore,
  StoreOptions as _StoreOptions,
  WeakMapStore as _WeakMapStore,
  WeakSetStore as _WeakSetStore,
} from './src/types.js';
import { Pattern as _Pattern } from '@endo/patterns';
declare global {
  export {
    _LegacyMap as LegacyMap,
    _LegacyMap as LegacyMap,
    _LegacyWeakMap as LegacyWeakMap,
    _MapStore as MapStore,
    _SetStore as SetStore,
    _StoreOptions as StoreOptions,
    _WeakMapStore as WeakMapStore,
    _WeakSetStore as WeakSetStore,
    // other packages
    _Pattern as Pattern,
  };
}
