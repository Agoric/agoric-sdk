import { M } from '@endo/patterns';
import { OPT_UINT_UNDEFINED, maxOptUint255 } from './opt-uint-core.ts';

export {
  OPT_UINT_UNDEFINED,
  optUint255,
  maxOptUint255,
  assertOptUint255,
} from './opt-uint-core.ts';

/** Unsigned 255-bit data with an extra bit to indicate unused. */
export const optUint255Shape = M.or(
  OPT_UINT_UNDEFINED,
  M.and(M.nat(), M.lt(maxOptUint255)),
);
