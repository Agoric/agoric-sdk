/* global globalThis */
/* eslint-disable max-classes-per-file */
/* eslint-disable class-methods-use-this */

// Save this XS extension before SES shim deletes it.
const { fromString } = ArrayBuffer;
const { fromArrayBuffer } = String;

class TextEncoder {
  encode(s) {
    return new Uint8Array(fromString(s));
  }
}

class TextDecoder {
  decode(bytes) {
    // TODO: the following condition can be removed in a future update of XS.
    // https://github.com/Agoric/agoric-sdk/issues/3362
    if (ArrayBuffer.isView(bytes)) {
      bytes = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      );
    }
    return fromArrayBuffer(bytes);
  }
}

globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;
