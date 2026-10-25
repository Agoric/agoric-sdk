import '@endo/init/debug.js';
import test from 'ava';
import { Worker } from 'node:worker_threads';
import { once } from 'node:events';
import {
  makeTextDecoder,
  makeTextEncoder,
  makeTransferClient,
  makeTransferServer,
  makeTransferBuffer,
  assertTransferBufferSize,
  partitionTransferBuffer,
  TRANSFER_HEADER_BYTES,
  MAX_TRANSFER_BUFFER_SIZE,
  TRANSFER_STATE,
} from '../src/helpers/sync-xfer.js';

test('transfer consumes every encoder yield before its final return', async t => {
  const worker = new Worker(
    new URL('fixtures/sync-xfer-worker.js', import.meta.url),
  );
  t.teardown(() => worker.terminate());
  const buffer = new SharedArrayBuffer(16);
  const client = makeTransferClient(buffer);
  const chunks = ['first-', 'second-', 'last'].map(text =>
    new TextEncoder().encode(text),
  );
  const written = once(worker, 'message');
  client.prepareToRead(buf => worker.postMessage({ buf, chunks }));
  t.is(client.read(makeTextDecoder()), 'first-second-last');
  await written;
});

test('text decoder', t => {
  const decoder = makeTextDecoder();
  decoder.next();
  const buf = new TextEncoder().encode('hello world bobob');
  let i = 0;
  while (i < buf.length) {
    const thisTransfer = Math.min(buf.length - i, 3);
    const s = decoder.next(buf.subarray(i, i + thisTransfer));
    t.log('partial decode', s);
    i += thisTransfer;
  }
  // t.log('last decode', decoder.next(buf.subarray(i, buf.length)));
  t.is(decoder.next().value, 'hello world bobob');
});

test('text encoder', t => {
  const bufs = [];
  const encoder = makeTextEncoder('hello world bobob');
  encoder.next();
  const outb = new Uint8Array(3);
  let { value: buf, done } = encoder.next(outb);
  for (;;) {
    if (buf === undefined) {
      // They used our buffer.
      buf = outb;
    }
    let i = 0;
    while (i < buf.length) {
      const thisTransfer = Math.min(buf.length - i, outb.byteLength);
      if (outb !== buf) {
        outb.set(buf.subarray(i, i + thisTransfer));
      }
      i += thisTransfer;
      t.log('partial encode', outb);
      bufs.push(Uint8Array.from(outb.subarray(0, thisTransfer)));
    }

    if (done) {
      break;
    }
    ({ value: buf, done } = encoder.next());
  }

  const full = Uint8Array.from(bufs.flatMap(b => Array.from(b)));
  const s = new TextDecoder().decode(full);
  t.is(s, 'hello world bobob');
});

/** @import { Decoder } from '../src/helpers/sync-xfer.js'; */

const makeWorker = t => {
  const worker = new Worker(
    new URL('fixtures/sync-xfer-worker.js', import.meta.url),
  );
  t.teardown(() => worker.terminate());
  return worker;
};

/** @returns {Decoder<number[]>} */
function* collectBytes() {
  const bytes = [];
  for (;;) {
    const chunk = yield;
    if (chunk === undefined) return bytes;
    bytes.push(...chunk);
  }
}

test('buffer layout and size bounds require representable nonempty fixed payloads', t => {
  for (const size of [
    0,
    -1,
    TRANSFER_HEADER_BYTES,
    9.5,
    NaN,
    Infinity,
    MAX_TRANSFER_BUFFER_SIZE + 1,
  ]) {
    t.throws(() => assertTransferBufferSize(size), {
      message: /Transfer buffer size/,
    });
    t.throws(() => makeTransferBuffer(size), {
      message: /Transfer buffer size/,
    });
  }
  for (const size of [
    TRANSFER_HEADER_BYTES + 1,
    65536,
    MAX_TRANSFER_BUFFER_SIZE,
  ])
    t.notThrows(() => assertTransferBufferSize(size));
  const buffer = makeTransferBuffer(TRANSFER_HEADER_BYTES + 1);
  const { control, payload } = partitionTransferBuffer(buffer);
  t.is(control.length, 2);
  t.is(payload.byteOffset, TRANSFER_HEADER_BYTES);
  t.is(payload.byteLength, 1);
  for (const factory of [makeTransferClient, makeTransferServer]) {
    t.throws(() => factory(new SharedArrayBuffer(8)), {
      message: /Transfer buffer size/,
    });
    t.throws(() => Reflect.apply(factory, undefined, [new ArrayBuffer(16)]), {
      message: /SharedArrayBuffer/,
    });
    const growable = Reflect.construct(SharedArrayBuffer, [
      16,
      { maxByteLength: 32 },
    ]);
    t.throws(() => factory(growable), { message: /fixed size/ });
  }
});

