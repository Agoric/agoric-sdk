import '@endo/init/debug.js';

// @ts-check
import test from 'ava';

import { fc, testProp } from '@fast-check/ava';
import { makePortableHexCodec, makeBufferishHexCodec } from '../src/hex.js';

const codecs = /** @type {const} */ ([
  ['portable', makePortableHexCodec()],
  ['bufferish', makeBufferishHexCodec(Buffer)],
]);

for (const [name, { encodeHex, decodeHex }] of codecs) {
  test(`${name}: encodeHex empty`, t => {
    t.is(encodeHex(new Uint8Array(0)), '');
  });

  test(`${name}: encodeHex produces lowercase hex`, t => {
    t.is(encodeHex(new Uint8Array([0, 1, 127, 128, 255])), '00017f80ff');
  });

  test(`${name}: decodeHex empty`, t => {
    t.deepEqual(decodeHex(''), new Uint8Array(0));
  });

  test(`${name}: decodeHex lowercase`, t => {
    t.deepEqual(decodeHex('00017f80ff'), new Uint8Array([0, 1, 127, 128, 255]));
  });

  test(`${name}: decodeHex uppercase`, t => {
    t.deepEqual(decodeHex('00017F80FF'), new Uint8Array([0, 1, 127, 128, 255]));
  });

  test(`${name}: decodeHex mixed case`, t => {
    t.deepEqual(
      decodeHex('aAbBcCdDeEfF'),
      new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff]),
    );
  });

  test(`${name}: decodeHex rejects odd-length input`, t => {
    t.throws(() => decodeHex('abc'), { message: /Invalid hex string/ });
  });

  test(`${name}: decodeHex rejects non-hex characters`, t => {
    t.throws(() => decodeHex('gg'), { message: /Invalid hex string/ });
  });

  test(`${name}: decodeHex rejects invalid chars mid-string`, t => {
    t.throws(() => decodeHex('00gg00'), { message: /Invalid hex string/ });
  });

  test(`${name}: round-trip encodeHex -> decodeHex`, t => {
    const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    t.deepEqual(decodeHex(encodeHex(bytes)), bytes);
  });

  test(`${name}: decodeHex returns a plain Uint8Array`, t => {
    const result = decodeHex('ff');
    t.true(result instanceof Uint8Array);
    t.false(Buffer.isBuffer(result));
  });

  testProp(
    `${name}: round-trip arbitrary bytes`,
    [fc.uint8Array()],
    (t, bytes) => {
      t.deepEqual(decodeHex(encodeHex(bytes)), bytes);
    },
  );
}
