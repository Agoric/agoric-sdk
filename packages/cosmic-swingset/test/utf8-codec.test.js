import '@endo/init/debug.js';
import test from 'ava';
import { Worker } from 'node:worker_threads';
import { once } from 'node:events';
import {
  makeTextDecoder,
  makeTextEncoder,
  makeTransferBuffer,
  makeTransferClient,
} from '../src/helpers/sync-xfer.js';

test('UTF-8 decoder rejects an incomplete final code point', t => {
  const decoder = makeTextDecoder();
  decoder.next();
  decoder.next(Uint8Array.of(0xf0, 0x9f, 0xa6));
  t.throws(() => decoder.next(), { instanceOf: TypeError });
});

test('text encoder reports byte counts written into the supplied buffer', t => {
  const encoder = makeTextEncoder('AB😀Z');
  const buffer = new Uint8Array(4);
  encoder.next();
  t.deepEqual(encoder.next(buffer), { value: 2, done: false });
  t.deepEqual(Array.from(buffer.subarray(0, 2)), [65, 66]);
  t.deepEqual(encoder.next(buffer), { value: 4, done: false });
  t.deepEqual(Array.from(buffer), [0xf0, 0x9f, 0x98, 0x80]);
  t.deepEqual(encoder.next(buffer), { value: 1, done: true });
  t.is(buffer[0], 90);
});

const encodeWithCapacity = (input, capacity) => {
  const encoder = makeTextEncoder(input);
  const destination = new Uint8Array(capacity);
  const bytes = [];
  encoder.next();
  for (let step = 0; step <= input.length; step += 1) {
    destination.fill(0xff);
    const next = encoder.next(destination);
    if (typeof next.value !== 'number')
      throw Error('Expected an explicit byte count');
    bytes.push(...destination.subarray(0, next.value));
    if (next.done) return Uint8Array.from(bytes);
    if (next.value === 0)
      throw Error('Encoder yielded without making progress');
  }
  throw Error('Encoder failed to finish');
};

for (const value of [
  '',
  'ASCII\0',
  'éλ',
  '文€',
  '😀🦉',
  '\ufeffleading BOM',
  'Aé文😀\0\ufeff',
  '\u{10ffff}',
]) {
  test(`strict decoder preserves all byte splits of ${JSON.stringify(value)}`, t => {
    const bytes = new TextEncoder().encode(value);
    for (let split = 0; split <= bytes.length; split += 1) {
      const decoder = makeTextDecoder();
      decoder.next();
      decoder.next(bytes.subarray(0, split));
      decoder.next(bytes.subarray(split));
      t.deepEqual(decoder.next(), { value, done: true });
    }
  });
}

for (const bytes of [
  [0x80],
  [0xff],
  [0xc0, 0xaf],
  [0xe2, 0x28, 0xa1],
  [0xed, 0xa0, 0x80],
  [0xf0, 0x80, 0x80, 0xaf],
  [0xf4, 0x90, 0x80, 0x80],
]) {
  test(`strict decoder rejects malformed UTF-8 ${bytes.join(',')}`, t => {
    for (let split = 0; split <= bytes.length; split += 1) {
      t.throws(
        () => {
          const decoder = makeTextDecoder();
          decoder.next();
          decoder.next(Uint8Array.from(bytes.slice(0, split)));
          decoder.next(Uint8Array.from(bytes.slice(split)));
          decoder.next();
        },
        { instanceOf: TypeError },
      );
    }
  });
}

for (const bytes of [[0xc2], [0xe2, 0x82], [0xf0, 0x9f, 0x98], [0xef, 0xbb]]) {
  test(`strict decoder final flush rejects truncated UTF-8 ${bytes.join(',')}`, t => {
    const decoder = makeTextDecoder();
    decoder.next();
    t.false(Boolean(decoder.next(Uint8Array.from(bytes)).done));
    t.throws(() => decoder.next(), { instanceOf: TypeError });
  });
}

for (const [
  input,
  expected,
  capacity,
] of /** @type {[string, string, number][]} */ ([
  ['', '', 0],
  ['ASCII\0text', 'ASCII\0text', 1],
  ['éλ', 'éλ', 2],
  ['文€', '文€', 3],
  ['😀🦉', '😀🦉', 4],
  ['Aé文😀\0\ufeff', 'Aé文😀\0\ufeff', 4],
  ['\ud800', '\ufffd', 3],
  ['\udc00', '\ufffd', 3],
  ['a\ud800b\udc00c', 'a\ufffdb\ufffdc', 4],
  ['\ud800\ud800', '\ufffd\ufffd', 3],
])) {
  test(`incremental encoding preserves ${JSON.stringify(input)} with capacity ${capacity}`, t => {
    t.deepEqual(
      encodeWithCapacity(input, capacity),
      new TextEncoder().encode(expected),
    );
  });
}