for (const [
  name,
  chunks,
  mode,
] of /** @type {[string, Uint8Array[], string][]} */ ([
  ['empty final result', [new Uint8Array(0)], 'chunks'],
  [
    'empty yields and final chunk',
    [new Uint8Array(0), Uint8Array.of(9), new Uint8Array(0)],
    'chunks',
  ],
  [
    'large yielded and returned chunks',
    [
      Uint8Array.from({ length: 31 }, (_, i) => i),
      Uint8Array.from({ length: 27 }, (_, i) => 200 + i),
    ],
    'chunks',
  ],
  [
    'reusable destination buffer',
    [Uint8Array.of(1, 2, 3), Uint8Array.of(4, 5, 6), Uint8Array.of(7)],
    'in-place',
  ],
])) {
  test(`general byte transfer supports ${name}`, async t => {
    const worker = makeWorker(t);
    const buffer = makeTransferBuffer(11);
    const client = makeTransferClient(buffer);
    const written = once(worker, 'message');
    client.prepareToRead(buf => worker.postMessage({ buf, chunks, mode }));
    t.deepEqual(
      client.read(collectBytes()),
      chunks.flatMap(chunk => Array.from(chunk)),
    );
    t.deepEqual(await written, ['written']);
    const { control } = partitionTransferBuffer(buffer);
    t.is(Atomics.load(control, 0), TRANSFER_STATE.IDLE);
    t.is(Atomics.load(control, 1), 0);
  });
}

test('readiness notifications cannot return stale reply 16518 for request 16519', async t => {
  const worker = makeWorker(t);
  const buffer = makeTransferBuffer(128);
  const gate = new SharedArrayBuffer(4);
  const phase = new Int32Array(gate);
  const client = makeTransferClient(buffer);
  const written = once(worker, 'message');
  client.prepareToRead(buf => {
    worker.postMessage({ buf, gate, mode: 'readiness-notify' });
    while (Atomics.load(phase, 0) === 0) Atomics.wait(phase, 0, 0);
  });
  function* decodeReply() {
    Atomics.store(phase, 0, 2);
    Atomics.notify(phase, 0);
    return yield* makeTextDecoder();
  }
  t.deepEqual(JSON.parse(client.read(decodeReply())), {
    id: 16519,
    result: 'new',
    error: null,
  });
  t.deepEqual(await written, ['written']);
});

test('repeated buffer and endpoint reuse keeps adjacent RPC IDs correlated', async t => {
  const worker = makeWorker(t);
  const client = makeTransferClient(makeTransferBuffer(12));
  const records = [];
  const completed = new Promise(resolve => {
    worker.on('message', record => {
      records.push(record);
      if (records.length === 200) resolve(undefined);
    });
  });
  for (let id = 16518; id < 16718; id += 1) {
    const chunks = [
      new TextEncoder().encode(JSON.stringify({ id, result: `reply-${id}` })),
    ];
    client.prepareToRead(buf =>
      worker.postMessage({ buf, chunks, reuse: true }),
    );
    const response = JSON.parse(client.read(makeTextDecoder()));
    t.is(response.id, id);
    t.is(response.result, `reply-${id}`);
  }
  await completed;
  t.true(records.every(record => record === 'written'));
});

for (const length of [-1, 4, 2 ** 31 - 1]) {
  test(`receiver rejects corrupt data length ${length}`, t => {
    const worker = makeWorker(t);
    const client = makeTransferClient(makeTransferBuffer(11));
    t.throws(
      () => {
        client.prepareToRead(buf =>
          worker.postMessage({ buf, mode: 'bad-length', length }),
        );
        client.read(collectBytes());
      },
      { message: /Invalid transfer data length/ },
    );
  });
}

test('unknown peer states fail instead of decoding stale payload', t => {
  const worker = makeWorker(t);
  const client = makeTransferClient(makeTransferBuffer(11));
  t.throws(
    () => {
      client.prepareToRead(buf =>
        worker.postMessage({ buf, mode: 'bad-state' }),
      );
      client.read(collectBytes());
    },
    { message: /Unexpected transfer state/ },
  );
});

