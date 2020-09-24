import '@agoric/install-ses'; // adds 'harden' to global

import test from 'ava';
import { encode, decode, streamDecoder } from '../src/netstring';

const umlaut = 'ümlaut';
const umlautBuffer = Buffer.from(umlaut, 'utf-8');
// the following string may not render in your editor, but it contains four
// emoji glued together, which is frequently rendered as a single glyph.
const emoji = '👨‍👨‍👧‍👧';
const emojiBuffer = Buffer.from(emoji, 'utf-8');
// They are:
//  U+1F468 "MAN"
//  U+200D "ZERO WIDTH JOINER"
//  U+1F468 "MAN"
//  U+200D "ZERO WIDTH JOINER"
//  U+1F467 "GIRL"
//  U+200D "ZERO WIDTH JOINER"
//  U+1F467 "GIRL"

// The emoji are off the BMP and require two UTF-16 things, while the joiner
// only requires one. So JavaScript considers the length to be 2+1+2+1+2+1+2
// = 11. The UTF-8 encoding needs four bytes for the emoji, and three for the
// joiner, so the Buffer length is 4+3+4+3+4+3+4 = 25.

test('setup', t => {
  t.is(umlaut.length, 6);
  t.is(umlautBuffer.length, 7);
  t.is(emoji.length, 11);
  t.is(emojiBuffer.length, 25);
});

test('encode', t => {
  function eq(input, expected) {
    const encoded = encode(Buffer.from(input));
    const expBuf = Buffer.from(expected);
    if (encoded.compare(expBuf) !== 0) {
      console.log(`got : ${encoded}`);
      console.log(`want: ${expBuf}`);
    }
    t.deepEqual(encoded, expBuf);
  }

  eq('', '0:,');
  eq('a', '1:a,');
  eq('abc', '3:abc,');
  let expectedBuffer = Buffer.from(`7:${umlaut},`, 'utf-8');
  eq(umlautBuffer, expectedBuffer);
  expectedBuffer = Buffer.from(`25:${emoji},`, 'utf-8');
  eq(emojiBuffer, expectedBuffer);
});

test('decode', t => {
  function eq(input, expPayloads, expLeftover) {
    const encPayloads = expPayloads.map(Buffer.from);
    const encLeftover = Buffer.from(expLeftover);

    const { payloads, leftover } = decode(Buffer.from(input));
    t.deepEqual(payloads, encPayloads);
    t.deepEqual(leftover, encLeftover);
  }

  eq('', [], '');
  eq('0', [], '0');
  eq('0:', [], '0:');
  eq('0:,', [''], '');
  eq('0:,1', [''], '1');
  eq('0:,1:', [''], '1:');
  eq('0:,1:a', [''], '1:a');
  eq('0:,1:a,', ['', 'a'], '');

  let expectedBuffer = Buffer.from(`7:${umlaut},`, 'utf-8');
  eq(expectedBuffer, [umlaut], '');

  expectedBuffer = Buffer.from(`25:${emoji},`, 'utf-8');
  eq(expectedBuffer, [emoji], '');

  function bad(input, message) {
    t.throws(() => decode(Buffer.from(input)), { message });
  }

  // bad('a', 'non-numeric length prefix');
  bad('a:', `unparseable size 'a', should be integer`);
  bad('1:ab', 'malformed netstring: not terminated by comma');
});

async function* iterOf(array) {
  for (const item of array) {
    yield Promise.resolve(item);
  }
}

async function collect(iter) {
  const result = [];
  for await (const value of iter) {
    result.push(value);
  }
  return result;
}

test('decode stream', async t => {
  async function eq(inputBuffers, expectedPayloads) {
    const input = iterOf(inputBuffers.map(Buffer.from));
    const d = streamDecoder(input);
    const result = await collect(d);
    t.deepEqual(result, expectedPayloads.map(Buffer.from));
  }

  await eq([], []);
  await eq(['0'], []);
  await eq(['0', ':'], []);
  await eq(['0', ':', ','], ['']);
  await eq(['0', ':', ',', '1:'], ['']);
  await eq(['0', ':', ',', '1:', 'a,2:ab'], ['', 'a']);
  await eq(['0', ':', ',', '1:', 'a,2:ab', ','], ['', 'a', 'ab']);
  await eq(
    ['0', ':', ',', '1:', 'a,2:ab', ',', '3:abc,4:abcd,5:abcde,'],
    ['', 'a', 'ab', 'abc', 'abcd', 'abcde'],
  );

  let buffer = Buffer.from(`7:${umlaut},`, 'utf-8');
  await eq([buffer], [umlaut]);
  await eq([buffer.slice(0, 4), buffer.slice(4)], [umlaut]);

  buffer = Buffer.from(`25:${emoji},`, 'utf-8');
  await eq([buffer], [emoji]);
  await eq([buffer.slice(0, 3), buffer.slice(3)], [emoji]);
});
