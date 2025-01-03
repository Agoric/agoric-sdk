// eslint-disable-next-line import/no-extraneous-dependencies
import { bech32 } from 'bech32';

/**
 * @param {number} index
 * @param {string} prefix
 * @param {number} byteLength
 * @returns {string} a mock bech32 address for tests
 */
export const makeTestAddress = (
  index = 0,
  prefix = 'agoric',
  byteLength = 20,
) => {
  // create a simple 20-byte array (common address length)
  const bytes = new Uint8Array(byteLength).fill(0);
  // if index provided, put it in the first byte
  if (index !== 0) bytes[0] = Number(index);
  const words = bech32.toWords(bytes);
  return bech32.encode(prefix, words);
};
