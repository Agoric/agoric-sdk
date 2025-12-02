// @jessie-check
// @ts-check

import { M } from '@endo/patterns';

/**
 * @import {DataOnly, RemotableBrand} from '@endo/eventual-send';
 * @import {TypedPattern} from './types.js';
 */

/**
 * Mark a value with RemotableBrand.
 *
 * @template T
 * @param {T} value
 * @returns {T & RemotableBrand<DataOnly<T>, T>}
 */
export const remotable = value =>
  /** @type {T & RemotableBrand<DataOnly<T>, T>} */ (
    /** @type {unknown} */ (value)
  );

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
 * @type {TypedPattern<BridgeBigInt>}
 */
export const BridgeBigIntShape = M.or(M.number(), M.string());
