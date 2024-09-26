/* eslint-env node */
import { Transform } from 'stream';

// Transform objects which convert from hardened Arrays of JSON-serializable
// data into Buffers suitable for netstring conversion.

export function arrayEncoderStream() {
  /**
   * @param {any} object
   * @param {BufferEncoding} encoding
   * @param {any} callback
   * @this {{ push: (b: Buffer) => void }}
   */
  function transform(object, encoding, callback) {
    if (!Array.isArray(object)) {
      throw Error('stream requires Arrays');
    }
    let err;
    try {
      this.push(Buffer.from(JSON.stringify(object)));
    } catch (e) {
      err = e;
    }
    callback(err);
  }
  // Array in, Buffer out, hence writableObjectMode
  return new Transform({ transform, writableObjectMode: true });
}

export function arrayDecoderStream() {
  /**
   * @param {Buffer} buf
   * @param {BufferEncoding} encoding
   * @param {any} callback
   * @this {{ push: (b: Buffer) => void }}
   */
  function transform(buf, encoding, callback) {
    let err;
    try {
      if (!Buffer.isBuffer(buf)) {
        throw Error('stream expects Buffers');
      }
      this.push(JSON.parse(buf.toString()));
    } catch (e) {
      err = e;
    }
    // this Transform is a one-to-one conversion of Buffer into Array, so we
    // always consume the input each time we're called
    callback(err);
  }

  // Buffer in, Array out, hence readableObjectMode
  return new Transform({ transform, readableObjectMode: true });
}
