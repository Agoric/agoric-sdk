/* eslint-disable class-methods-use-this */

// Save this XS extension before SES shim deletes it.
const { fromString } = ArrayBuffer;

class TextEncoder {
  encode(s) {
    return new Uint8Array(fromString(s));
  }
}

globalThis.TextEncoder = TextEncoder;
