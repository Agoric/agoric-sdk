/* eslint-disable -- doesn't understand .d.ts */

export * from './src/types.js';

// XXX re-export types into global namespace, for consumers that expect these to
//  be ambient. Why the _ prefix? Because without it TS gets confused between the
//  import and export symbols. h/t https://stackoverflow.com/a/66588974
//  Note one big downside vs ambients is that these types will appear to be on `globalThis`.
// UNTIL https://github.com/Agoric/agoric-sdk/issues/6512
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
