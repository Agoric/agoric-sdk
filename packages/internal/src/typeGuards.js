// @jessie-check
// @ts-check

import { M } from '@endo/patterns';

/**
 * @import {TypedPattern} from './types.js';
 */

export const StorageNodeShape = M.remotable('StorageNode');

/** To be used only for 'helper' facets where the calls are from trusted code. */
export const UnguardedHelperI = M.interface(
  'helper',
  {},
  // not exposed so using `defaultGuards` is fine.
  { defaultGuards: 'passable' },
);

/**
 * @typedef {number | `${bigint}`} BridgeBigInt Ensure that callees passed a
 *   bridge message that was serialised from a Golang int64 or uint64 accept
 *   either a JS number or a stringified JS bigint.
 */

/**
 * @type {TypedPattern<BridgeBigInt>}
 */
export const BridgeBigIntShape = M.or(M.number(), M.string());
