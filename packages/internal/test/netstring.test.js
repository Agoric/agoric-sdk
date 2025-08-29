/* eslint-env node */
import test from 'ava';

import {
  encode,
  decode,
  netstringEncoderStream,
  netstringDecoderStream,
} from '../src/netstring.js';
import { fromString, concatUint8Arrays } from '../src/uint8array-utils.js';

const umlaut = 'ümlaut';
const umlautArray = fromString(umlaut);
// the following string may not render in your editor, but it contains four
// emoji glued together, which is frequently rendered as a single glyph.
const emoji = '👨‍👨‍👧‍👧';
const emojiArray = fromString(emoji);
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
// joiner, so the Uint8Array length is 4+3+4+3+4+3+4 = 25.

test('setup', t => {
  t.is(umlaut.length, 6);
  t.is(umlautArray.length, 7);
  t.is(emoji.length, 11);
  t.is(emojiArray.length, 25);
});

test('encode', t => {
  function eq(input, expected) {
    const encoded = encode(fromString(input));
    const expArray = fromString(expected);
    t.deepEqual(encoded, expArray);
  }

  eq('', '0:,');
  eq('a', '1:a,');
  eq('abc', '3:abc,');
  
  // Test umlaut directly
  const umlautEncoded = encode(umlautArray);
  const umlautExpected = fromString(`7:${umlaut},`);
  t.deepEqual(umlautEncoded, umlautExpected);
  
  // Test emoji directly  
  const emojiEncoded = encode(emojiArray);
  const emojiExpected = fromString(`25:${emoji},`);
  t.deepEqual(emojiEncoded, emojiExpected);
});

test('encode stream', t => {
  const e = netstringEncoderStream();
  const chunks = [];
  e.on('data', data => chunks.push(data));
  e.write(new Uint8Array(0));
  // Note: Node.js streams automatically convert Uint8Array to Buffer
  const b1 = chunks[0];
  t.deepEqual(Array.from(b1), Array.from(fromString('0:,')));
  e.write(fromString('hello'));
  t.is(chunks.length, 2);
  const b2 = chunks[1];
  t.deepEqual(Array.from(b2), Array.from(fromString('5:hello,')));
  e.write(umlautArray);
  t.is(chunks.length, 3);
  const b3 = chunks[2];
  const expected3 = concatUint8Arrays([fromString('7:'), umlautArray, fromString(',')]);
  t.deepEqual(Array.from(b3), Array.from(expected3));
  e.write(emojiArray);
  t.is(chunks.length, 4);
  const b4 = chunks[3];
  const expected4 = concatUint8Arrays([fromString('25:'), emojiArray, fromString(',')]);
  t.deepEqual(Array.from(b4), Array.from(expected4));

  e.end();
  t.is(chunks.length, 4); // Should not have added more chunks
});

test('decode', t => {
  function eq(input, expPayloads, expLeftover) {
    const encPayloads = expPayloads.map(fromString);
    const encLeftover = fromString(expLeftover);

    const { payloads, leftover } = decode(fromString(input), 25);
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

  let expectedArray = fromString(`7:${umlaut},`);
  const { payloads: umlautPayloads, leftover: umlautLeftover } = decode(expectedArray, 25);
  t.deepEqual(umlautPayloads, [umlautArray]);
  t.deepEqual(umlautLeftover, new Uint8Array(0));

  expectedArray = fromString(`25:${emoji},`);
  const { payloads: emojiPayloads, leftover: emojiLeftover } = decode(expectedArray, 25);
  t.deepEqual(emojiPayloads, [emojiArray]);
  t.deepEqual(emojiLeftover, new Uint8Array(0));

  function bad(input, message) {
    t.throws(() => decode(fromString(input), 25), { message });
  }

  // bad('a', 'non-numeric length prefix');
  bad('a:', /unparsable size .*, should be integer/);
  bad('1:ab', 'malformed netstring: not terminated by comma');
  bad('26:x', /size .* exceeds limit of 25/);
});

test('decode stream', t => {
  const d = netstringDecoderStream();
  function write(s) {
    d.write(fromString(s));
  }

  const msgs = [];
  d.on('data', msg => msgs.push(msg));

  function eq(expectedMessages) {
    t.deepEqual(msgs, expectedMessages.map(fromString));
  }

  write('');
  eq([]);
  write('0');
  eq([]);
  write(':');
  eq([]);
  write(',');
  eq(['']);

  write('1:');
  eq(['']);
  write('a,2:ab');
  eq(['', 'a']);
  write(',');
  eq(['', 'a', 'ab']);
  write('3:abc,4:abcd,5:abcde,');
  eq(['', 'a', 'ab', 'abc', 'abcd', 'abcde']);
});
