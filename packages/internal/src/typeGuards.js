// @jessie-check
// @ts-check

import { M } from '@endo/patterns';

export const StorageNodeShape = M.remotable('StorageNode');

/** To be used only for 'helper' facets where the calls are from trusted code. */
export const UnguardedHelperI = M.interface(
  'helper',
  {},
  // not exposed so sloppy okay
  { sloppy: true },
);

/**
 * @typedef {number | `${bigint}`} BridgeBigInt Ensure that callees passed a
 *   bridge message that was serialised from a Golang int64 or uint64 accept
 *   either a JS number or a stringified JS bigint.
 */

/**
 * @type {import('./types.js').TypedPattern<BridgeBigInt>}
 */
export const BridgeBigIntShape = M.or(M.number(), M.string());
