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
