/**
 * Shim TextEncoder using XS ArrayBuffer.fromString
 * and likewise TextDecoder using String.fromArrayBuffer.
 * Note lockdown() will remove those XS extensions,
 * so run this shim first.
 *
 * Note issue #2118: UTF-8 in XS: compatibility, security impact?
 * https://github.com/Agoric/agoric-sdk/issues/2118
 */
/* eslint-disable class-methods-use-this */
/* eslint-disable max-classes-per-file */

/**
 * minimal TextDecoder
 * No support for encodeInto.
 *
 * ref https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder
 */
class TextEncoder {
  get encoding() {
    return 'utf-8';
  }

  encode(s) {
    return new Uint8Array(ArrayBuffer.fromString(s));
  }
}

const UTF8Names = ['unicode-1-1-utf-8', 'utf-8', 'utf8'];

/**
 * minimal utf-8 TextDecoder
 * no support for fatal, stream, etc.
 *
 * ref https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder
 */
class TextDecoder {
  /**
   * @param {string=} utfLabel optional name for UTF-8
   * @param {*} options fatal is not supported
   */
  constructor(utfLabel, options) {
    if (utfLabel && !UTF8Names.includes(utfLabel)) {
      throw new TypeError(utfLabel);
    }
    if (options && options.fatal) {
      throw new TypeError('fatal not supported');
    }
  }

  /**
   * @param {Uint8Array} bytes
   * @param {*} options stream is not supported
   */
  decode(bytes, options) {
    if (options && options.stream) {
      throw new TypeError('stream is unsupported');
    }
    if (!(bytes instanceof Uint8Array)) {
      throw new TypeError('arg must be Uint8Array');
    }
    return String.fromArrayBuffer(bytes.buffer);
  }
}

globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;
