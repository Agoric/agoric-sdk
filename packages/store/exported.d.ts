/** @file Global definitions of foundational types */
/** @see {@link /docs/typescript.md} */

import { ERef as _ERef } from '@endo/far';
import {
  MapStore as _MapStore,
  SetStore as _SetStore,
  StoreOptions as _StoreOptions,
  WeakMapStore as _WeakMapStore,
  WeakSetStore as _WeakSetStore,
} from './src/types.js';

declare global {
  export {
    _ERef as ERef,
    _MapStore as MapStore,
    _SetStore as SetStore,
    _StoreOptions as StoreOptions,
    _WeakMapStore as WeakMapStore,
    _WeakSetStore as WeakSetStore,
  };
}
