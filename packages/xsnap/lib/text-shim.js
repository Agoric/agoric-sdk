/* global globalThis */
/* eslint-disable max-classes-per-file */
/* eslint-disable class-methods-use-this */

// Save this XS extension before SES shim deletes it.
const { fromString } = ArrayBuffer;
const { fromArrayBuffer } = String;

class TextEncoder {
  encode(text) {
    return new Uint8Array(fromString(text));
  }
}

class TextDecoder {
  decode(bytes) {
    if (bytes instanceof Uint8Array) {
      // There is no guarantee that the ArrayBuffer underlying a Uint8Array is
      // aligned at their respective 0 offsets, but the XS
      // String.fromArrayBuffer insists on receiving an ArrayBuffer.
      const temp = new Uint8Array(bytes.byteLength);
      temp.set(bytes);
      bytes = temp.buffer;
    }
    return fromArrayBuffer(bytes);
  }
}

globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;
