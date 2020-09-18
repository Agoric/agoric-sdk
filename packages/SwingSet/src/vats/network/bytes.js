// @ts-check

import './types';

/* eslint-disable no-bitwise */
/*
 * Convert some data to bytes.
 *
 * @param {Data} data
 * @returns {Bytes}
 */
export function toBytes(data) {
  // TODO: We really need marshallable TypedArrays.
  if (typeof data === 'string') {
    data = data.split('').map(c => c.charCodeAt(0));
  }

  // We return the raw characters in the lower half of
  // the String's representation.
  const buf = new Uint8Array(data);
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

const BASE64_PADDING = '=';
const chars64 =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const lookup64 = i => chars64[i & 0x3f];

/**
 * Base64, as specified in https://tools.ietf.org/html/rfc4648#section-4
 *
 * @param {Data} data
 * @returns {string} base64 encoding
 */
export function dataToBase64(data) {
  const bytes = toBytes(data);
  const len = bytes.length;
  let quantum = 0;
  const b64 = [];
  let reg = 0;
  for (let i = 0; i < len; i += 1) {
    const b = bytes.charCodeAt(i) & 0xff;
    reg = (reg << 8) | b;
    quantum += 8;
    if (quantum === 24) {
      b64.push(
        lookup64(reg >>> 18),
        lookup64(reg >>> 12),
        lookup64(reg >>> 6),
        lookup64(reg),
      );
      reg = 0;
      quantum = 0;
    }
  }

  switch (quantum) {
    case 0:
      break;
    case 8:
      b64.push(
        lookup64(reg >>> 2),
        lookup64(reg << 4),
        BASE64_PADDING,
        BASE64_PADDING,
      );
      break;
    case 16:
      b64.push(
        lookup64(reg >>> 10),
        lookup64(reg >>> 4),
        lookup64(reg << 2),
        BASE64_PADDING,
      );
      break;
    default:
      throw Error(`internal: bad quantum ${quantum}`);
  }
  return b64.join('');
}

/**
 * @type {Record<string, number>}
 */
const revChars64 = {};
chars64.split('').forEach((c, i) => (revChars64[c] = i));

/**
 * The reverse of the above.
 *
 * @param {string} b64 Base64-encoded string
 * @returns {Bytes} decoded bytes
 */
export function base64ToBytes(b64) {
  const cs = b64.split('');
  const len = b64.length;
  let reg = 0;
  let quantum = 0;
  const bs = [];
  let i = 0;
  while (i < len && cs[i] !== BASE64_PADDING) {
    const j = revChars64[cs[i]];
    if (j === undefined) {
      throw Error(`Invalid base64 character ${cs[i]}`);
    }
    reg = (reg << 6) | j;
    quantum += 6;
    if (quantum >= 8) {
      quantum -= 8;
      bs.push(reg >>> quantum);
      reg &= (1 << quantum) - 1;
    }
    i += 1;
  }

  while (i < len && quantum % 8 !== 0) {
    if (cs[i] !== BASE64_PADDING) {
      throw Error(`Missing padding at ${cs[i]} (offset=${i})`);
    }
    i += 1;
    quantum += 6;
  }
  if (i < len) {
    throw Error(`Base64 string has trailing garbage ${b64.substr(i)}`);
  }
  return String.fromCharCode.apply(null, bs);
}
