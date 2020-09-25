import '@agoric/install-ses'; // adds 'harden' to global

import test from 'ava';
import { streamEncoder, streamDecoder } from '../src/worker-protocol';
import { encode } from '../src/netstring';

test('encode stream', async t => {
  const chunks = [];
  const write = streamEncoder(data => chunks.push(data));
  function eq(expected) {
    t.deepEqual(
      chunks.map(buf => buf.toString()),
      expected,
    );
  }

  write([1]);
  eq(['3:[1],']);

  write(['command', { foo: 4 }]);
  eq(['3:[1],', '21:["command",{"foo":4}],']);
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
  async function eq(inputChunks, expectedCommands) {
    const input = iterOf(inputChunks.map(Buffer.from));
    const d = streamDecoder(input);
    const result = await collect(d);
    t.deepEqual(result, expectedCommands);
  }

  await eq([], []);
  let buf = encode(Buffer.from(JSON.stringify([1])));
  await eq([buf], [[1]]);
  await eq([buf.slice(0, 1)], []);
  await eq([buf.slice(0, 1), buf.slice(1)], [[1]]);

  buf = encode(Buffer.from(JSON.stringify(['command', { foo: 2 }])));
  await eq([buf], [['command', { foo: 2 }]]);
  await eq([buf.slice(0, 4)], []);
  await eq(
    [buf.slice(0, 4), buf.slice(4, 5), buf.slice(5)],
    [['command', { foo: 2 }]],
  );
});
