// @ts-check
/// <reference path="./types.js" />
import { Fail } from '@agoric/assert';
import { encodeBase64, decodeBase64 } from '@endo/base64';

/**
 * @import {Bytes} from './types.js';
 */

/** @typedef {Bytes | Buffer | Uint8Array | Iterable<number>} ByteSource */

/**
 * @param {ByteSource} contents
 */
const coerceToByteArray = contents => {
  if (typeof contents === 'string') {
    return Uint8Array.from(contents, c => {
      const b = c.charCodeAt(0);
      b <= 0xff || Fail`character cannot be coerced to an octet: ${c}`;
      return b;
    });
  } else if (contents instanceof Uint8Array) {
    // Reconstruct to ensure we have a Uint8Array and not a Buffer.
    return new Uint8Array(
      contents.buffer,
      contents.byteOffset,
      contents.byteLength,
    );
  }
  return new Uint8Array(contents);
};

/**
 * Convert a Uint8Array or other sequence of octets to a string representation
 * that `@endo/marshal` accepts as Passable.
 *
 * @param {ByteSource} byteSource
 * @returns {Bytes}
 */
export function toBytes(byteSource) {
  // We return the raw characters in the lower half of
  // the String's representation.
  const buf = coerceToByteArray(byteSource);
  return String.fromCharCode(...buf);
}

/**
 * Convert bytes to a String.
 *
 * @param {Bytes} bytes
 * @returns {string}
 */
export function bytesToString(bytes) {
  return bytes;
}

/**
 * Base64, as specified in https://tools.ietf.org/html/rfc4648#section-4
 *
 * @param {ByteSource} byteSource
 * @returns {string} base64 encoding
 */
export function dataToBase64(byteSource) {
  const bytes = coerceToByteArray(byteSource);
  return encodeBase64(bytes);
}

/**
 * Decodes a base64 string into bytes.
 *
 * @param {string} string Base64-encoded string
 * @returns {Bytes} decoded bytes
 */
export function base64ToBytes(string) {
  return toBytes(decodeBase64(string));
}
