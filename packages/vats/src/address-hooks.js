/**
 * @module address-hooks
 * @file This module provides functions for encoding and decoding bech32
 *   addresses, and hooked addresses which attach a bech32 base address with
 *   arbitrary hookData bytes.
 */

/* eslint-disable no-bitwise */
import { bech32 } from 'bech32';

// The default maximum number of characters in a bech32-encoded hooked address.
export const DEFAULT_HOOKED_ADDRESS_CHAR_LIMIT = 1000;

/**
 * @typedef {`${string}${ADDRESS_HOOK_HUMAN_READABLE_SUFFIX}`} HookPrefix
 */
export const ADDRESS_HOOK_HUMAN_READABLE_SUFFIX = '-hook';

export const BASE_ADDRESS_LENGTH_BYTES = 2;
export const MAX_BASE_ADDRESS_LENGTH =
  (1 << (BASE_ADDRESS_LENGTH_BYTES * 8 - 1)) + 1;

/**
 * @param {string} specimen
 * @param {number} [charLimit]
 * @returns {{ prefix: string; bytes: Uint8Array }}
 */
export const decodeBech32 = (
  specimen,
  charLimit = DEFAULT_HOOKED_ADDRESS_CHAR_LIMIT,
) => {
  const { prefix, words } = bech32.decode(specimen, charLimit);
  const rawBytes = bech32.fromWords(words);

  const bytes = new Uint8Array(rawBytes);
  return { prefix, bytes };
};

/**
 * @param {string} humanReadablePart
 * @param {ArrayLike<number>} bytes
 * @param {number} [charLimit]
 * @returns {string}
 */
export const encodeBech32 = (
  humanReadablePart,
  bytes,
  charLimit = DEFAULT_HOOKED_ADDRESS_CHAR_LIMIT,
) => {
  const words = bech32.toWords(bytes);
  return bech32.encode(humanReadablePart, words, charLimit);
};

/**
 * Encode a base address and hook data into a bech32-encoded hooked address. The
 * bech32-payload is:
 *
 *     | 0..ba        | ba..-2    | 2  |
 *     | baseAddress  | hookData  | ba |
 *
 * @param {string} baseAddress
 * @param {ArrayLike<number>} [hookData]
 * @param {number} [charLimit]
 * @returns {string}
 */
export const encodeHookedAddress = (
  baseAddress,
  hookData = [],
  charLimit = DEFAULT_HOOKED_ADDRESS_CHAR_LIMIT,
) => {
  const { prefix: innerPrefix, bytes } = decodeBech32(baseAddress, charLimit);

  const baseAddressLength = bytes.length;
  if (baseAddressLength > MAX_BASE_ADDRESS_LENGTH) {
    throw RangeError(
      `Base address length 0x${baseAddressLength.toString(16)} exceeds maximum 0x${MAX_BASE_ADDRESS_LENGTH.toString(16)}`,
    );
  }
  const b = baseAddressLength;

  const hookBuf = new Uint8Array(
    bytes.length + hookData.length + BASE_ADDRESS_LENGTH_BYTES,
  );
  hookBuf.set(bytes);
  hookBuf.set(hookData, b);

  // Append the big-endian address length.
  let len = b;
  for (let i = 0; i < BASE_ADDRESS_LENGTH_BYTES; i += 1) {
    hookBuf[hookBuf.length - 1 - i] = len & 0xff;
    len >>>= 8;
  }

  return encodeBech32(
    `${innerPrefix}${ADDRESS_HOOK_HUMAN_READABLE_SUFFIX}`,
    hookBuf,
    charLimit,
  );
};

/**
 * @param {string} specimen
 * @param {number} [charLimit]
 * @returns {string | { baseAddress: string; hookData?: ArrayLike<number> }}
 */
export const decodeHookedAddressUnsafe = (
  specimen,
  charLimit = DEFAULT_HOOKED_ADDRESS_CHAR_LIMIT,
) => {
  const { prefix: outerPrefix, bytes } = decodeBech32(specimen, charLimit);
  if (!outerPrefix.endsWith(ADDRESS_HOOK_HUMAN_READABLE_SUFFIX)) {
    return { baseAddress: specimen, hookData: undefined };
  }

  const innerPrefix = outerPrefix.slice(
    0,
    -ADDRESS_HOOK_HUMAN_READABLE_SUFFIX.length,
  );

  let len = 0;
  for (let i = BASE_ADDRESS_LENGTH_BYTES - 1; i >= 0; i -= 1) {
    const byte = bytes.at(-i - 1);
    if (byte === undefined) {
      return `Cannot get base address length from byte ${-i - 1} of ${bytes.length}`;
    }
    len <<= 8;
    len |= byte;
  }

  const b = len;
  if (b > bytes.length - BASE_ADDRESS_LENGTH_BYTES) {
    return `Base address length 0x${b.toString(16)} is longer than specimen length ${bytes.length - BASE_ADDRESS_LENGTH_BYTES}`;
  }

  const baseAddressBuf = bytes.subarray(0, b);
  const baseAddress = encodeBech32(innerPrefix, baseAddressBuf, charLimit);

  const hookData = bytes.subarray(b, -BASE_ADDRESS_LENGTH_BYTES);

  return { baseAddress, hookData };
};

/**
 * @param {string} specimen
 * @param {number} [charLimit]
 * @returns {{
 *   baseAddress: string;
 *   hookData?: ArrayLike<number>;
 * }}
 */
export const decodeHookedAddress = (specimen, charLimit) => {
  const result = decodeHookedAddressUnsafe(specimen, charLimit);
  if (typeof result === 'object') {
    return result;
  }
  throw Error(result);
};
