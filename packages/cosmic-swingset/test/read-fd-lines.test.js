import '@endo/init/debug.js';
import test from 'ava';
import { Buffer } from 'node:buffer';
import { PassThrough, Readable } from 'node:stream';
import { makePromiseKit } from '@endo/promise-kit';
import { makeReadlineLoop } from '../src/helpers/read-fd-lines.js';

test('buffered lines preserve UTF-8, LF/CRLF, empty lines, and a final partial line', async t => {
  const bytes = Buffer.from('first\r\n\n🦉 café\nlast');
  // Every code point and CRLF boundary can span input chunks.
  const input = Readable.from(Array.from(bytes, byte => Buffer.from([byte])));
  const lines = [];
  await makeReadlineLoop(
    input,
    line => lines.push(line),
    new AbortController().signal,
  );
  t.deepEqual(lines, ['first', '', '🦉 café', 'last']);
  t.true(input.destroyed);
});

test('cancelling an open input completes and destroys the stream', async t => {
  const input = new PassThrough();
  const cancellation = new AbortController();
  const firstLine = makePromiseKit();
  const lines = [];
  const finished = makeReadlineLoop(
    input,
    line => {
      lines.push(line);
      firstLine.resolve(undefined);
    },
    cancellation.signal,
  );
  input.write('first\n');
  await firstLine.promise;
  cancellation.abort();
  await finished;
  t.deepEqual(lines, ['first']);
  t.true(input.destroyed);
});

test('already cancelled input is destroyed without dispatch', async t => {
  const input = Readable.from(['ignored\n']);
  const cancellation = new AbortController();
  cancellation.abort();
  await makeReadlineLoop(
    input,
    () => t.fail('unexpected line'),
    cancellation.signal,
  );
  t.true(input.destroyed);
});

test('input errors reject the loop', async t => {
  const failure = Error('input failed');
  const input = new Readable({
    read() {
      this.destroy(failure);
    },
  });
  await t.throwsAsync(
    makeReadlineLoop(
      input,
      () => t.fail('unexpected line'),
      new AbortController().signal,
    ),
    { is: failure },
  );
  t.true(input.destroyed);
});

test('dispatch failure retains its identity when input teardown races it', async t => {
  const failure = Error('original dispatch failure');
  const input = new PassThrough();
  const cancellation = new AbortController();
  const finished = makeReadlineLoop(
    input,
    () => {
      input.destroy();
      throw failure;
    },
    cancellation.signal,
  );
  const rejected = t.throwsAsync(finished, { is: failure });
  input.end('first\nignored\n');
  await rejected;
  t.false(cancellation.signal.aborted);
  t.true(input.destroyed);
});

test('line input rejects malformed UTF-8 instead of substituting replacement characters', async t => {
  for (const bytes of [
    [0xff, 10],
    [0xe2, 0x82, 10],
    [0xf0, 0x9f, 0x98],
  ]) {
    const input = Readable.from([Buffer.from(bytes)]);
    await t.throwsAsync(
      makeReadlineLoop(
        input,
        () => t.fail('invalid text reached dispatch'),
        new AbortController().signal,
      ),
      { instanceOf: TypeError },
    );
    t.true(input.destroyed);
  }
});

test('dispatch errors reject the loop and stop further lines', async t => {
  const input = Readable.from(['first\nsecond\n']);
  const failure = Error('dispatch failed');
  let calls = 0;
  await t.throwsAsync(
    makeReadlineLoop(
      input,
      () => {
        calls += 1;
        throw failure;
      },
      new AbortController().signal,
    ),
    { is: failure },
  );
  t.is(calls, 1);
  t.true(input.destroyed);
});

for (const size of [0, 1, 64 * 1024, 1024 * 1024]) {
  test(`buffer framing preserves a JSON message with ${size} payload bytes`, async t => {
    const message = { id: size, data: 'x'.repeat(size), unicode: '🦉' };
    const ending = size === 1024 * 1024 ? '' : '\r\n';
    const bytes = Buffer.from(`${JSON.stringify(message)}${ending}`);
    function* chunks() {
      for (let offset = 0; offset < bytes.length; offset += 4093)
        yield bytes.subarray(offset, offset + 4093);
    }
    const input = Readable.from(chunks());
    const messages = [];
    await makeReadlineLoop(
      input,
      line => messages.push(JSON.parse(line)),
      new AbortController().signal,
    );
    t.deepEqual(messages, [message]);
    t.true(input.destroyed);
  });
}

test('buffer framing separates coalesced JSON messages in order', async t => {
  const expected = Array.from({ length: 20 }, (_, id) => ({
    id,
    data: `message-${id}`,
  }));
  const input = Readable.from([
    Buffer.from(
      `${expected.map(message => JSON.stringify(message)).join('\n')}\n`,
    ),
  ]);
  const messages = [];
  await makeReadlineLoop(
    input,
    line => messages.push(JSON.parse(line)),
    new AbortController().signal,
  );
  t.deepEqual(messages, expected);
});
