/**
 * @typedef {object} HexCodec
 * @property {(buf: Uint8Array) => string} encodeHex
 * @property {(hex: string) => Uint8Array} decodeHex
 */

/** @type {string[]} */
const encodings = Array.from({ length: 256 }, (_, b) =>
  // Write the hex representation of the byte.
  b.toString(16).padStart(2, '0'),
);

/**
 * Create map entries for all four permutations of lowercase and uppercase
 * transformations of the two hex digits per byte. The map is keyed by the hex
 * string and the value is the byte value. This allows for fast lookups when
 * decoding hex strings.
 *
 * @type {Map<string, number>}
 */
const decodings = new Map(
  encodings.flatMap((hexdigits, b) => {
    const lo = hexdigits.toLowerCase();
    const UP = hexdigits.toUpperCase();
    return [
      [lo, b],
      [`${lo[0]}${UP[1]}`, b],
      [`${UP[0]}${lo[1]}`, b],
      [UP, b],
    ];
  }),
);

/**
 * Create a hex codec that is portable across standard JS environments.
 *
 * @returns {HexCodec}
 */
export const makePortableHexCodec = () => {
  /** @type {HexCodec} */
  const portableHexCodec = {
    encodeHex: buf => Array.from(buf, b => encodings[b]).join(''),
    decodeHex: hex => {
      const inputLen = hex.length;
      if (inputLen % 2 !== 0) {
        throw new Error(`Invalid hex string: ${hex}`);
      }
      const buf = new Uint8Array(inputLen / 2);
      for (let i = 0; i < inputLen; i += 2) {
        const b = decodings.get(hex.slice(i, i + 2));
        if (b === undefined) {
          throw new Error(`Invalid hex string: ${hex}`);
        }
        // eslint-disable-next-line no-bitwise
        buf[i >> 1] = b;
      }
      return buf;
    },
  };

  return portableHexCodec;
};

/**
 * @typedef {Pick<BufferConstructor, 'from' | 'isBuffer'> & {
 *   prototype: Pick<Buffer, 'toString'> & Uint8Array;
 * }} BufferishConstructor
 *   is the portion of the Node.js Buffer API we need for hex conversion.
 */

/**
 * Create a hex codec using parts of the Node.js Buffer API.
 *
 * @param {BufferishConstructor} Bufferish the object that implements the
 *   necessary pieces of Buffer
 * @returns {HexCodec}
 */
export const makeBufferishHexCodec = Bufferish => {
  /** @type {HexCodec} */
  const attenuatedBufferHexCodec = {
    encodeHex: buf =>
      (Bufferish.isBuffer?.(buf) ? buf : Bufferish.from(buf)).toString('hex'),
    decodeHex: hex => {
      const buf = Bufferish.from(hex, 'hex');

      // Coerce to Uint8Array to avoid leaking the abstraction.
      const u8a = new Uint8Array(
        buf.buffer,
        buf.byteOffset,
        buf.byteLength / Uint8Array.BYTES_PER_ELEMENT,
      );
      return u8a;
    },
  };
  return attenuatedBufferHexCodec;
};

/**
 * Export a hex codec that can work with standard JS engines, but takes
 * advantage of optimizations on some platforms (like Node.js's Buffer API).
 */
export const { encodeHex, decodeHex } =
  typeof Buffer === 'undefined'
    ? makePortableHexCodec()
    : makeBufferishHexCodec(Buffer);
