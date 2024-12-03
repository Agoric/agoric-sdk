/**
 * @module address-hooks
 * @file This module provides functions for encoding and decoding address hooks
 *   which are comprised of a bech32 base address with an HTTP query string, all
 *   wrapped in a bech32 envelope.
 * @example
 *
 *     import {
 *       encodeAddressHook,
 *       decodeAddressHook,
 *     } from '@agoric/vat/src/address-hooks.js';
 *
 *     const baseAddress = 'agoric1qqp0e5ys';
 *     const query = { key: 'value', foo: ['bar', 'baz'] };
 *
 *     const addressHook = encodeAddressHook(baseAddress, query);
 *
 *     // 'agoric-hook1qqlkvmm0843xzu3xvehk70tzv9azv6m90y7hvctvw4jsqqg6g6dxe'
 *     const decoded = decodeAddressHook(addressHook);
 *
 *     // { baseAddress: 'agoric1qqp0e5ys', query: { key: 'value', foo: ['bar', 'baz'] } }
 */

/* eslint-disable no-bitwise */
import { bech32 } from 'bech32';
import queryString from 'query-string';

// ADDRESS_HOOK_VERSION is the version of the address hook format used in this
// module.
const ADDRESS_HOOK_VERSION = 0;

if ((ADDRESS_HOOK_VERSION & 0x0f) !== ADDRESS_HOOK_VERSION) {
  throw Error(`ADDRESS_HOOK_VERSION ${ADDRESS_HOOK_VERSION} exceeds 0x0f`);
}

// AddressHookMagic is a magic byte prefix that identifies a hooked address.
// Chosen to make bech32 address hooks that look like "agoric10rch..."
const ADDRESS_HOOK_MAGIC = new Uint8Array([
  0x78,
  0xf1,
  0x70 | ADDRESS_HOOK_VERSION,
]);

// The default maximum number of characters in a bech32-encoded hooked address.
export const DEFAULT_HOOKED_ADDRESS_CHAR_LIMIT = 1024;

/**
 * @typedef {Record<string, string | (string | null)[] | null>} HookQuery
 */

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
 * Join raw base address bytes and hook data into a bech32-encoded hooked
 * address. The bech32-payload is:
 *
 * | offset | 0           | len(baseAddress) | len(payload)-2   |
 * | ------ | ----------- | ---------------- | ---------------- |
 * | data   | baseAddress | hookData         | len(baseAddress) |
 *
 * @param {string} baseAddress
 * @param {ArrayLike<number>} hookData
 * @param {number} [charLimit]
 * @returns {string}
 */
export const joinHookedAddress = (
  baseAddress,
  hookData,
  charLimit = DEFAULT_HOOKED_ADDRESS_CHAR_LIMIT,
) => {
  const { prefix, bytes } = decodeBech32(baseAddress, charLimit);

  const baseAddressLength = bytes.length;
  if (baseAddressLength > MAX_BASE_ADDRESS_LENGTH) {
    throw RangeError(
      `Base address length 0x${baseAddressLength.toString(16)} exceeds maximum 0x${MAX_BASE_ADDRESS_LENGTH.toString(16)}`,
    );
  }
  const b = baseAddressLength;

  const magicLength = ADDRESS_HOOK_MAGIC.length;
  const hookBuf = new Uint8Array(
    magicLength + bytes.length + hookData.length + BASE_ADDRESS_LENGTH_BYTES,
  );
  hookBuf.set(ADDRESS_HOOK_MAGIC);
  hookBuf.set(bytes, magicLength);
  hookBuf.set(hookData, magicLength + b);

  // Append the big-endian address length.
  let len = b;
  for (let i = 0; i < BASE_ADDRESS_LENGTH_BYTES; i += 1) {
    hookBuf[hookBuf.length - 1 - i] = len & 0xff;
    len >>>= 8;
  }

  return encodeBech32(prefix, hookBuf, charLimit);
};

/**
 * @param {string} baseAddress
 * @param {HookQuery} query
 * @param {number} [charLimit]
 */
export const encodeAddressHook = (baseAddress, query, charLimit) => {
  const queryStr = queryString.stringify(query);

  const te = new TextEncoder();
  const hookData = te.encode(`?${queryStr}`);
  return joinHookedAddress(baseAddress, hookData, charLimit);
};

/**
 * @param {string} addressHook
 * @param {number} [charLimit]
 * @returns {{ baseAddress: string; query: HookQuery }}
 */
export const decodeAddressHook = (addressHook, charLimit) => {
  const { baseAddress, hookData } = splitHookedAddress(addressHook, charLimit);
  const hookStr = new TextDecoder().decode(hookData);
  if (hookStr && !hookStr.startsWith('?')) {
    throw Error(`Hook data does not start with '?': ${hookStr}`);
  }

  /** @type {HookQuery} */
  const query = queryString.parse(hookStr);
  return { baseAddress, query };
};

/**
 * @param {string} specimen
 * @param {number} [charLimit]
 * @returns {string | { baseAddress: string; hookData: Uint8Array }}
 */
export const splitHookedAddressUnsafe = (
  specimen,
  charLimit = DEFAULT_HOOKED_ADDRESS_CHAR_LIMIT,
) => {
  const { prefix, bytes } = decodeBech32(specimen, charLimit);

  const magicLength = ADDRESS_HOOK_MAGIC.length;
  for (let i = 0; i < magicLength; i += 1) {
    if (bytes[i] !== ADDRESS_HOOK_MAGIC[i]) {
      return { baseAddress: specimen, hookData: new Uint8Array() };
    }
  }

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
  if (b > bytes.length - BASE_ADDRESS_LENGTH_BYTES - magicLength) {
    return `Base address length 0x${b.toString(16)} is longer than specimen length ${bytes.length - BASE_ADDRESS_LENGTH_BYTES - magicLength}`;
  }

  const baseAddressBuf = bytes.subarray(magicLength, magicLength + b);
  const baseAddress = encodeBech32(prefix, baseAddressBuf, charLimit);

  const hookData = bytes.subarray(magicLength + b, -BASE_ADDRESS_LENGTH_BYTES);

  return { baseAddress, hookData };
};

/**
 * @param {string} specimen
 * @param {number} [charLimit]
 * @returns {{
 *   baseAddress: string;
 *   hookData: Uint8Array;
 * }}
 */
export const splitHookedAddress = (specimen, charLimit) => {
  const result = splitHookedAddressUnsafe(specimen, charLimit);
  if (typeof result === 'object') {
    return result;
  }
  throw Error(result);
};
