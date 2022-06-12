// @ts-check
// SwingSet/src/limits/constants.js is replicated in x/swingset/types/default-params.go.

/**
 * These limits are compiled into the liveslots for a spawned vat.  The only way
 * to change them is to upgrade the vats to a newer liveslots.
 */

/**
 * The maximum size for an imported source code bundle.
 *
 * Note that we multiply by 2 to account for UTF-16 encoding.
 */
export const MAX_SOURCE_BUNDLE_BYTES = 2 * 4 * 1024 * 1024; // 4MB UTF-16

/**
 * Maximum size for a "normal"-sized input.
 */
export const MAX_NORMAL_INPUT_BYTES = 128 * 1024; // 128kB

/**
 * Maximum size for inter-vat messages.
 *
 * TODO: This should be significantly lowered after bundlecaps mean no more
 * large messages travel between vats.  Something like 128kB is a reasonable
 * starting point.
 */
export const MAX_VAT_MESSAGE_BYTES = MAX_SOURCE_BUNDLE_BYTES; // TODO: MAX_NORMAL_INPUT_BYTES;

/**
 * The largest supported bigint value to support in and out of the kernel.
 *
 * One GOOGOL should be enough for anybody.  If you're exchanging heavy math,
 * serialize them to strings so that it's opt-in for a vat to validate them
 * before unserializing.
 */
export const MAX_BIGINT_DIGITS = 100;
