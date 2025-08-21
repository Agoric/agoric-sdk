/* eslint-env node */
import { Transform } from 'stream';
import { fromString, toString, isUint8Array } from '../uint8array-utils.js';

// Transform objects which convert from hardened Arrays of JSON-serializable
// data into Uint8Arrays suitable for netstring conversion.

export function arrayEncoderStream() {
  /**
   * @param {any} object
   * @param {BufferEncoding} encoding
   * @param {any} callback
   * @this {{ push: (b: Uint8Array) => void }}
   */
  function transform(object, encoding, callback) {
    if (!Array.isArray(object)) {
      throw Error('stream requires Arrays');
    }
    let err;
    try {
      this.push(fromString(JSON.stringify(object)));
    } catch (e) {
      err = e;
    }
    callback(err);
  }
  // Array in, Uint8Array out, hence writableObjectMode
  return new Transform({ transform, writableObjectMode: true });
}

export function arrayDecoderStream() {
  /**
   * @param {Uint8Array} buf
   * @param {BufferEncoding} encoding
   * @param {any} callback
   * @this {{ push: (b: any) => void }}
   */
  function transform(buf, encoding, callback) {
    let err;
    try {
      if (!isUint8Array(buf)) {
        throw Error('stream expects Uint8Arrays');
      }
      this.push(JSON.parse(toString(buf)));
    } catch (e) {
      err = e;
    }
    // this Transform is a one-to-one conversion of Uint8Array into Array, so we
    // always consume the input each time we're called
    callback(err);
  }

  // Uint8Array in, Array out, hence readableObjectMode
  return new Transform({ transform, readableObjectMode: true });
}
