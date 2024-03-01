// @ts-check
/// <reference path="./types.js" />
import { encodeBase64, decodeBase64 } from '@endo/base64';

/** @typedef {Data | Buffer | Uint8Array | Iterable<number>} SourceData */

/**
 * @param {SourceData} contents
 */
const coerceToByteArray = contents => {
  if (typeof contents === 'string') {
    contents = contents.split('').map(c => c.charCodeAt(0));
  }
  if (contents instanceof Uint8Array) {
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
 * Convert some data to bytes.  We can use a local Iterable as a source for data
 * bytes, but we need to call `toBytes(it)` to obtain a passable value.
 *
 * NOTE: Passing a Uint8Array without calling this function is not yet supported
 * by `@endo/marshal`.
 *
 * @param {SourceData} data
 * @returns {Bytes}
 */
export function toBytes(data) {
  // We return the raw characters in the lower half of
  // the String's representation.
  const buf = coerceToByteArray(data);
  return String.fromCharCode.apply(null, buf);
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
 * @param {SourceData} data
 * @returns {string} base64 encoding
 */
export function dataToBase64(data) {
  const bytes = coerceToByteArray(data);
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