test('entry state checks reject unprepared operations and double preparation', t => {
  t.throws(
    () => makeTransferClient(makeTransferBuffer()).read(collectBytes()),
    { message: /must be prepared/ },
  );
  t.throws(
    () =>
      makeTransferServer(makeTransferBuffer()).write(makeTextEncoder('data')),
    { message: /must be prepared/ },
  );
  t.throws(
    () => makeTransferServer(makeTransferBuffer()).prepareToWrite(() => {}),
    { message: /transfer state/ },
  );
  const client = makeTransferClient(makeTransferBuffer());
  t.throws(() => client.prepareToRead(() => client.prepareToRead(() => {})), {
    message: /already prepared/,
  });
  const buffer = makeTransferBuffer();
  const { control } = partitionTransferBuffer(buffer);
  Atomics.store(control, 0, TRANSFER_STATE.READER_READY);
  const server = makeTransferServer(buffer);
  server.prepareToWrite(() => {});
  t.throws(() => server.prepareToWrite(() => {}), {
    message: /already prepared/,
  });
});

for (const [
  name,
  decoder,
] of /** @type {[string, () => Decoder<unknown>][]} */ ([
  [
    'early completion',
    function* earlyCompletion() {
      yield;
      return 'early';
    },
  ],
  [
    'missing completion',
    function* missingCompletion() {
      for (;;) yield;
    },
  ],
])) {
  test(`invalid decoder ${name} aborts its peer`, async t => {
    const worker = makeWorker(t);
    const client = makeTransferClient(makeTransferBuffer(11));
    const finished = once(worker, 'message');
    const chunks = [Uint8Array.of(1), Uint8Array.of(2)];
    client.prepareToRead(buf => worker.postMessage({ buf, chunks }));
    t.throws(() => client.read(decoder()), { message: /Decoder/ });
    const [failure] = await finished;
    t.regex(failure.error, /aborted by peer/);
  });
}

for (const mode of [
  'bad-encoder-prime',
  'bad-encoder-chunk',
  'bad-encoder-return',
]) {
  test(`invalid ${mode} releases the reader`, async t => {
    const worker = makeWorker(t);
    const client = makeTransferClient(makeTransferBuffer(9));
    const finished = once(worker, 'message');
    t.throws(
      () => {
        client.prepareToRead(buf => worker.postMessage({ buf, mode }));
        client.read(collectBytes());
      },
      { message: /aborted by peer/ },
    );
    const [failure] = await finished;
    t.regex(failure.error, /Encoder/);
  });
}

test('a general decoder can finish on the final data chunk', async t => {
  const worker = makeWorker(t);
  const client = makeTransferClient(makeTransferBuffer(11));
  const finished = once(worker, 'message');
  const chunks = [Uint8Array.of(1, 2, 3)];
  client.prepareToRead(buf => worker.postMessage({ buf, chunks }));
  /** @returns {Decoder<number>} */
  function* finalChunkLength() {
    const bytes = yield;
    return bytes?.byteLength || 0;
  }
  t.is(client.read(finalChunkLength()), 3);
  t.deepEqual(await finished, ['written']);
  t.throws(() => client.read(collectBytes()), { message: /must be prepared/ });
});

test('reentrant decoder use aborts both endpoints', async t => {
  const worker = makeWorker(t);
  const client = makeTransferClient(makeTransferBuffer(11));
  const finished = once(worker, 'message');
  client.prepareToRead(buf =>
    worker.postMessage({ buf, chunks: [Uint8Array.of(1)] }),
  );
  function* recursiveDecoder() {
    client.read(collectBytes());
    yield;
    return undefined;
  }
  t.throws(() => client.read(recursiveDecoder()), {
    message: /already reading/,
  });
  const [failure] = await finished;
  t.regex(failure.error, /aborted by peer/);
});

test('reentrant encoder use aborts both endpoints', async t => {
  const worker = makeWorker(t);
  const client = makeTransferClient(makeTransferBuffer(11));
  const finished = once(worker, 'message');
  t.throws(
    () => {
      client.prepareToRead(buf =>
        worker.postMessage({ buf, mode: 'reentrant-writer' }),
      );
      client.read(collectBytes());
    },
    { message: /aborted by peer/ },
  );
  const [failure] = await finished;
  t.regex(failure.error, /already writing/);
});