for (const [input, capacity] of /** @type {[string, number][]} */ ([
  ['a', 0],
  ['é', 1],
  ['文', 2],
  ['😀', 3],
  ['\ud800', 2],
  ['a😀', 3],
])) {
  test(`encoding ${JSON.stringify(input)} rejects insufficient capacity ${capacity}`, t => {
    t.throws(() => encodeWithCapacity(input, capacity), {
      message: /cannot fit the next code point/,
    });
  });
}

test('encoder uses the destination supplied on every resume', t => {
  const encoder = makeTextEncoder('aé🦉z');
  encoder.next();
  for (const [
    capacity,
    value,
    done,
  ] of /** @type {[number, string, boolean][]} */ ([
    [1, 'a', false],
    [2, 'é', false],
    [4, '🦉', false],
    [1, 'z', true],
  ])) {
    const destination = new Uint8Array(capacity);
    t.deepEqual(encoder.next(destination), { value: capacity, done });
    t.deepEqual(destination, new TextEncoder().encode(value));
  }
});

const makeWorker = t => {
  const worker = new Worker(
    new URL('fixtures/sync-xfer-worker.js', import.meta.url),
  );
  t.teardown(() => worker.terminate());
  return worker;
};

test('worker text transfers reuse a tiny buffer without exposing unwritten suffixes', async t => {
  const worker = makeWorker(t);
  const client = makeTransferClient(makeTransferBuffer(12));
  for (const [text, expected] of [
    ['é'.repeat(20), 'é'.repeat(20)],
    ['x', 'x'],
    ['', ''],
    ['🦉文\0a', '🦉文\0a'],
    ['\ufeffBOM', '\ufeffBOM'],
    ['a\ud800b\udc00c', 'a\ufffdb\ufffdc'],
  ]) {
    const written = once(worker, 'message');
    client.prepareToRead(buf =>
      worker.postMessage({ buf, mode: 'text', text, reuse: true }),
    );
    t.is(client.read(makeTextDecoder()), expected);
    t.deepEqual(await written, ['written']);
  }
});

test('insufficient UTF-8 capacity fails both endpoints without returning partial text', async t => {
  const worker = makeWorker(t);
  const client = makeTransferClient(makeTransferBuffer(11));
  const written = once(worker, 'message');
  t.throws(
    () => {
      client.prepareToRead(buf =>
        worker.postMessage({ buf, mode: 'text', text: 'a😀' }),
      );
      client.read(makeTextDecoder());
    },
    { message: /aborted by peer/ },
  );
  const [failure] = await written;
  t.regex(failure.error, /capacity 3 cannot fit the next code point/);
});

for (const chunks of [
  [Uint8Array.of(0xff)],
  [Uint8Array.of(0xf0), Uint8Array.of(0x9f, 0x98)],
]) {
  test(`invalid UTF-8 transfer aborts the writer: ${chunks.map(chunk => Array.from(chunk).join(',')).join(';')}`, async t => {
    const worker = makeWorker(t);
    const client = makeTransferClient(makeTransferBuffer(12));
    const written = once(worker, 'message');
    client.prepareToRead(buf => worker.postMessage({ buf, chunks }));
    t.throws(() => client.read(makeTextDecoder()), { instanceOf: TypeError });
    const [failure] = await written;
    t.regex(failure.error, /aborted by peer/);
  });
}

for (const mode of ['bad-yield-count', 'bad-return-count']) {
  for (const count of [-1, 0.5, NaN, Infinity, 5]) {
    test(`${mode} rejects byte count ${count}`, async t => {
      const worker = makeWorker(t);
      const client = makeTransferClient(makeTransferBuffer(12));
      const written = once(worker, 'message');
      t.throws(
        () => {
          client.prepareToRead(buf => worker.postMessage({ buf, mode, count }));
          client.read(makeTextDecoder());
        },
        { message: /aborted by peer/ },
      );
      const [failure] = await written;
      t.regex(failure.error, /Encoder byte count/);
    });
  }
}
