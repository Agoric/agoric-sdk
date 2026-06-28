// @ts-check
import test from 'ava';

import { makePortableHexCodec, makeBufferishHexCodec } from '../src/hex.js';

/**
 * The two codecs must be observationally equivalent: whichever one a platform
 * selects, `encodeHex`/`decodeHex` must accept and reject the same inputs and
 * produce the same bytes. The portable codec is the reference; the Bufferish
 * codec is exercised through Node's real `Buffer`.
 */
/** @type {Array<[string, import('../src/hex.js').HexCodec]>} */
const codecs = [
  ['portable', makePortableHexCodec()],
  ['bufferish', makeBufferishHexCodec(Buffer)],
];

/** @type {Array<[string, number[]]>} valid input -> expected bytes */
const validCases = [
  ['', []],
  ['00', [0x00]],
  ['41', [0x41]],
  ['ff', [0xff]],
  ['deadbeef', [0xde, 0xad, 0xbe, 0xef]],
  ['DEADBEEF', [0xde, 0xad, 0xbe, 0xef]],
  ['DeAdBeEf', [0xde, 0xad, 0xbe, 0xef]],
  ['0a0B', [0x0a, 0x0b]],
];

/** Inputs both codecs must reject by throwing `Invalid hex string: ...`. */
const invalidCases = [
  'f', // odd length, single nibble
  'abc', // odd length with a valid prefix
  '012', // odd length
  'zz', // non-hex characters
  'GG', // non-hex uppercase
  'gg', // non-hex lowercase
  'xy', // non-hex characters
  'abxc', // non-hex character mid-string
  'abcx', // non-hex character at the tail of an even-length string
  '12 34', // embedded whitespace
  '0x41', // hex literal prefix is not valid hex
];

for (const [name, codec] of codecs) {
  for (const [hex, bytes] of validCases) {
    test(`${name} decodeHex accepts valid input ${JSON.stringify(hex)}`, t => {
      t.deepEqual([...codec.decodeHex(hex)], bytes);
    });
  }

  for (const hex of invalidCases) {
    test(`${name} decodeHex rejects invalid input ${JSON.stringify(hex)}`, t => {
      t.throws(() => codec.decodeHex(hex), {
        message: `Invalid hex string: ${hex}`,
      });
    });
  }

  test(`${name} encodeHex round-trips and normalizes to lowercase`, t => {
    for (const [hex] of validCases) {
      const round = codec.encodeHex(codec.decodeHex(hex));
      t.is(round, hex.toLowerCase());
    }
  });

  test(`${name} decodeHex round-trips arbitrary bytes`, t => {
    const all = Uint8Array.from({ length: 256 }, (_, b) => b);
    t.deepEqual([...codec.decodeHex(codec.encodeHex(all))], [...all]);
  });
}

test('both codecs agree on every accept/reject decision', t => {
  const [, portable] = codecs[0];
  const [, bufferish] = codecs[1];
  for (const [hex] of validCases) {
    t.deepEqual(
      [...bufferish.decodeHex(hex)],
      [...portable.decodeHex(hex)],
      `accepted bytes disagree for ${JSON.stringify(hex)}`,
    );
  }
  for (const hex of invalidCases) {
    const portableThrew = t.throws(() => portable.decodeHex(hex));
    const bufferishThrew = t.throws(() => bufferish.decodeHex(hex));
    t.is(
      bufferishThrew?.message,
      portableThrew?.message,
      `rejection message disagrees for ${JSON.stringify(hex)}`,
    );
  }
});
