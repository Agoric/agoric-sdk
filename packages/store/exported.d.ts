/* eslint-disable -- doesn't understand .d.ts */
/**
 * @file re-export types into global namespace, for consumers that expect these
 *   to be ambient
 */
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

// export everything
export * from './src/types.js';

// re-export types into global namespace, for consumers that expect these to be
//  ambient
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
