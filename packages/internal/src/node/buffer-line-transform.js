/* eslint-env node */
/* eslint-disable no-underscore-dangle */

import { Transform } from 'node:stream';
import { concatUint8Arrays, fromString, toString, isUint8Array, fromData } from '../uint8array-utils.js';

/**
 * @typedef {object} Uint8ArrayLineTransformOptions
 * @property {Uint8Array | string | number} [break] line break matcher for
 *   Uint8Array.indexOf() (default: 10)
 * @property {BufferEncoding} [breakEncoding] if break is a string, the encoding
 *   to use
 */

export default class BufferLineTransform extends Transform {
  /**
   * The BufferLineTransform is reading String or Uint8Array content from a Readable
   * stream and writing each line as a Uint8Array in object mode
   *
   * @param {import('node:stream').TransformOptions &
   *   Uint8ArrayLineTransformOptions} [options]
   */
  constructor(options) {
    const {
      break: breakValue,
      breakEncoding,
      ...transformOptions
    } = options || {};
    super({ ...transformOptions, readableObjectMode: true });
    this._breakValue = breakValue || 10;
    this._breakEncoding = breakEncoding;

    /** @type {number} */
    let breakLength;
    if (!breakValue || typeof breakValue === 'number') {
      breakLength = 1;
    } else if (isUint8Array(breakValue)) {
      breakLength = breakValue.length;
    } else {
      breakLength = fromData(breakValue, breakEncoding).length;
    }
    this._breakLength = breakLength;

    /** @type {Uint8Array[]} */
    this._chunks = [];
  }

  /**
   * Find the index of the break value in the buffer
   * @param {Uint8Array} buf 
   * @returns {number} index or -1 if not found
   */
  _findBreakIndex(buf) {
    if (typeof this._breakValue === 'number') {
      return buf.indexOf(this._breakValue);
    }
    
    // For string or Uint8Array break values, we need to search manually
    const breakBytes = isUint8Array(this._breakValue) 
      ? this._breakValue 
      : fromData(this._breakValue, this._breakEncoding);
      
    // Simple search for the break pattern
    for (let i = 0; i <= buf.length - breakBytes.length; i++) {
      let found = true;
      for (let j = 0; j < breakBytes.length; j++) {
        if (buf[i + j] !== breakBytes[j]) {
          found = false;
          break;
        }
      }
      if (found) {
        return i;
      }
    }
    return -1;
  }

  /**
   * @param {any} chunk
   * @param {BufferEncoding | 'buffer'} encoding
   * @param {import('node:stream').TransformCallback} cb
   * @override
   */
  _transform(chunk, encoding, cb) {
    try {
      /** @type {Uint8Array} */
      let buf =
        isUint8Array(chunk) || encoding === 'buffer'
          ? chunk
          : fromData(chunk, encoding);

      // In case the break value is more than a single byte, it may span
      // multiple chunks. Since Node doesn't provide a way to get partial
      // search result, fallback to a less optimal early concatenation
      if (this._breakLength > 1 && this._chunks.length) {
        buf = concatUint8Arrays([/** @type {Uint8Array} */ (this._chunks.pop()), buf]);
      }

      while (buf.length) {
        const offset = this._findBreakIndex(buf);

        /** @type {number} */
        let endOffset;
        if (offset >= 0) {
          endOffset = offset + this._breakLength;
          if (this._chunks.length) {
            const totalChunksLength = this._chunks.reduce(
              (acc, { length }) => acc + length,
              0,
            );
            this._writeItem(
              concatUint8Arrays(
                [...this._chunks.splice(0, this._chunks.length), buf.subarray(0, endOffset)],
                totalChunksLength + endOffset,
              ),
            );
          } else {
            this._writeItem(buf.subarray(0, endOffset));
          }
        } else {
          endOffset = buf.length;
          this._chunks.push(buf);
        }
        buf = buf.subarray(endOffset);
      }
      cb();
    } catch (err) {
      cb(/** @type {any} */ (err)); // invalid data type;
    }
  }

  /**
   * @param {import('node:stream').TransformCallback} cb
   * @override
   */
  _flush(cb) {
    if (this._chunks.length) {
      this._writeItem(
        concatUint8Arrays(this._chunks.splice(0, this._chunks.length)),
      );
    }
    cb();
  }

  /** @param {Uint8Array} line */
  _writeItem(line) {
    if (this.readableEncoding) {
      this.push(toString(line), this.readableEncoding);
    } else {
      this.push(line);
    }
  }
}
