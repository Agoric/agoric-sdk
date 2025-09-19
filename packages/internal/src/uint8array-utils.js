/* eslint-env node */

/**
 * Utility functions for Uint8Array operations to replace Node.js Buffer functionality
 */

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Concatenate multiple Uint8Arrays into a single Uint8Array
 * 
 * @param {Uint8Array[]} arrays - Arrays to concatenate
 * @param {number} [totalLength] - Optional total length for optimization
 * @returns {Uint8Array} Concatenated array
 */
export function concatUint8Arrays(arrays, totalLength) {
  if (!arrays.length) {
    return new Uint8Array(0);
  }
  
  if (arrays.length === 1) {
    return arrays[0];
  }

  // Calculate total length if not provided
  const length = totalLength ?? arrays.reduce((sum, arr) => sum + arr.length, 0);
  
  const result = new Uint8Array(length);
  let offset = 0;
  
  for (const array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }
  
  return result;
}

/**
 * Create a Uint8Array from a string using UTF-8 encoding
 * 
 * @param {string} str - String to encode
 * @returns {Uint8Array} Encoded bytes
 */
export function fromString(str) {
  return textEncoder.encode(str);
}

/**
 * Convert a Uint8Array to a string using UTF-8 decoding
 * 
 * @param {Uint8Array} uint8Array - Bytes to decode
 * @returns {string} Decoded string
 */
export function toString(uint8Array) {
  return textDecoder.decode(uint8Array);
}

/**
 * Create a Uint8Array from a hex string
 * 
 * @param {string} hex - Hex string to decode
 * @returns {Uint8Array} Decoded bytes
 */
export function fromHex(hex) {
  if (hex.length % 2 !== 0) {
    throw new Error(`Invalid hex string: ${hex}`);
  }
  
  const result = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error(`Invalid hex string: ${hex}`);
    }
    result[i / 2] = byte;
  }
  
  return result;
}

/**
 * Convert a Uint8Array to a hex string
 * 
 * @param {Uint8Array} uint8Array - Bytes to encode
 * @returns {string} Hex string
 */
export function toHex(uint8Array) {
  return Array.from(uint8Array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if a value is a Uint8Array (replacement for Buffer.isBuffer)
 * 
 * @param {any} value - Value to check
 * @returns {boolean} True if value is a Uint8Array
 */
export function isUint8Array(value) {
  return value instanceof Uint8Array;
}

/**
 * Create a Uint8Array from an array-like object or another Uint8Array
 * 
 * @param {ArrayLike<number> | Uint8Array | string} source - Source data
 * @param {string} [encoding] - Encoding for string sources (ignored, always uses UTF-8)
 * @returns {Uint8Array} New Uint8Array
 */
export function fromData(source, encoding) {
  if (typeof source === 'string') {
    return fromString(source);
  }
  
  if (source instanceof Uint8Array) {
    return source;
  }
  
  return new Uint8Array(source);
}