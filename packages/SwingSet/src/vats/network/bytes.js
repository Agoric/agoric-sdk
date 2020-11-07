// @ts-check

import './types';

/* eslint-disable no-bitwise */
/**
 * Convert some data to bytes.
 *
 * @param {Data} data
 * @returns {Bytes}
 */
export function toBytes(data) {
  /** @type {Data | number[]} */
  let bytes = data;
  // TODO: We really need marshallable TypedArrays.
  if (typeof bytes === 'string') {
    bytes = bytes.split('').map(c => c.charCodeAt(0));
  }

  // We return the raw characters in the lower half of
  // the String's representation.
  const buf = new Uint8Array(bytes);
  return String.fromCharCode.apply(null, buf);
}
