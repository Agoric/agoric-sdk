import '@agoric/install-ses'; // adds 'harden' to global

import test from 'ava';
import { encode, encoderStream, decode, decoderStream } from '../src/netstring';

const umlaut = 'ümlaut';
const umlautBuffer = Buffer.from(umlaut, 'utf-8');

test('setup', t => {
  t.is(umlaut.length, 6);
  t.is(umlautBuffer.length, 7);
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
  const expectedBuffer = Buffer.from(`7:${umlaut},`, 'utf-8');
  eq(umlautBuffer, expectedBuffer);
});

test('encode stream', async t => {
  const e = encoderStream();
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
  e.end();
  t.deepEqual(Buffer.concat(chunks), Buffer.concat([b1, b2, b3]));
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

  const expectedBuffer = Buffer.from(`7:${umlaut},`, 'utf-8');
  eq(expectedBuffer, [umlaut], '');

  function bad(input, message) {
    t.throws(() => decode(Buffer.from(input)), { message });
  }

  // bad('a', 'non-numeric length prefix');
  bad('a:', `unparseable size 'a', should be integer`);
  bad('1:ab', 'malformed netstring: not terminated by comma');
});

test('decode stream', async t => {
  const d = decoderStream();
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
