/* eslint-env node */
import test from 'ava';

import {
  encode,
  decode,
  netstringEncoderStream,
  netstringDecoderStream,
} from '../src/netstring.js';

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

test('encode stream', t => {
  const e = netstringEncoderStream();
  const chunks = [];
  e.on('data', data => chunks.push(data));
  e.write(Buffer.from(''));
  const b1 = Buffer.from('0:,');
  t.deepEqual(Buffer.concat(chunks), b1);
  e.write(Buffer.from('hello'));
  const b2 = Buffer.from('5:hello,');
  t.deepEqual(Buffer.concat(chunks), Buffer.concat([b1, b2]));
  e.write(umlautBuffer);
  const b3 = Buffer.concat([Buffer.from('7:'), umlautBuffer, Buffer.from(',')]);
  t.deepEqual(Buffer.concat(chunks), Buffer.concat([b1, b2, b3]));
  e.write(emojiBuffer);
  const b4 = Buffer.concat([Buffer.from('25:'), emojiBuffer, Buffer.from(',')]);
  t.deepEqual(Buffer.concat(chunks), Buffer.concat([b1, b2, b3, b4]));

  e.end();
  t.deepEqual(Buffer.concat(chunks), Buffer.concat([b1, b2, b3, b4]));
});

test('decode', t => {
  function eq(input, expPayloads, expLeftover) {
    const encPayloads = expPayloads.map(Buffer.from);
    const encLeftover = Buffer.from(expLeftover);

    const { payloads, leftover } = decode(Buffer.from(input), 25);
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
    t.throws(() => decode(Buffer.from(input), 25), { message });
  }

  // bad('a', 'non-numeric length prefix');
  bad('a:', /unparsable size .*, should be integer/);
  bad('1:ab', 'malformed netstring: not terminated by comma');
  bad('26:x', /size .* exceeds limit of 25/);
});

test('decode stream', t => {
  const d = netstringDecoderStream();
  function write(s) {
    d.write(Buffer.from(s));
  }

  const msgs = [];
  d.on('data', msg => msgs.push(msg));

  function eq(expectedMessages) {
    t.deepEqual(msgs, expectedMessages.map(Buffer.from));
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
